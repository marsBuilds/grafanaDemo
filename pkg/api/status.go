package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/plugins"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/datasources"
)

const statusHealthCheckTimeout = 5 * time.Second

type statusHealthResponse struct {
	Server      statusServerHealth    `json:"server"`
	Datasources []statusDatasourceRow `json:"datasources"`
	Plugins     []statusPluginRow     `json:"plugins"`
}

type statusServerHealth struct {
	Version  string `json:"version"`
	Database string `json:"database"`
}

type statusDatasourceRow struct {
	UID     string         `json:"uid"`
	Name    string         `json:"name"`
	Type    string         `json:"type"`
	Status  string         `json:"status"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

type statusPluginRow struct {
	ID      string         `json:"id"`
	Name    string         `json:"name"`
	Status  string         `json:"status"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

type healthCheckOutcome struct {
	status  string
	message string
	details map[string]any
}

func (hs *HTTPServer) GetStatusHealth(c *contextmodel.ReqContext) response.Response {
	ctx := c.Req.Context()

	resp := statusHealthResponse{
		Server: statusServerHealth{
			Version:  hs.Cfg.BuildVersion,
			Database: "ok",
		},
		Datasources: []statusDatasourceRow{},
		Plugins:     []statusPluginRow{},
	}

	if !hs.databaseHealthy(ctx) {
		resp.Server.Database = "failing"
	}

	dataSources, err := hs.DataSourcesService.GetDataSources(ctx, &datasources.GetDataSourcesQuery{OrgID: c.GetOrgID()})
	if err != nil {
		return response.Error(http.StatusInternalServerError, "Unable to load data sources", err)
	}

	resp.Datasources = hs.getDatasourceStatuses(ctx, c, dataSources)
	resp.Plugins = hs.getBackendPluginStatuses(ctx, c)

	return response.JSON(http.StatusOK, resp)
}

func (hs *HTTPServer) getDatasourceStatuses(ctx context.Context, c *contextmodel.ReqContext, dataSources []*datasources.DataSource) []statusDatasourceRow {
	rows := make([]statusDatasourceRow, len(dataSources))
	var wg sync.WaitGroup

	for i, ds := range dataSources {
		i := i
		ds := ds
		wg.Add(1)
		go func() {
			defer wg.Done()
			rows[i] = statusDatasourceRow{
				UID:  ds.UID,
				Name: ds.Name,
				Type: ds.Type,
			}

			plugin, exists := hs.pluginStore.Plugin(ctx, ds.Type)
			if !exists {
				rows[i].Status = "error"
				rows[i].Message = "Plugin is not installed"
				return
			}

			if !plugin.Backend {
				rows[i].Status = "unknown"
				rows[i].Message = "Health checks are only available for backend data source plugins"
				return
			}

			if err := hs.DataSourceRequestValidator.Validate(ds.URL, ds.JsonData, nil); err != nil {
				rows[i].Status = "error"
				rows[i].Message = err.Error()
				return
			}

			outcome := hs.checkDatasourceHealthForStatus(ctx, c, ds)
			rows[i].Status = outcome.status
			rows[i].Message = outcome.message
			rows[i].Details = outcome.details
		}()
	}

	wg.Wait()
	return rows
}

func (hs *HTTPServer) getBackendPluginStatuses(ctx context.Context, c *contextmodel.ReqContext) []statusPluginRow {
	pluginsList := hs.pluginStore.Plugins(ctx)
	rows := make([]statusPluginRow, 0, len(pluginsList))

	for _, plugin := range pluginsList {
		if !plugin.Backend || plugin.Type == plugins.TypeDataSource {
			continue
		}

		outcome := hs.checkPluginHealthForStatus(ctx, c, plugin.ID, c.GetOrgID())
		rows = append(rows, statusPluginRow{
			ID:      plugin.ID,
			Name:    plugin.Name,
			Status:  outcome.status,
			Message: outcome.message,
			Details: outcome.details,
		})
	}

	return rows
}

func (hs *HTTPServer) checkDatasourceHealthForStatus(ctx context.Context, c *contextmodel.ReqContext, ds *datasources.DataSource) healthCheckOutcome {
	pCtx, err := hs.pluginContextProvider.GetWithDataSource(ctx, ds.Type, c.SignedInUser, ds)
	if err != nil {
		return healthCheckOutcome{status: "error", message: "Unable to build plugin context"}
	}

	return hs.checkPluginHealthWithContext(ctx, pCtx)
}

func (hs *HTTPServer) checkPluginHealthForStatus(ctx context.Context, c *contextmodel.ReqContext, pluginID string, orgID int64) healthCheckOutcome {
	pCtx, err := hs.pluginContextProvider.Get(ctx, pluginID, c.SignedInUser, orgID)
	if err != nil {
		return healthCheckOutcome{status: "error", message: "Unable to build plugin context"}
	}

	return hs.checkPluginHealthWithContext(ctx, pCtx)
}

func (hs *HTTPServer) checkPluginHealthWithContext(ctx context.Context, pCtx backend.PluginContext) healthCheckOutcome {
	checkCtx, cancel := context.WithTimeout(ctx, statusHealthCheckTimeout)
	defer cancel()

	resp, err := hs.pluginClient.CheckHealth(checkCtx, &backend.CheckHealthRequest{
		PluginContext: pCtx,
		Headers:       map[string]string{},
	})
	if err != nil {
		if errors.Is(checkCtx.Err(), context.DeadlineExceeded) || errors.Is(err, context.DeadlineExceeded) {
			return healthCheckOutcome{status: "error", message: fmt.Sprintf("Health check timed out after %s", statusHealthCheckTimeout)}
		}

		return healthCheckOutcome{status: "error", message: err.Error()}
	}

	outcome := healthCheckOutcome{
		status:  statusFromBackendHealth(resp.Status),
		message: resp.Message,
	}

	if len(resp.JSONDetails) > 0 {
		var details map[string]any
		if err := json.Unmarshal(resp.JSONDetails, &details); err == nil {
			outcome.details = details
		}
	}

	if outcome.message == "" {
		outcome.message = defaultHealthMessage(resp.Status)
	}

	return outcome
}

func statusFromBackendHealth(status backend.HealthStatus) string {
	switch status {
	case backend.HealthStatusOk:
		return "ok"
	case backend.HealthStatusUnknown:
		return "unknown"
	default:
		return "error"
	}
}

func defaultHealthMessage(status backend.HealthStatus) string {
	switch status {
	case backend.HealthStatusOk:
		return "Health check succeeded"
	case backend.HealthStatusUnknown:
		return "Health check returned an unknown status"
	default:
		return "Health check failed"
	}
}

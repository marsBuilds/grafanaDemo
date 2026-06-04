package api

import (
	"errors"
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/web"
)

type featureToggleManager interface {
	GetFeatureToggleStates() []featuremgmt.FeatureToggleState
	SetFeatureToggle(name string, enabled bool) (featuremgmt.FeatureToggleState, error)
}

type updateFeatureToggleCommand struct {
	Enabled bool `json:"enabled"`
}

func (hs *HTTPServer) AdminGetFeatureToggles(c *contextmodel.ReqContext) response.Response {
	manager, ok := hs.Features.(featureToggleManager)
	if !ok {
		return response.Error(http.StatusInternalServerError, "Feature toggle manager unavailable", nil)
	}

	return response.JSON(http.StatusOK, manager.GetFeatureToggleStates())
}

func (hs *HTTPServer) AdminUpdateFeatureToggle(c *contextmodel.ReqContext) response.Response {
	manager, ok := hs.Features.(featureToggleManager)
	if !ok {
		return response.Error(http.StatusInternalServerError, "Feature toggle manager unavailable", nil)
	}

	cmd := updateFeatureToggleCommand{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}

	state, err := manager.SetFeatureToggle(web.Params(c.Req)[":name"], cmd.Enabled)
	if err != nil {
		if errors.Is(err, featuremgmt.ErrFeatureToggleNotFound) {
			return response.Error(http.StatusNotFound, "Feature toggle not found", err)
		}
		if errors.Is(err, featuremgmt.ErrFeatureToggleReadOnly) {
			return response.JSON(http.StatusBadRequest, state)
		}
		return response.Error(http.StatusInternalServerError, "Failed to update feature toggle", err)
	}

	return response.JSON(http.StatusOK, state)
}

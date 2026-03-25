package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/infra/localcache"
	pluginfakes "github.com/grafana/grafana/pkg/plugins/manager/pluginfakes"
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/services/datasources"
	datafakes "github.com/grafana/grafana/pkg/services/datasources/fakes"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/services/pluginsintegration/pluginconfig"
	"github.com/grafana/grafana/pkg/services/pluginsintegration/plugincontext"
	"github.com/grafana/grafana/pkg/services/pluginsintegration/pluginsettings"
	"github.com/grafana/grafana/pkg/services/pluginsintegration/pluginstore"
	"github.com/grafana/grafana/pkg/setting"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/web"
)

func TestGetStatusHealth(t *testing.T) {
	cfg := setting.NewCfg()
	cfg.BuildVersion = "11.0.0-test"

	dsService := &datafakes.FakeDataSourceService{
		DataSources: []*datasources.DataSource{
			{ID: 1, OrgID: 1, UID: "grafana", Name: "Grafana", Type: "grafana"},
			{ID: 2, OrgID: 1, UID: "frontend", Name: "Frontend only", Type: "frontend-only"},
		},
	}

	ps := pluginstore.NewFakePluginStore(
		pluginstore.Plugin{
			JSONData: plugins.JSONData{
				ID:      "grafana",
				Name:    "Grafana",
				Type:    plugins.TypeDataSource,
				Backend: true,
			},
		},
		pluginstore.Plugin{
			JSONData: plugins.JSONData{
				ID:      "frontend-only",
				Name:    "Frontend only",
				Type:    plugins.TypeDataSource,
				Backend: false,
			},
		},
		pluginstore.Plugin{
			JSONData: plugins.JSONData{
				ID:      "test-app",
				Name:    "Test app",
				Type:    plugins.TypeApp,
				Backend: true,
			},
		},
	)

	pluginClient := &pluginfakes.FakePluginClient{
		CheckHealthHandlerFunc: func(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
			switch req.PluginContext.PluginID {
			case "grafana":
				return &backend.CheckHealthResult{Status: backend.HealthStatusOk, Message: "Datasource healthy"}, nil
			case "test-app":
				return &backend.CheckHealthResult{Status: backend.HealthStatusError, Message: "Plugin unhealthy"}, nil
			default:
				return &backend.CheckHealthResult{Status: backend.HealthStatusUnknown, Message: "unknown"}, nil
			}
		},
	}

	hs := &HTTPServer{
		Cfg: cfg,
		CacheService: localcache.ProvideService(),
		DataSourcesService: dsService,
		pluginStore: ps,
		pluginClient: pluginClient,
		pluginContextProvider: plugincontext.ProvideService(
			cfg,
			localcache.ProvideService(),
			ps,
			&datafakes.FakeCacheService{DataSources: dsService.DataSources},
			dsService,
			&pluginsettings.FakePluginSettings{Plugins: map[string]*pluginsettings.DTO{
				"test-app": {
					PluginID:      "test-app",
					OrgID:         1,
					Enabled:       true,
					PluginVersion: "1.0.0",
				},
			}},
			pluginconfig.NewFakePluginRequestConfigProvider(),
		),
		DataSourceRequestValidator: &fakeDataSourceRequestValidator{},
	}
	hs.CacheService.Set("db-healthy", true, 0)

	reqCtx := &contextmodel.ReqContext{
		SignedInUser: &user.SignedInUser{
			UserID:  1,
			OrgID:   1,
			OrgRole: org.RoleAdmin,
			Login:   "admin",
		},
		Context: &web.Context{
			Req: httptest.NewRequest(http.MethodGet, "/api/status/health", nil),
		},
		IsSignedIn: true,
	}

	res := hs.GetStatusHealth(reqCtx)
	require.Equal(t, http.StatusOK, res.Status())
	require.JSONEq(t, `{
		"server":{"version":"11.0.0-test","database":"ok"},
		"datasources":[
			{"uid":"grafana","name":"Grafana","type":"grafana","status":"ok","message":"Datasource healthy"},
			{"uid":"frontend","name":"Frontend only","type":"frontend-only","status":"unknown","message":"Health checks are only available for backend data source plugins"}
		],
		"plugins":[
			{"id":"test-app","name":"Test app","status":"error","message":"Plugin unhealthy"}
		]
	}`, string(res.Body()))
}

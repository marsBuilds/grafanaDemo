import { createAssistantContextItem } from '@grafana/assistant';
import { getDataSourceSrv, locationService } from '@grafana/runtime';

export interface AskGrafanaPageContext {
  route: string;
  dashboardUid?: string;
  datasources: Array<{
    uid: string;
    name: string;
    type: string;
  }>;
}

export interface BuildAskGrafanaContextOptions {
  dashboardUid?: string | null;
  pathname?: string;
}

const MAX_DATASOURCE_CONTEXT_ITEMS = 8;

export function getAskGrafanaPageContext(options: BuildAskGrafanaContextOptions = {}): AskGrafanaPageContext {
  const pathname = options.pathname ?? locationService.getLocation().pathname;
  const datasources = listQueryableDatasources();

  return {
    route: pathname,
    dashboardUid: options.dashboardUid || undefined,
    datasources,
  };
}

export function buildAskGrafanaContext(options: BuildAskGrafanaContextOptions = {}) {
  const page = getAskGrafanaPageContext(options);

  const context = [
    createAssistantContextItem('structured', {
      title: 'Grafana page',
      data: page,
    }),
  ];

  for (const datasource of page.datasources.slice(0, MAX_DATASOURCE_CONTEXT_ITEMS)) {
    context.push(
      createAssistantContextItem('datasource', {
        datasourceUid: datasource.uid,
      })
    );
  }

  return context;
}

function listQueryableDatasources(): AskGrafanaPageContext['datasources'] {
  try {
    return getDataSourceSrv()
      .getList()
      .map((datasource) => ({
        uid: datasource.uid,
        name: datasource.name,
        type: datasource.type,
      }));
  } catch {
    return [];
  }
}

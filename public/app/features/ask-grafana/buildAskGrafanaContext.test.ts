import { createAssistantContextItem } from '@grafana/assistant';
import { getDataSourceSrv } from '@grafana/runtime';

import { buildAskGrafanaContext, getAskGrafanaPageContext } from './buildAskGrafanaContext';

jest.mock('@grafana/assistant', () => ({
  createAssistantContextItem: jest.fn((type: string, data: object) => ({ type, ...data })),
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getDataSourceSrv: jest.fn(),
  locationService: {
    getLocation: () => ({ pathname: '/explore' }),
  },
}));

const getDataSourceSrvMock = jest.mocked(getDataSourceSrv);
const createAssistantContextItemMock = jest.mocked(createAssistantContextItem);

describe('buildAskGrafanaContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDataSourceSrvMock.mockReturnValue({
      getList: () => [
        { uid: 'prom', name: 'Prometheus', type: 'prometheus' },
        { uid: 'loki', name: 'Loki', type: 'loki' },
      ],
    } as ReturnType<typeof getDataSourceSrv>);
  });

  it('includes route, dashboard uid, and datasources', () => {
    expect(getAskGrafanaPageContext({ dashboardUid: 'abc', pathname: '/d/abc' })).toEqual({
      route: '/d/abc',
      dashboardUid: 'abc',
      datasources: [
        { uid: 'prom', name: 'Prometheus', type: 'prometheus' },
        { uid: 'loki', name: 'Loki', type: 'loki' },
      ],
    });
  });

  it('builds structured page context plus datasource items', () => {
    const context = buildAskGrafanaContext({ dashboardUid: 'dash-1' });

    expect(createAssistantContextItemMock).toHaveBeenCalledWith('structured', {
      title: 'Grafana page',
      data: expect.objectContaining({
        route: '/explore',
        dashboardUid: 'dash-1',
      }),
    });
    expect(createAssistantContextItemMock).toHaveBeenCalledWith('datasource', { datasourceUid: 'prom' });
    expect(createAssistantContextItemMock).toHaveBeenCalledWith('datasource', { datasourceUid: 'loki' });
    expect(context).toHaveLength(3);
  });

  it('returns an empty datasource list when the datasource service is unavailable', () => {
    getDataSourceSrvMock.mockImplementation(() => {
      throw new Error('not initialized');
    });

    expect(getAskGrafanaPageContext()).toEqual({
      route: '/explore',
      dashboardUid: undefined,
      datasources: [],
    });
  });
});

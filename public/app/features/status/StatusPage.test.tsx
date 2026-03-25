import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProvider } from 'test/helpers/TestProvider';
import { contextSrv } from 'app/core/services/context_srv';

import StatusPage from './StatusPage';

const getMock = jest.fn();

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => ({ get: getMock }),
}));

jest.mock('../../core/services/context_srv', () => ({
  contextSrv: {
    hasRole: jest.fn(),
    user: {
      orgId: 1,
      timezone: 'utc',
      weekStart: 'monday',
    },
  },
}));

const contextSrvMock = jest.mocked(contextSrv);

const firstResponse = {
  server: { version: '11.0.0', database: 'ok' },
  datasources: [{ uid: 'prom', name: 'Prometheus', type: 'prometheus', status: 'ok', message: 'Healthy' }],
  plugins: [{ id: 'plugin-a', name: 'Plugin A', status: 'error', message: 'Plugin failed' }],
};

const renderPage = () => {
  return render(
    <TestProvider>
      <StatusPage />
    </TestProvider>
  );
};

describe('StatusPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    contextSrvMock.hasRole.mockReturnValue(true);
  });

  it('renders status data', async () => {
    getMock.mockResolvedValue(firstResponse);

    renderPage();

    expect(await screen.findByText('Server health')).toBeInTheDocument();
    expect(screen.getByText('Prometheus')).toBeInTheDocument();
    expect(screen.getByText('Plugin A')).toBeInTheDocument();
    expect(screen.getByText('11.0.0')).toBeInTheDocument();
  });

  it('refreshes status data', async () => {
    getMock
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce({
        ...firstResponse,
        datasources: [{ uid: 'tempo', name: 'Tempo', type: 'tempo', status: 'unknown', message: 'No details' }],
      });

    renderPage();

    expect(await screen.findByText('Prometheus')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(await screen.findByText('Tempo')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('renders nothing for non-admin users', () => {
    contextSrvMock.hasRole.mockReturnValue(false);

    const { container } = renderPage();

    expect(container).toBeEmptyDOMElement();
  });
});

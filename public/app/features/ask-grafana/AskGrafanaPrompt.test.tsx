import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AssistantHook, useAssistant } from '@grafana/assistant';
import { config } from '@grafana/runtime';

import { AskGrafanaPrompt } from './AskGrafanaPrompt';

jest.mock('@grafana/assistant', () => ({
  useAssistant: jest.fn(),
  createAssistantContextItem: jest.fn((type: string, data: object) => ({ type, ...data })),
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getDataSourceSrv: jest.fn(() => ({
    getList: () => [{ uid: 'prom', name: 'Prometheus', type: 'prometheus' }],
  })),
  locationService: {
    getLocation: () => ({ pathname: '/' }),
  },
}));

const useAssistantMock = jest.mocked(useAssistant);

describe('AskGrafanaPrompt', () => {
  const mockOpenAssistant = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    config.featureToggles.askGrafanaHome = true;
    useAssistantMock.mockReturnValue({
      isAvailable: true,
      openAssistant: mockOpenAssistant,
    } as unknown as AssistantHook);
  });

  afterEach(() => {
    config.featureToggles.askGrafanaHome = false;
  });

  it('renders nothing when the feature toggle is off', () => {
    config.featureToggles.askGrafanaHome = false;

    const { container } = render(<AskGrafanaPrompt origin="grafana/home" />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('ask-grafana-prompt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ask-grafana-unavailable')).not.toBeInTheDocument();
  });

  it('opens the assistant with structured page context when available', async () => {
    const user = userEvent.setup();
    render(<AskGrafanaPrompt origin="grafana/home" dashboardUid="home-uid" />);

    await user.click(screen.getByRole('button', { name: 'Ask' }));

    expect(mockOpenAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'grafana/home',
        autoSend: false,
        context: expect.arrayContaining([
          expect.objectContaining({
            type: 'structured',
            title: 'Grafana page',
            data: expect.objectContaining({
              route: '/',
              dashboardUid: 'home-uid',
              datasources: [{ uid: 'prom', name: 'Prometheus', type: 'prometheus' }],
            }),
          }),
          expect.objectContaining({
            type: 'datasource',
            datasourceUid: 'prom',
          }),
        ]),
      })
    );
  });

  it('sends a typed prompt and auto-sends it', async () => {
    const user = userEvent.setup();
    render(<AskGrafanaPrompt origin="grafana/home" />);

    await user.type(screen.getByRole('textbox', { name: 'Ask Grafana' }), 'Why is latency high?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    expect(mockOpenAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'grafana/home',
        prompt: 'Why is latency high?',
        autoSend: true,
      })
    );
  });

  it('shows an honest empty state when the assistant plugin is missing', () => {
    useAssistantMock.mockReturnValue({
      isAvailable: false,
      openAssistant: undefined,
    } as unknown as AssistantHook);

    render(<AskGrafanaPrompt origin="grafana/home" />);

    expect(screen.getByTestId('ask-grafana-unavailable')).toBeInTheDocument();
    expect(screen.getByText(/grafana-assistant-app/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse plugins' })).toHaveAttribute('href', '/plugins');
    expect(screen.queryByRole('button', { name: 'Ask' })).not.toBeInTheDocument();
  });

  it('renders a CTA that opens the assistant when available', async () => {
    const user = userEvent.setup();
    render(<AskGrafanaPrompt origin="grafana/explore-empty" variant="cta" />);

    await user.click(screen.getByRole('button', { name: 'Ask Grafana' }));

    expect(mockOpenAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'grafana/explore-empty',
        autoSend: false,
      })
    );
  });

  it('shows a compact honest fallback for the CTA variant when unavailable', () => {
    useAssistantMock.mockReturnValue({
      isAvailable: false,
      openAssistant: undefined,
    } as unknown as AssistantHook);

    render(<AskGrafanaPrompt origin="grafana/dashboard-empty" variant="cta" />);

    expect(screen.getByTestId('ask-grafana-unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask Grafana' })).not.toBeInTheDocument();
  });
});

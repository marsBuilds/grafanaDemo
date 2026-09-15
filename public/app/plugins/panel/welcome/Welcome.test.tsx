import { render, screen } from '@testing-library/react';

import { AssistantHook, useAssistant } from '@grafana/assistant';
import { config } from '@grafana/runtime';

import { WelcomeBanner } from './Welcome';

jest.mock('@grafana/assistant', () => ({
  useAssistant: jest.fn(),
  createAssistantContextItem: jest.fn((type: string, data: object) => ({ type, ...data })),
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getDataSourceSrv: jest.fn(() => ({
    getList: () => [],
  })),
  locationService: {
    getLocation: () => ({ pathname: '/' }),
  },
}));

const useAssistantMock = jest.mocked(useAssistant);

describe('WelcomeBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.featureToggles.askGrafanaHome = true;
    useAssistantMock.mockReturnValue({
      isAvailable: true,
      openAssistant: jest.fn(),
    } as unknown as AssistantHook);
  });

  afterEach(() => {
    config.featureToggles.askGrafanaHome = false;
  });

  it('renders Ask Grafana on Home when the toggle is on and the assistant is available', () => {
    render(<WelcomeBanner />);

    expect(screen.getByRole('heading', { name: 'Welcome to Grafana' })).toBeInTheDocument();
    expect(screen.getByTestId('ask-grafana-prompt')).toBeInTheDocument();
  });

  it('shows an honest fallback on Home when the assistant plugin is missing', () => {
    useAssistantMock.mockReturnValue({
      isAvailable: false,
      openAssistant: undefined,
    } as unknown as AssistantHook);

    render(<WelcomeBanner />);

    expect(screen.getByTestId('ask-grafana-unavailable')).toBeInTheDocument();
    expect(screen.getByText(/grafana-assistant-app/i)).toBeInTheDocument();
  });

  it('hides Ask Grafana when the feature toggle is off', () => {
    config.featureToggles.askGrafanaHome = false;

    render(<WelcomeBanner />);

    expect(screen.getByRole('heading', { name: 'Welcome to Grafana' })).toBeInTheDocument();
    expect(screen.queryByTestId('ask-grafana-prompt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ask-grafana-unavailable')).not.toBeInTheDocument();
  });
});

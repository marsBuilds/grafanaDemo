import { config } from '@grafana/runtime';

import { getSelectableThemes } from './getSelectableThemes';

describe('getSelectableThemes', () => {
  const originalGrafanaconThemes = config.featureToggles.grafanaconThemes;

  afterEach(() => {
    config.featureToggles.grafanaconThemes = originalGrafanaconThemes;
  });

  it('includes orange in account theme choices without experimental GrafanaCON themes enabled', () => {
    config.featureToggles.grafanaconThemes = false;

    expect(getSelectableThemes().map((theme) => theme.id)).toContain('orange');
  });
});

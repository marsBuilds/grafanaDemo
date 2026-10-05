import { config } from '@grafana/runtime';

import { getSelectableThemes } from './getSelectableThemes';

describe('getSelectableThemes', () => {
  const originalToggle = config.featureToggles.grafanaconThemes;

  afterEach(() => {
    config.featureToggles.grafanaconThemes = originalToggle;
  });

  it('includes the neon theme when grafanaconThemes is enabled', () => {
    config.featureToggles.grafanaconThemes = true;

    const neon = getSelectableThemes().find((theme) => theme.id === 'neon');

    expect(neon).toMatchObject({ name: 'Neon', isExtra: true });
    expect(neon?.build()).toMatchObject({ name: 'Neon', isDark: true });
  });

  it('excludes the neon theme when grafanaconThemes is disabled', () => {
    config.featureToggles.grafanaconThemes = false;

    expect(getSelectableThemes().map((theme) => theme.id)).not.toContain('neon');
  });
});

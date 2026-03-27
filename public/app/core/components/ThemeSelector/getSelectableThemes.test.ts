import { config } from '@grafana/runtime';

import { getSelectableThemes } from './getSelectableThemes';

describe('getSelectableThemes', () => {
  const originalFeatureToggles = config.featureToggles;

  afterEach(() => {
    config.featureToggles = originalFeatureToggles;
  });

  it('includes aubergine as an experimental theme when grafanacon themes are enabled', () => {
    config.featureToggles = { ...originalFeatureToggles, grafanaconThemes: true };

    const themes = getSelectableThemes();
    const aubergine = themes.find((theme) => theme.id === 'aubergine');

    expect(aubergine).toMatchObject({
      id: 'aubergine',
      name: 'Aubergine',
      isExtra: true,
    });
  });

  it('does not include aubergine when grafanacon themes are disabled', () => {
    config.featureToggles = { ...originalFeatureToggles, grafanaconThemes: false };

    const themes = getSelectableThemes();

    expect(themes.find((theme) => theme.id === 'aubergine')).toBeUndefined();
  });
});

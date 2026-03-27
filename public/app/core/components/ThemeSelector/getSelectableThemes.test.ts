import { config } from '@grafana/runtime';

import { getSelectableThemes } from './getSelectableThemes';

describe('getSelectableThemes', () => {
  const originalFeatureToggles = config.featureToggles;

  afterEach(() => {
    config.featureToggles = originalFeatureToggles;
  });

  it('includes the orange experimental theme when grafanacon themes are enabled', () => {
    config.featureToggles = { ...originalFeatureToggles, grafanaconThemes: true };

    expect(getSelectableThemes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'mars',
          isExtra: true,
          name: 'Mars',
        }),
      ])
    );
  });

  it('does not include the orange experimental theme when grafanacon themes are disabled', () => {
    config.featureToggles = { ...originalFeatureToggles, grafanaconThemes: false };

    expect(getSelectableThemes().map((theme) => theme.id)).not.toContain('mars');
  });
});

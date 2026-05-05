import { config } from '@grafana/runtime';

import { getSelectableThemes } from './getSelectableThemes';

describe('getSelectableThemes', () => {
  afterEach(() => {
    config.featureToggles.grafanaconThemes = false;
  });

  it('always includes the violetflux purple theme', () => {
    config.featureToggles.grafanaconThemes = false;

    const ids = getSelectableThemes().map((t) => t.id);

    expect(ids).toContain('violetflux');
  });

  it('includes grafanacon experimental themes when the toggle is enabled', () => {
    config.featureToggles.grafanaconThemes = true;

    const ids = getSelectableThemes().map((t) => t.id);

    expect(ids).toContain('violetflux');
    expect(ids).toContain('tron');
    expect(ids).toContain('gloom');
  });
});

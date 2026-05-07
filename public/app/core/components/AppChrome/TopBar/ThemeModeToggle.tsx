import { memo, useCallback } from 'react';

import { IconName } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';
import { reportInteraction } from '@grafana/runtime';
import { ToolbarButton, useTheme2 } from '@grafana/ui';
import { toggleTheme } from 'app/core/services/theme';

export const ThemeModeToggle = memo(function ThemeModeToggle() {
  const theme = useTheme2();
  const isDark = theme.isDark;

  const label = isDark
    ? t('navigation.theme.switch-to-light', 'Switch to light mode')
    : t('navigation.theme.switch-to-dark', 'Switch to dark mode');

  const icon: IconName = isDark ? 'toggle-on' : 'toggle-off';

  const onClick = useCallback(() => {
    reportInteraction('grafana_theme_mode_toggle_clicked', {
      fromMode: isDark ? 'dark' : 'light',
    });
    void toggleTheme(false);
  }, [isDark]);

  return (
    <ToolbarButton
      narrow
      iconOnly
      icon={icon}
      tooltip={label}
      aria-label={label}
      onClick={onClick}
      data-testid={selectors.components.NavToolbar.themeModeToggle}
    />
  );
});

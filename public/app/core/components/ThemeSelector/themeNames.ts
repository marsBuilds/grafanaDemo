import { ThemeRegistryItem } from '@grafana/data';
import { t } from '@grafana/i18n';

export function getTranslatedThemeName(theme: ThemeRegistryItem) {
  switch (theme.id) {
    case 'dark':
      return t('shared.preferences.theme.dark-label', 'Dark');
    case 'light':
      return t('shared.preferences.theme.light-label', 'Light');
    case 'system':
      return t('shared.preferences.theme.system-label', 'System preference');
    case 'mars':
      return t('shared.preferences.theme.orange-label', 'Orange');
    default:
      return theme.name;
  }
}

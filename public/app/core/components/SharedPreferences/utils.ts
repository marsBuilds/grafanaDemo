import { css } from '@emotion/css';

import { PreferencesSpec as UserPreferencesDTO } from '@grafana/api-clients/rtkq/preferences/v1alpha1';
import { SelectableValue, ThemeRegistryItem } from '@grafana/data';
import { LANGUAGES, PSEUDO_LOCALE, t } from '@grafana/i18n';
import { ComboboxOption } from '@grafana/ui';
import { LOCALES } from 'app/core/internationalization/locales';

export interface Props {
  resourceUri: string;
  disabled?: boolean;
  preferenceType: 'org' | 'team' | 'user';
  onConfirm?: () => Promise<boolean>;
}

export type State = UserPreferencesDTO & {
  isLoading: boolean;
  isSubmitting: boolean;
};

export const BLUE_THEME_ID = 'sapphiredusk';

export const compareStrings = (() => {
  let collator: Intl.Collator | undefined;

  return (a: string, b: string) => {
    if (!collator) {
      collator = new Intl.Collator(undefined, { sensitivity: 'base' });
    }
    return collator.compare(a, b);
  };
})();

export const getLanguageOptions = (): ComboboxOption[] => {
  const languageOptions = LANGUAGES.map((v) => ({
    value: v.code,
    label: v.name,
  })).sort((a, b) => {
    if (a.value === PSEUDO_LOCALE) {
      return 1;
    }

    if (b.value === PSEUDO_LOCALE) {
      return -1;
    }

    return compareStrings(a.label, b.label);
  });

  if (process.env.NODE_ENV === 'development') {
    languageOptions.push({
      value: PSEUDO_LOCALE,
      label: 'Pseudo-locale',
    });
  }

  const options = [
    {
      value: '',
      label: t('common.locale.default', 'Default'),
    },
    ...languageOptions,
  ];

  return options;
};

export const getRegionalFormatOptions = (): ComboboxOption[] => {
  const localeOptions = LOCALES.map((v) => ({
    value: v.code,
    label: v.name,
  })).sort((a, b) => {
    return compareStrings(a.label, b.label);
  });

  const options = [
    {
      value: '',
      label: t('common.locale.default', 'Default'),
    },
    ...localeOptions,
  ];
  return options;
};

export const getTranslatedThemeName = (theme: ThemeRegistryItem) => {
  switch (theme.id) {
    case 'dark':
      return t('shared.preferences.theme.dark-label', 'Dark');
    case 'light':
      return t('shared.preferences.theme.light-label', 'Light');
    case BLUE_THEME_ID:
      return t('shared.preferences.theme.blue-label', 'Blue');
    case 'system':
      return t('shared.preferences.theme.system-label', 'System preference');
    default:
      return theme.name;
  }
};

export const getThemeOptions = (themes: ThemeRegistryItem[], includeBlueThemeSwitch = false): ComboboxOption[] => {
  const options: ComboboxOption[] = themes.map((theme) => ({
    value: theme.id,
    label: getTranslatedThemeName(theme),
    group: theme.isExtra ? t('shared-preferences.theme.experimental', 'Experimental') : undefined,
  }));

  if (includeBlueThemeSwitch && !options.some((option) => option.value === BLUE_THEME_ID)) {
    options.push({
      value: BLUE_THEME_ID,
      label: t('shared.preferences.theme.blue-label', 'Blue'),
      group: t('shared-preferences.theme.experimental', 'Experimental'),
    });
  }

  options.unshift({ value: '', label: t('shared-preferences.theme.default-label', 'Default') });

  return options;
};

export const getQuickThemeOptions = (): Array<SelectableValue<string>> => [
  { value: 'light', label: t('shared.preferences.theme.light-label', 'Light') },
  { value: 'dark', label: t('shared.preferences.theme.dark-label', 'Dark') },
  { value: BLUE_THEME_ID, label: t('shared.preferences.theme.blue-label', 'Blue') },
];

export const getStyles = () => {
  return {
    labelText: css({
      marginRight: '6px',
    }),
    themeControls: css({
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }),
    form: css({
      width: '100%',
      maxWidth: '600px',
    }),
  };
};

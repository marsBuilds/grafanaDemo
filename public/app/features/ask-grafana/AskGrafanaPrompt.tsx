import { css } from '@emotion/css';
import { FormEvent, useMemo, useState } from 'react';

import { useAssistant } from '@grafana/assistant';
import { GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { Alert, Button, Icon, Input, Stack, Text, TextLink, useStyles2 } from '@grafana/ui';

import { buildAskGrafanaContext } from './buildAskGrafanaContext';

export type AskGrafanaVariant = 'prompt' | 'cta';

export interface AskGrafanaPromptProps {
  origin: string;
  dashboardUid?: string | null;
  variant?: AskGrafanaVariant;
}

export function isAskGrafanaEnabled() {
  return Boolean(config.featureToggles.askGrafanaHome);
}

export function AskAssistantButton(props: Omit<AskGrafanaPromptProps, 'variant'>) {
  return <AskGrafanaPrompt {...props} variant="cta" />;
}

export function AskGrafanaPrompt({ origin, dashboardUid, variant = 'prompt' }: AskGrafanaPromptProps) {
  const styles = useStyles2(getStyles);
  const { isAvailable, openAssistant } = useAssistant();
  const [prompt, setPrompt] = useState('');
  const context = useMemo(() => buildAskGrafanaContext({ dashboardUid }), [dashboardUid]);

  if (!isAskGrafanaEnabled()) {
    return null;
  }

  const defaultPrompt = t(
    'ask-grafana.prompt.default',
    'Help me get started with Grafana. What can I learn from my current data sources?'
  );

  const openWithPrompt = (userPrompt: string) => {
    if (!openAssistant) {
      return;
    }

    const trimmed = userPrompt.trim();
    openAssistant({
      origin,
      prompt: trimmed || defaultPrompt,
      context,
      autoSend: Boolean(trimmed),
    });
  };

  if (!isAvailable || !openAssistant) {
    return <AskGrafanaUnavailable variant={variant} />;
  }

  if (variant === 'cta') {
    return (
      <div className={styles.cta} data-testid="ask-grafana-cta">
        <Button icon="ai" variant="secondary" onClick={() => openWithPrompt('')}>
          {t('ask-grafana.cta.label', 'Ask Grafana')}
        </Button>
      </div>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    openWithPrompt(prompt);
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} data-testid="ask-grafana-prompt">
      <Stack direction="column" gap={1}>
        <Text variant="bodySmall" color="secondary">
          <Trans i18nKey="ask-grafana.prompt.intro">Ask Grafana about your data, dashboards, or what to do next.</Trans>
        </Text>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems="flex-start">
          <Input
            prefix={<Icon name="ai" />}
            value={prompt}
            onChange={(event) => setPrompt(event.currentTarget.value)}
            placeholder={t('ask-grafana.prompt.placeholder', 'Ask Grafana about your data…')}
            aria-label={t('ask-grafana.prompt.aria-label', 'Ask Grafana')}
          />
          <Button type="submit" icon="ai">
            {t('ask-grafana.prompt.submit', 'Ask')}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

function AskGrafanaUnavailable({ variant }: { variant: AskGrafanaVariant }) {
  const styles = useStyles2(getStyles);
  const pluginName = 'grafana-assistant-app';

  if (variant === 'cta') {
    return (
      <Text color="secondary" variant="bodySmall" element="p" data-testid="ask-grafana-unavailable">
        <Trans i18nKey="ask-grafana.unavailable.cta">
          Ask Grafana needs the Grafana Assistant plugin ({pluginName}).
        </Trans>{' '}
        <TextLink href="/plugins">{t('ask-grafana.unavailable.browse-plugins', 'Browse plugins')}</TextLink>
      </Text>
    );
  }

  return (
    <div data-testid="ask-grafana-unavailable">
      <Alert severity="info" title={t('ask-grafana.unavailable.title', 'Ask Grafana')} className={styles.unavailable}>
        <Trans i18nKey="ask-grafana.unavailable.body">
          Grafana Assistant is not installed. Install the grafana-assistant-app plugin to ask questions about your
          dashboards and data.
        </Trans>{' '}
        <TextLink href="/plugins">{t('ask-grafana.unavailable.browse-plugins', 'Browse plugins')}</TextLink>
      </Alert>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  form: css({
    width: '100%',
    maxWidth: theme.breakpoints.values.md,
  }),
  cta: css({
    display: 'flex',
    justifyContent: 'center',
  }),
  unavailable: css({
    marginBottom: 0,
    maxWidth: 720,
  }),
});

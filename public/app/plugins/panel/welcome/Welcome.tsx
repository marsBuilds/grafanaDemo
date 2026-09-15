import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { Trans } from '@grafana/i18n';
import { TextLink, useStyles2 } from '@grafana/ui';
import { AskGrafanaPrompt } from 'app/features/ask-grafana/AskGrafanaPrompt';

const helpOptions = [
  { value: 0, label: 'Documentation', href: 'https://grafana.com/docs/grafana/latest' },
  { value: 1, label: 'Tutorials', href: 'https://grafana.com/tutorials' },
  { value: 2, label: 'Community', href: 'https://community.grafana.com' },
  { value: 3, label: 'Public Slack', href: 'http://slack.grafana.com' },
];

export const WelcomeBanner = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Trans i18nKey="welcome.welcome-banner.welcome-to-grafana">Welcome to Grafana</Trans>
        </h1>
        <div className={styles.help}>
          <h2 className={styles.helpText}>
            <Trans i18nKey="welcome.welcome-banner.need-help">Need help?</Trans>
          </h2>
          <div className={styles.helpLinks}>
            {helpOptions.map((option, index) => (
              <TextLink
                key={`${option.label}-${index}`}
                href={`${option.href}?utm_source=grafana_gettingstarted`}
                external
                inline={false}
              >
                {option.label}
              </TextLink>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.prompt}>
        <AskGrafanaPrompt origin="grafana/home" />
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      backgroundSize: 'cover',
      height: '100%',
      justifyContent: 'center',
      gap: theme.spacing(1.5),
      padding: theme.spacing(1, 3),

      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1),
      },
    }),
    header: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(2),

      [theme.breakpoints.down('lg')]: {
        flexDirection: 'column',
        alignItems: 'flex-start',
      },
    }),
    title: css({
      marginBottom: 0,

      [theme.breakpoints.down('md')]: {
        fontSize: theme.typography.h2.fontSize,
      },
      [theme.breakpoints.down('sm')]: {
        fontSize: theme.typography.h3.fontSize,
      },
    }),
    help: css({
      display: 'flex',
      alignItems: 'baseline',
    }),
    helpText: css({
      ...theme.typography.h3,
      marginRight: theme.spacing(2),
      marginBottom: 0,

      [theme.breakpoints.down('md')]: {
        fontSize: theme.typography.h4.fontSize,
      },
      [theme.breakpoints.down('sm')]: {
        display: 'none',
      },
    }),
    helpLinks: css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(2),
      textWrap: 'nowrap',

      [theme.breakpoints.down('sm')]: {
        gap: theme.spacing(1),
      },
    }),
    prompt: css({
      width: '100%',
    }),
  };
};

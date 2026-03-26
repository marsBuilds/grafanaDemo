import { css } from '@emotion/css';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DataSourceSettings, GrafanaTheme2, TestDataSourceResponse } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { Button, Card, EmptyState, LinkButton, Spinner, Stack, Text, Badge, useStyles2 } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { checkDataSourceHealth } from 'app/features/datasources/api';
import { DataSourceAddButton } from 'app/features/datasources/components/DataSourceAddButton';
import { useLoadDataSources } from 'app/features/datasources/state/hooks';
import { getDataSources } from 'app/features/datasources/state/selectors';
import { StoreState, useSelector } from 'app/types/store';

import { ROUTES } from '../constants';

type StatusState = {
  isLoading: boolean;
  response?: TestDataSourceResponse;
};

type StatusMap = Record<string, StatusState>;

const INITIAL_STATUS: StatusState = { isLoading: true };

function getStatusBadgeColor(status: string) {
  switch (status.toLowerCase()) {
    case 'success':
    case 'ok':
      return 'green' as const;
    case 'warning':
      return 'orange' as const;
    default:
      return 'red' as const;
  }
}

function DataSourceStatusCard({
  dataSource,
  status,
}: {
  dataSource: DataSourceSettings;
  status?: StatusState;
}) {
  const styles = useStyles2(getStyles);
  const href = ROUTES.DataSourcesEdit.replace(':uid', dataSource.uid);
  const message = status?.response?.message ?? t('connections.data-sources-status.card.pending', 'Checking connection');
  const badgeText = status?.isLoading
    ? t('connections.data-sources-status.badge.checking', 'Checking')
    : status?.response?.status ?? t('connections.data-sources-status.badge.unavailable', 'Unavailable');

  return (
    <Card noMargin href={href}>
      <Card.Heading>{dataSource.name}</Card.Heading>
      <Card.Figure>
        <img src={dataSource.typeLogoUrl} alt="" height="40" width="40" className={styles.logo} />
      </Card.Figure>
      <Card.Meta>
        {[
          dataSource.typeName,
          dataSource.url,
          dataSource.isDefault && (
            <Badge
              key={`${dataSource.uid}-default`}
              color="blue"
              text={t('connections.data-sources-status.card.default', 'Default')}
            />
          ),
        ]}
      </Card.Meta>
      <Card.Description>
        <Stack direction="row" gap={1} alignItems="center">
          {status?.isLoading ? (
            <Spinner inline />
          ) : (
            <Badge text={badgeText} color={getStatusBadgeColor(badgeText)} />
          )}
          <Text color="secondary">{message}</Text>
        </Stack>
      </Card.Description>
    </Card>
  );
}

export function DataSourcesStatusPage() {
  const styles = useStyles2(getStyles);
  const { isLoading } = useLoadDataSources();
  const dataSources = useSelector((state: StoreState) => getDataSources(state.dataSources));
  const [statuses, setStatuses] = useState<StatusMap>({});

  const runChecks = useCallback(async (sources: DataSourceSettings[]) => {
    if (sources.length === 0) {
      setStatuses({});
      return;
    }

    setStatuses(
      Object.fromEntries(
        sources.map((dataSource) => [
          dataSource.uid,
          {
            ...INITIAL_STATUS,
          },
        ])
      )
    );

    const results = await Promise.all(
      sources.map(async (dataSource) => {
        const response = await checkDataSourceHealth(dataSource.uid);
        return [dataSource.uid, { isLoading: false, response }] as const;
      })
    );

    setStatuses(Object.fromEntries(results));
  }, []);

  useEffect(() => {
    if (!isLoading) {
      void runChecks(dataSources);
    }
  }, [dataSources, isLoading, runChecks]);

  const summary = useMemo(() => {
    return Object.values(statuses).reduce(
      (acc, current) => {
        if (current.isLoading) {
          acc.checking += 1;
          return acc;
        }

        const status = current.response?.status?.toLowerCase();
        if (status === 'success' || status === 'ok') {
          acc.healthy += 1;
        } else if (status === 'warning') {
          acc.warning += 1;
        } else {
          acc.error += 1;
        }

        return acc;
      },
      { healthy: 0, warning: 0, error: 0, checking: 0 }
    );
  }, [statuses]);

  const hasDataSources = dataSources.length > 0;

  return (
    <Page
      navId="connections-datasources-status"
      pageNav={{
        text: t('connections.data-sources-status.title', 'Data source status'),
        subTitle: t(
          'connections.data-sources-status.subtitle',
          'Run live health checks across your connected data sources.'
        ),
      }}
      actions={
        <Stack direction="row" gap={1}>
          <Button
            icon="sync"
            variant="secondary"
            fill="outline"
            onClick={() => void runChecks(dataSources)}
            disabled={isLoading || !hasDataSources}
          >
            <Trans i18nKey="connections.data-sources-status.refresh">Refresh checks</Trans>
          </Button>
          <DataSourceAddButton />
        </Stack>
      }
    >
      <Page.Contents isLoading={isLoading}>
        {!hasDataSources && !isLoading ? (
          <EmptyState
            variant="call-to-action"
            button={
              <LinkButton href={ROUTES.DataSourcesNew} icon="database" size="lg">
                <Trans i18nKey="connections.data-sources-status.empty.button">Add data source</Trans>
              </LinkButton>
            }
            message={t('connections.data-sources-status.empty.title', 'No connected data sources')}
          >
            <Trans i18nKey="connections.data-sources-status.empty.body">
              Add a data source to start monitoring connection health from this status page.
            </Trans>
          </EmptyState>
        ) : (
          <Stack direction="column" gap={2}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <Text variant="bodySmall" color="secondary">
                  <Trans i18nKey="connections.data-sources-status.summary.total">Total</Trans>
                </Text>
                <Text variant="h3">{dataSources.length}</Text>
              </div>
              <div className={styles.summaryCard}>
                <Text variant="bodySmall" color="secondary">
                  <Trans i18nKey="connections.data-sources-status.summary.healthy">Healthy</Trans>
                </Text>
                <Text variant="h3">{summary.healthy}</Text>
              </div>
              <div className={styles.summaryCard}>
                <Text variant="bodySmall" color="secondary">
                  <Trans i18nKey="connections.data-sources-status.summary.warning">Warnings</Trans>
                </Text>
                <Text variant="h3">{summary.warning}</Text>
              </div>
              <div className={styles.summaryCard}>
                <Text variant="bodySmall" color="secondary">
                  <Trans i18nKey="connections.data-sources-status.summary.error">Errors</Trans>
                </Text>
                <Text variant="h3">{summary.error}</Text>
              </div>
            </div>

            <ul className={styles.list}>
              {dataSources.map((dataSource) => (
                <li key={dataSource.uid}>
                  <DataSourceStatusCard dataSource={dataSource} status={statuses[dataSource.uid]} />
                </li>
              ))}
            </ul>
          </Stack>
        )}
      </Page.Contents>
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    logo: css({
      objectFit: 'contain',
    }),
    list: css({
      listStyle: 'none',
      display: 'grid',
      gap: theme.spacing(1),
      padding: 0,
      margin: 0,
    }),
    summaryGrid: css({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: theme.spacing(1),
    }),
    summaryCard: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(2),
      background: theme.colors.background.secondary,
    }),
  };
};

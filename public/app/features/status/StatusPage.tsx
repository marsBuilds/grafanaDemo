import { css } from '@emotion/css';
import { useEffect, useMemo } from 'react';
import { useAsyncFn } from 'react-use';

import { GrafanaTheme2 } from '@grafana/data';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  InteractiveTable,
  LoadingPlaceholder,
  Stack,
  Text,
  type Column,
  useStyles2,
} from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { useNavModel } from 'app/core/hooks/useNavModel';
import { contextSrv } from 'app/core/services/context_srv';

import { getStatusHealth, type DatasourceHealth, type PluginHealth, type StatusItemHealth } from './api';

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === 'ok') {
    return <Badge text="OK" color="green" icon="check" />;
  }

  if (normalized === 'unknown') {
    return <Badge text="UNKNOWN" color="orange" />;
  }

  return <Badge text={status.toUpperCase()} color="red" icon="exclamation-triangle" />;
}

function getBaseStatusColumns<T extends StatusItemHealth & { type?: string }>() : Array<Column<T>> {
  return [
    {
      id: 'name',
      header: 'Name',
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => row.original.type ?? 'app',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status),
      disableGrow: true,
    },
    {
      id: 'message',
      header: 'Message',
      cell: ({ row }) => row.original.message || 'No details',
    },
  ];
}

function getDatasourceColumns(): Array<Column<DatasourceHealth>> {
  return [
    {
      id: 'name',
      header: 'Name',
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => row.original.type,
    },
    ...getBaseStatusColumns<DatasourceHealth>().filter((column) => column.id !== 'name' && column.id !== 'type'),
  ];
}

function getPluginColumns(): Array<Column<PluginHealth>> {
  return getBaseStatusColumns<PluginHealth>().map((column) => {
    if (column.id === 'name') {
      return { ...column, header: 'Plugin' };
    }

    return column;
  });
}

export default function StatusPage() {
  if (!contextSrv.hasRole('Admin')) {
    return null;
  }

  const styles = useStyles2(getStyles);
  const navModel = useNavModel('status');
  const [state, fetchStatus] = useAsyncFn(async () => await getStatusHealth(), []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const data = state.value;
  const datasourceColumns = useMemo(() => getDatasourceColumns(), []);
  const pluginColumns = useMemo(() => getPluginColumns(), []);

  return (
    <Page
      navModel={navModel}
      subTitle="Health and status of your Grafana instance"
      actions={
        <Button icon="sync" variant="secondary" onClick={() => fetchStatus()} disabled={state.loading}>
          Refresh
        </Button>
      }
    >
      <Page.Contents>
        {state.loading && !data && <LoadingPlaceholder text="Loading status..." />}

        {state.error && !data && (
          <Alert severity="error" title="Failed to load status">
            Unable to fetch the current Grafana health status. Please try again.
          </Alert>
        )}

        {data && (
          <Stack direction="column" gap={2}>
            {state.error && (
              <Alert severity="error" title="Latest refresh failed">
                Showing the last successful status payload.
              </Alert>
            )}

            <div className={styles.grid}>
              <Card noMargin className={styles.card}>
                <Card.Heading>Server health</Card.Heading>
                <Card.Description>
                  <Stack direction="column" gap={2}>
                    <Box>
                      <Text color="secondary">Database</Text>
                      <div>{getStatusBadge(data.server.database)}</div>
                    </Box>
                    <Box>
                      <Text color="secondary">Grafana version</Text>
                      <Text>{data.server.version}</Text>
                    </Box>
                  </Stack>
                </Card.Description>
              </Card>

              <Card noMargin className={styles.card}>
                <Card.Heading>Data sources</Card.Heading>
                <Card.Description>
                  <InteractiveTable
                    columns={datasourceColumns}
                    data={data.datasources}
                    getRowId={(row) => row.uid ?? `${row.name}-${row.type}`}
                  />
                </Card.Description>
              </Card>

              <Card noMargin className={styles.card}>
                <Card.Heading>Backend plugins</Card.Heading>
                <Card.Description>
                  <InteractiveTable columns={pluginColumns} data={data.plugins} getRowId={(row) => row.id ?? row.name} />
                </Card.Description>
              </Card>
            </div>
          </Stack>
        )}
      </Page.Contents>
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    grid: css({
      display: 'grid',
      gap: theme.spacing(2),
      gridTemplateColumns: '1fr',
    }),
    card: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
    }),
  };
};

import { css } from '@emotion/css';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { config, getBackendSrv, isFetchError } from '@grafana/runtime';
import { Alert, EmptyState, FilterInput, Stack, Switch, Text, useStyles2 } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { useAppNotification } from 'app/core/copy/appNotification';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

interface FeatureToggleState {
  name: string;
  description: string;
  stage: string;
  enabled: boolean;
  defaultEnabled: boolean;
  requiresRestart: boolean;
  requiresDevMode: boolean;
  frontend: boolean;
  writable: boolean;
  source: string;
  warning?: string;
}

const getFeatureToggles = () => getBackendSrv().get<FeatureToggleState[]>('/api/admin/feature-toggles');

const updateFeatureToggle = (name: string, enabled: boolean) =>
  getBackendSrv().put<FeatureToggleState>(`/api/admin/feature-toggles/${encodeURIComponent(name)}`, { enabled });

export default function FeatureTogglesPage() {
  const styles = useStyles2(getStyles);
  const notifyApp = useAppNotification();
  const canWrite = contextSrv.hasPermission(AccessControlAction.FeatureManagementWrite);
  const [query, setQuery] = useState('');
  const [toggles, setToggles] = useState<FeatureToggleState[]>([]);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  const [{ loading, error }, fetchToggles] = useAsyncFn(async () => {
    const result = await getFeatureToggles();
    setToggles(result);
    return result;
  }, []);

  useEffect(() => {
    fetchToggles();
  }, [fetchToggles]);

  const filteredToggles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return toggles;
    }

    return toggles.filter((toggle) => {
      return [toggle.name, toggle.description, toggle.stage, toggle.source].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, toggles]);

  const onToggleChange = async (toggle: FeatureToggleState, event: FormEvent<HTMLInputElement>) => {
    const enabled = event.currentTarget.checked;
    setUpdating((current) => ({ ...current, [toggle.name]: true }));

    try {
      const updated = await updateFeatureToggle(toggle.name, enabled);
      setToggles((current) => current.map((item) => (item.name === updated.name ? updated : item)));
      Object.assign(config.featureToggles, { [updated.name]: updated.enabled });
      notifyApp.success(
        t('admin.feature-toggles.update-success-title', 'Feature flag updated'),
        updated.enabled
          ? t('admin.feature-toggles.update-success-enabled', '{{name}} is now on.', { name: updated.name })
          : t('admin.feature-toggles.update-success-disabled', '{{name}} is now off.', { name: updated.name })
      );
    } catch (err) {
      notifyApp.error(
        t('admin.feature-toggles.update-error-title', 'Failed to update feature flag'),
        getErrorMessage(err)
      );
    } finally {
      setUpdating((current) => ({ ...current, [toggle.name]: false }));
    }
  };

  return (
    <Page navId="feature-toggles">
      <Page.Contents isLoading={loading && toggles.length === 0}>
        <Stack direction="column" gap={2}>
          <Alert severity="info" title={t('admin.feature-toggles.notice-title', 'Runtime overrides')}>
            <Trans i18nKey="admin.feature-toggles.notice">
              Changes apply immediately to runtime feature flag checks and are reset when Grafana restarts. Flags marked
              as requiring restart may need a restart before every code path uses the new value.
            </Trans>
          </Alert>

          {error && (
            <Alert severity="error" title={t('admin.feature-toggles.load-error-title', 'Failed to load feature flags')}>
              {getErrorMessage(error)}
            </Alert>
          )}

          <FilterInput
            value={query}
            onChange={setQuery}
            escapeRegex={false}
            placeholder={t('admin.feature-toggles.search-placeholder', 'Search feature flags')}
            className={styles.search}
          />

          {!loading && filteredToggles.length === 0 ? (
            <EmptyState
              message={t('admin.feature-toggles.empty-state', 'No feature flags found')}
              variant="not-found"
            />
          ) : (
            <div className={styles.tableWrapper}>
              <table className="filter-table form-inline" data-testid="feature-toggles-table">
                <thead>
                  <tr>
                    <th>
                      <Trans i18nKey="admin.feature-toggles.enabled-column">Enabled</Trans>
                    </th>
                    <th>
                      <Trans i18nKey="admin.feature-toggles.name-column">Feature flag</Trans>
                    </th>
                    <th>
                      <Trans i18nKey="admin.feature-toggles.stage-column">Stage</Trans>
                    </th>
                    <th>
                      <Trans i18nKey="admin.feature-toggles.source-column">Source</Trans>
                    </th>
                    <th>
                      <Trans i18nKey="admin.feature-toggles.details-column">Details</Trans>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredToggles.map((toggle) => (
                    <tr key={toggle.name}>
                      <td>
                        <Switch
                          id={`feature-toggle-${toggle.name}`}
                          value={toggle.enabled}
                          disabled={!canWrite || !toggle.writable || updating[toggle.name]}
                          onChange={(event) => onToggleChange(toggle, event)}
                        />
                      </td>
                      <td>
                        <Text weight="bold">{toggle.name}</Text>
                        {toggle.description && <div className={styles.description}>{toggle.description}</div>}
                      </td>
                      <td>{toggle.stage || t('admin.feature-toggles.unknown-stage', 'unknown')}</td>
                      <td>{getSourceLabel(toggle)}</td>
                      <td>
                        <Stack gap={1} wrap>
                          {toggle.frontend && (
                            <span className={styles.detail}>
                              {t('admin.feature-toggles.frontend-detail', 'Frontend')}
                            </span>
                          )}
                          {toggle.defaultEnabled && (
                            <span className={styles.detail}>
                              {t('admin.feature-toggles.default-on-detail', 'Default on')}
                            </span>
                          )}
                          {toggle.requiresRestart && (
                            <span className={styles.warning}>
                              {t('admin.feature-toggles.restart-required-detail', 'Restart may be required')}
                            </span>
                          )}
                          {toggle.requiresDevMode && (
                            <span className={styles.warning}>
                              {t('admin.feature-toggles.requires-dev-mode-detail', 'Requires dev mode')}
                            </span>
                          )}
                          {toggle.warning && <span className={styles.warning}>{toggle.warning}</span>}
                          {!canWrite && (
                            <span className={styles.warning}>
                              {t('admin.feature-toggles.missing-write-permission-detail', 'Missing write permission')}
                            </span>
                          )}
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Stack>
      </Page.Contents>
    </Page>
  );
}

function getSourceLabel(toggle: FeatureToggleState): string {
  if (toggle.source === 'runtime') {
    return t('admin.feature-toggles.source-runtime', 'Runtime override');
  }
  if (toggle.source === 'configuration') {
    return t('admin.feature-toggles.source-configuration', 'Configuration');
  }
  return t('admin.feature-toggles.source-default', 'Default');
}

function getErrorMessage(error: unknown): string {
  if (isFetchError(error)) {
    return error.data?.message ?? error.statusText ?? t('admin.feature-toggles.error-fallback', 'Unexpected error');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return t('admin.feature-toggles.error-fallback', 'Unexpected error');
}

const getStyles = (theme: GrafanaTheme2) => ({
  search: css({
    maxWidth: theme.spacing(48),
  }),
  tableWrapper: css({
    overflowX: 'auto',
  }),
  description: css({
    color: theme.colors.text.secondary,
    marginTop: theme.spacing(0.5),
  }),
  detail: css({
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.shape.radius.default,
    color: theme.colors.text.secondary,
    padding: theme.spacing(0.25, 0.75),
  }),
  warning: css({
    border: `1px solid ${theme.colors.warning.border}`,
    borderRadius: theme.shape.radius.default,
    color: theme.colors.warning.text,
    padding: theme.spacing(0.25, 0.75),
  }),
});

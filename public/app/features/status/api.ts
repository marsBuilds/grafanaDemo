import { getBackendSrv } from '@grafana/runtime';

export interface StatusItemHealth {
  name: string;
  status: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ServerHealth {
  version: string;
  status: string;
  database: string;
}

export interface DatasourceHealth extends StatusItemHealth {
  uid: string;
  type: string;
}

export interface PluginHealth extends StatusItemHealth {
  id: string;
}

export interface StatusHealthResponse {
  server: ServerHealth;
  datasources: DatasourceHealth[];
  plugins: PluginHealth[];
}

export function getStatusHealth() {
  return getBackendSrv().get<StatusHealthResponse>('/api/status/health');
}

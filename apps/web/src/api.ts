import type { Alarm, AlarmInput, AgentId, AgentStatus, Dashboard } from '@life/shared';

export class AuthError extends Error {}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  if (res.status === 401) throw new AuthError('Ikke innlogget');
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? `Feil ${res.status}`);
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });

export const api = {
  login: (token: string) => req<{ ok: true }>('/session', json('POST', { token })),
  logout: () => req<{ ok: true }>('/session', { method: 'DELETE' }),
  dashboard: (refresh = false) => req<Dashboard>(`/dashboard${refresh ? '?refresh=1' : ''}`),
  runAgent: (id: AgentId) => req<AgentStatus>(`/agents/${id}/run`, json('POST')),
  createAlarm: (a: AlarmInput) => req<Alarm>('/alarms', json('POST', a)),
  updateAlarm: (id: string, a: AlarmInput) => req<Alarm>(`/alarms/${encodeURIComponent(id)}`, json('PUT', a)),
  deleteAlarm: (id: string) => req<void>(`/alarms/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

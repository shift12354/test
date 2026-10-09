import type { Alarm, AlarmInput, AgentId, AgentStatus, Dashboard } from '@life/shared';
import type { Settings } from './storage';

export class AuthError extends Error {}

export function createApi(s: Settings) {
  async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${s.url}/api/v1${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${s.token}`, ...init.headers },
    });
    if (res.status === 401) throw new AuthError('Feil tilgangsnøkkel');
    if (res.status === 204) return undefined as T;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error?.message ?? `Feil ${res.status}`);
    return body as T;
  }
  const json = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });
  return {
    dashboard: (refresh = false) => req<Dashboard>(`/dashboard${refresh ? '?refresh=1' : ''}`),
    runAgent: (id: AgentId) => req<AgentStatus>(`/agents/${id}/run`, json('POST')),
    createAlarm: (a: AlarmInput) => req<Alarm>('/alarms', json('POST', a)),
    updateAlarm: (id: string, a: AlarmInput) => req<Alarm>(`/alarms/${encodeURIComponent(id)}`, json('PUT', a)),
    deleteAlarm: (id: string) => req<void>(`/alarms/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    registerPush: (token: string) => req<{ ok: true }>('/push/register', json('POST', { token })),
  };
}

export type Api = ReturnType<typeof createApi>;

/** Feil fra en ekstern tjeneste. Meldingen inneholder aldri tokens eller svarinnhold. */
export class UpstreamError extends Error {
  constructor(
    public readonly service: string,
    public readonly status: number,
  ) {
    super(`${service} svarte med ${status}`);
  }
}

export async function fetchJson<T = unknown>(
  service: string,
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new UpstreamError(service, res.status);
  return (await res.json()) as T;
}

export async function fetchText(
  service: string,
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<string> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new UpstreamError(service, res.status);
  const text = await res.text();
  if (text.length > 2_000_000) throw new UpstreamError(service, 413);
  return text;
}

/** Bytter en refresh-token mot en access-token og cacher den til den nesten er utløpt. */
export function oauthRefresher(service: string, tokenUrl: string, params: () => Record<string, string>) {
  let cached: { token: string; exp: number } | null = null;
  let rotatedRefresh: string | null = null;
  return async (): Promise<string> => {
    if (cached && cached.exp > Date.now() + 60_000) return cached.token;
    const p = params();
    if (rotatedRefresh) p.refresh_token = rotatedRefresh;
    const body = new URLSearchParams({ ...p, grant_type: 'refresh_token' });
    const json = await fetchJson<{ access_token: string; expires_in: number; refresh_token?: string }>(
      service,
      tokenUrl,
      { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } },
    );
    // Microsoft roterer refresh-tokens. Vi holder den nye i minnet.
    if (json.refresh_token) rotatedRefresh = json.refresh_token;
    cached = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
    return cached.token;
  };
}

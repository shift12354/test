import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '../../..');

// Leser .env fra rot av repoet hvis den finnes (Node ≥ 20.12).
const envFile = path.join(repoRoot, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const env = process.env;

/**
 * Hvilke proxyer vi stoler på for X-Forwarded-For (påvirker req.ip og dermed rate limit).
 * Standard i produksjon er kun loopback (reverse proxy på samme maskin). `true` betyr at alle
 * kan forfalske IP-en sin, så det brukes bare hvis du eksplisitt skriver TRUST_PROXY=true.
 */
function parseTrustProxy(v: string | undefined, isProd: boolean): boolean | string {
  if (v === undefined || v.trim() === '') return isProd ? 'loopback' : false;
  if (v === 'false') return false;
  if (v === 'true') return true;
  return v.trim();
}

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(overrides: Record<string, string | undefined> = {}) {
  const e = { ...env, ...overrides };
  const isProd = e.NODE_ENV === 'production';
  return {
    isProd,
    port: Number(e.PORT ?? 8787),
    host: e.HOST ?? '127.0.0.1',
    trustProxy: parseTrustProxy(e.TRUST_PROXY, isProd),
    token: e.DASHBOARD_TOKEN ?? '',
    corsOrigins: list(e.CORS_ORIGINS ?? 'http://localhost:5173'),
    tz: e.TZ_NAME ?? 'Europe/Oslo',
    ownerName: e.OWNER_NAME ?? '',
    dataDir: e.DATA_DIR ?? path.join(repoRoot, 'apps/api/data'),
    demoData: e.DEMO_DATA !== 'false',
    vipSenders: list(e.VIP_SENDERS).map((s) => s.toLowerCase()),
    myHandles: list(e.MY_HANDLES).map((s) => s.toLowerCase()),
    google: {
      clientId: e.GOOGLE_CLIENT_ID ?? '',
      clientSecret: e.GOOGLE_CLIENT_SECRET ?? '',
      refreshToken: e.GOOGLE_REFRESH_TOKEN ?? '',
    },
    microsoft: {
      clientId: e.MS_CLIENT_ID ?? '',
      clientSecret: e.MS_CLIENT_SECRET ?? '',
      refreshToken: e.MS_REFRESH_TOKEN ?? '',
      tenant: e.MS_TENANT || 'common',
    },
    slackToken: e.SLACK_USER_TOKEN ?? '',
    discord: { token: e.DISCORD_BOT_TOKEN ?? '', channelIds: list(e.DISCORD_CHANNEL_IDS) },
    telegramToken: e.TELEGRAM_BOT_TOKEN ?? '',
    githubToken: e.GITHUB_TOKEN ?? '',
    weather: {
      lat: e.WEATHER_LAT ?? '',
      lon: e.WEATHER_LON ?? '',
      place: e.WEATHER_PLACE || 'Oslo',
      contact: e.WEATHER_CONTACT ?? '',
    },
    newsFeeds: list(e.NEWS_FEEDS ?? 'https://www.nrk.no/toppsaker.rss'),
    push: {
      enabled: e.PUSH_ENABLED === 'true',
      // Av personvernhensyn sendes ikke innhold via Apple/Google/Expo som standard.
      includeContent: e.PUSH_INCLUDE_CONTENT === 'true',
    },
  };
}

export function assertSecureConfig(cfg: Config): void {
  if (cfg.token.length < 32) {
    throw new Error(
      'DASHBOARD_TOKEN mangler eller er kortere enn 32 tegn. Kjør `npm run setup` for å lage en.',
    );
  }
  if (cfg.isProd && cfg.corsOrigins.some((o) => o === '*')) {
    throw new Error('CORS_ORIGINS kan ikke være * i produksjon.');
  }
}

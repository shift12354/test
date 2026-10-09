import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const TOKEN = 'test-token-that-is-long-enough-1234567890';
let app: FastifyInstance;
const auth = { authorization: `Bearer ${TOKEN}` };

beforeAll(async () => {
  const cfg = loadConfig({
    DASHBOARD_TOKEN: TOKEN, DATA_DIR: mkdtempSync(path.join(tmpdir(), 'ld-')), NODE_ENV: 'test',
    // Sørg for at testene aldri bruker ekte nøkler fra en lokal .env
    GOOGLE_REFRESH_TOKEN: '', MS_REFRESH_TOKEN: '', SLACK_USER_TOKEN: '', DISCORD_BOT_TOKEN: '',
    TELEGRAM_BOT_TOKEN: '', GITHUB_TOKEN: '', WEATHER_LAT: '', NEWS_FEEDS: '',
  });
  delete process.env.NEWS_FEEDS;
  app = await buildApp({ cfg, logger: false });
});
afterAll(() => app.close());

describe('sikkerhet', () => {
  it('nekter oppstart med for kort token', async () => {
    await expect(buildApp({ cfg: loadConfig({ DASHBOARD_TOKEN: 'kort' }), logger: false })).rejects.toThrow(/32 tegn/);
  });
  it('krever auth på API', async () => {
    const res = await app.inject({ url: '/api/v1/dashboard' });
    expect(res.statusCode).toBe(401);
  });
  it('avviser feil token', async () => {
    const res = await app.inject({ url: '/api/v1/dashboard', headers: { authorization: 'Bearer feil' } });
    expect(res.statusCode).toBe(401);
  });
  it('health er åpen og lekker ingenting', async () => {
    const res = await app.inject({ url: '/health' });
    expect(res.json()).toEqual({ ok: true });
  });
  it('setter sikkerhets-headers', async () => {
    const res = await app.inject({ url: '/health' });
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
  it('login gir httpOnly-cookie som virker, og cookie krever origin ved endring', async () => {
    const bad = await app.inject({ method: 'POST', url: '/api/v1/session', payload: { token: 'feil' } });
    expect(bad.statusCode).toBe(401);
    const ok = await app.inject({ method: 'POST', url: '/api/v1/session', payload: { token: TOKEN } });
    const setCookie = String(ok.headers['set-cookie']);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    const cookie = setCookie.split(';')[0]!;
    expect((await app.inject({ url: '/api/v1/agents', headers: { cookie } })).statusCode).toBe(200);
    const csrf = await app.inject({ method: 'POST', url: '/api/v1/alarms', headers: { cookie, origin: 'https://evil.example' }, payload: { time: '06:00', days: [] } });
    expect(csrf.statusCode).toBe(403);
  });
  it('500-feil lekker ikke detaljer', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/alarms', headers: auth, payload: { time: '25:99', days: [] } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('invalid_input');
  });
});

describe('dashboard', () => {
  it('returnerer demo-data fra alle kilder', async () => {
    const res = await app.inject({ url: '/api/v1/dashboard', headers: auth });
    expect(res.statusCode).toBe(200);
    const d = res.json();
    expect(d.mail.length).toBeGreaterThan(0);
    expect(d.messages.length).toBeGreaterThan(0);
    expect(d.sources.every((s: { mode: string }) => s.mode === 'demo')).toBe(true);
    expect(d.agents).toHaveLength(5);
    expect(d.briefing.lines.length).toBeGreaterThan(0);
  });
});

describe('alarmer', () => {
  it('CRUD', async () => {
    const created = await app.inject({ method: 'POST', url: '/api/v1/alarms', headers: auth, payload: { time: '06:30', days: [1, 3], label: 'Trening' } });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();
    const upd = await app.inject({ method: 'PUT', url: `/api/v1/alarms/${id}`, headers: auth, payload: { time: '06:45', days: [1], label: 'Trening', enabled: false } });
    expect(upd.json().time).toBe('06:45');
    const del = await app.inject({ method: 'DELETE', url: `/api/v1/alarms/${id}`, headers: auth });
    expect(del.statusCode).toBe(204);
  });
});

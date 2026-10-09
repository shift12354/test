import { AgentId, AlarmInput, LoginInput, PushRegistration } from '@life/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Agents } from '../agents/index.js';
import type { Config } from '../config.js';
import { safeEqual, SESSION_COOKIE, SESSION_TTL_S, signSession } from '../lib/auth.js';
import type { Store } from '../lib/store.js';

const IdParam = z.object({ id: z.string().min(1).max(64) });
const Force = z.object({ refresh: z.enum(['1', 'true']).optional() });

export const apiRoutes: FastifyPluginAsync<{ cfg: Config; store: Store; agents: Agents }> = async (app, { cfg, store, agents }) => {
  // --- Sesjon (web): bytter tokenet mot en httpOnly-cookie, så tokenet aldri ligger i localStorage.
  app.post('/session', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { token } = LoginInput.parse(req.body);
    if (!safeEqual(token, cfg.token)) {
      return reply.code(401).send({ error: { code: 'unauthorized', message: 'Feil tilgangsnøkkel' } });
    }
    reply.setCookie(SESSION_COOKIE, signSession(cfg.token), {
      httpOnly: true, secure: cfg.isProd, sameSite: 'strict', path: '/api', maxAge: SESSION_TTL_S,
    });
    return { ok: true };
  });
  app.delete('/session', async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/api' });
    return { ok: true };
  });

  // --- Dashboard
  app.get('/dashboard', async (req) => agents.dashboard(Boolean(Force.parse(req.query).refresh)));
  app.get('/briefing', async () => (await agents.dashboard()).briefing);
  app.get('/missed', async () => (await agents.dashboard()).missed);
  app.get('/mail', async () => (await agents.dashboard()).mail);
  app.get('/messages', async () => (await agents.dashboard()).messages);
  app.get('/calendar', async () => (await agents.dashboard()).calendar);
  app.get('/updates', async () => (await agents.dashboard()).updates);
  app.get('/sources', async () => (await agents.dashboard()).sources);

  // --- Agenter
  app.get('/agents', async () => agents.list());
  app.post('/agents/:id/run', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req) => {
    const id = AgentId.parse((req.params as { id: string }).id);
    return agents.run(id);
  });

  // --- Alarmer
  app.get('/alarms', async () => store.listAlarms());
  app.post('/alarms', async (req, reply) => {
    reply.code(201);
    return store.createAlarm(AlarmInput.parse(req.body));
  });
  app.put('/alarms/:id', async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    const alarm = await store.updateAlarm(id, AlarmInput.parse(req.body));
    if (!alarm) return reply.code(404).send({ error: { code: 'not_found', message: 'Alarmen finnes ikke' } });
    return alarm;
  });
  app.delete('/alarms/:id', async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    if (!(await store.deleteAlarm(id))) return reply.code(404).send({ error: { code: 'not_found', message: 'Alarmen finnes ikke' } });
    return reply.code(204).send();
  });

  // --- Push (mobil)
  app.post('/push/register', async (req) => {
    await store.addPushToken(PushRegistration.parse(req.body).token);
    return { ok: true };
  });
  app.post('/push/unregister', async (req) => {
    await store.removePushToken(PushRegistration.parse(req.body).token);
    return { ok: true };
  });
};

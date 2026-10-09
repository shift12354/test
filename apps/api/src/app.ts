import { existsSync } from 'node:fs';
import path from 'node:path';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { createAgents } from './agents/index.js';
import { assertSecureConfig, repoRoot, type Config } from './config.js';
import { buildConnectors, createCollector } from './connectors/index.js';
import type { Connector } from './connectors/types.js';
import { safeEqual, SESSION_COOKIE, verifySession } from './lib/auth.js';
import { Store } from './lib/store.js';
import { apiRoutes } from './routes/api.js';

/** Ugyldig eller "null"-origin (sandboxed iframe, file://) regnes som fremmed, ikke som en 500-feil. */
const sameHost = (origin: string, host: string | undefined): boolean => {
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

export type AppOptions = { cfg: Config; connectors?: Connector[]; logger?: boolean };

export async function buildApp({ cfg, connectors, logger = true }: AppOptions): Promise<FastifyInstance> {
  assertSecureConfig(cfg);

  const app = Fastify({
    logger: logger && {
      level: cfg.isProd ? 'info' : 'debug',
      // Aldri logg tokens eller cookies.
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    },
    bodyLimit: 64 * 1024,
    trustProxy: cfg.trustProxy,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    hsts: cfg.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  });
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || cfg.corsOrigins.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(cookie);

  const store = new Store(cfg.dataDir);
  const collector = createCollector(cfg, connectors ?? buildConnectors(cfg), app.log);
  const agents = createAgents({ cfg, store, snapshot: (f) => collector.get(f), log: app.log });
  app.decorate('agents', agents);

  const isAuthed = (req: FastifyRequest): 'bearer' | 'cookie' | null => {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ') && safeEqual(h.slice(7), cfg.token)) return 'bearer';
    if (verifySession(cfg.token, req.cookies[SESSION_COOKIE])) return 'cookie';
    return null;
  };

  app.addHook('onRequest', async (req, reply) => {
    const url = req.url.split('?')[0] ?? '';
    if (!url.startsWith('/api/')) return;
    reply.header('cache-control', 'no-store');
    if (url === '/api/v1/session' && req.method === 'POST') return;
    const via = isAuthed(req);
    if (!via) return reply.code(401).send({ error: { code: 'unauthorized', message: 'Ikke innlogget' } });
    // CSRF-vern for cookie-sesjoner: endringer må komme fra en tillatt origin.
    if (via === 'cookie' && req.method !== 'GET') {
      const origin = req.headers.origin;
      if (!origin || (!sameHost(origin, req.headers.host) && !cfg.corsOrigins.includes(origin))) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'Ugyldig opprinnelse' } });
      }
    }
  });

  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: { code: 'invalid_input', message: err.issues[0]?.message ?? 'Ugyldig input' } });
    }
    const code = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (code >= 500) req.log.error({ err: err.message }, 'uventet feil');
    reply.code(code).send({
      error: { code: code === 429 ? 'rate_limited' : code >= 500 ? 'internal' : 'bad_request', message: code >= 500 ? 'Noe gikk galt' : err.message },
    });
  });

  app.get('/health', async () => ({ ok: true }));
  await app.register(apiRoutes, { prefix: '/api/v1', cfg, store, agents });

  // I produksjon serverer API-et også web-appen (samme origin, så cookies blir enkle og trygge).
  const webDist = path.join(repoRoot, 'apps/web/dist');
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith('/api/') ? reply.code(404).send({ error: { code: 'not_found', message: 'Finnes ikke' } }) : reply.sendFile('index.html'),
    );
  }

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    agents: ReturnType<typeof createAgents>;
  }
}

import { CalendarEvent, MailItem, MessageItem, UpdateItem, Weather, type SourceStatus } from '@life/shared';
import type { z } from 'zod';
import type { Config } from '../config.js';
import { ttlCache } from '../lib/cache.js';
import { UpstreamError } from '../lib/http.js';
import { googleConnectors } from './google.js';
import { discordConnector, slackConnector, telegramConnector } from './messaging.js';
import { microsoftConnectors } from './microsoft.js';
import type { Connector, Kind, KindMap } from './types.js';
import { githubConnector, newsConnector, weatherConnector } from './updates.js';

export type Snapshot = {
  mail: MailItem[];
  messages: MessageItem[];
  calendar: CalendarEvent[];
  updates: UpdateItem[];
  weather: Weather | null;
  sources: SourceStatus[];
  fetchedAt: string;
};

const schemaFor: Record<Exclude<Kind, 'weather'>, z.ZodType> = {
  mail: MailItem, messages: MessageItem, calendar: CalendarEvent, updates: UpdateItem,
};

/** Dropper elementer som ikke matcher kontrakten, i stedet for å krasje hele dashboardet. */
function validate<K extends Kind>(kind: K, data: KindMap[K]): KindMap[K] {
  if (kind === 'weather') return (data && Weather.safeParse(data).success ? data : null) as KindMap[K];
  const schema = schemaFor[kind as Exclude<Kind, 'weather'>];
  return (data as unknown[]).filter((d) => schema.safeParse(d).success) as KindMap[K];
}

export function buildConnectors(cfg: Config): Connector[] {
  const [gmail, gcal] = googleConnectors(cfg);
  const [outlook, ocal] = microsoftConnectors(cfg);
  return [
    gmail, outlook, gcal, ocal,
    slackConnector(cfg), discordConnector(cfg), telegramConnector(cfg),
    githubConnector(cfg), newsConnector(cfg), weatherConnector(cfg),
  ] as Connector[];
}

export function createCollector(cfg: Config, connectors: Connector[], log: { warn: (o: object, m: string) => void }) {
  async function collect(): Promise<Snapshot> {
    const now = new Date();
    const snap: Snapshot = { mail: [], messages: [], calendar: [], updates: [], weather: null, sources: [], fetchedAt: now.toISOString() };

    await Promise.all(
      connectors.map(async (c) => {
        let data: KindMap[Kind] | undefined;
        let status: SourceStatus;
        if (c.configured()) {
          try {
            data = validate(c.kind, await c.fetchLive());
            status = { id: c.id, name: c.name, mode: 'live' };
          } catch (err) {
            // Logg kun tjeneste og status, aldri respons, URL eller token.
            const msg = err instanceof UpstreamError ? err.message : `${c.name} kunne ikke hentes`;
            log.warn({ connector: c.id, status: err instanceof UpstreamError ? err.status : undefined }, 'connector feilet');
            status = { id: c.id, name: c.name, mode: 'error', error: msg };
          }
        } else if (cfg.demoData) {
          data = c.demo(now);
          status = { id: c.id, name: c.name, mode: 'demo' };
        } else {
          return;
        }
        snap.sources.push(status);
        if (data === undefined) return;
        if (c.kind === 'weather') snap.weather = data as Weather | null;
        else (snap[c.kind] as unknown[]).push(...(data as unknown[]));
      }),
    );

    snap.mail.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    snap.messages.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    snap.calendar.sort((a, b) => a.start.localeCompare(b.start));
    snap.updates.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    snap.sources.sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    return snap;
  }

  return ttlCache(90_000, collect);
}

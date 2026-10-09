import { describeDays, nextAlarm, relativeTime, type AgentId, type AgentStatus, type Dashboard } from '@life/shared';
import type { Config } from '../config.js';
import type { Snapshot } from '../connectors/index.js';
import type { Store } from '../lib/store.js';
import { runMissed } from './glipp.js';
import { runInbox } from './innboks.js';
import { runBriefing } from './morgenbrief.js';
import { buildPushMessages, createNotifier, sendExpoPush } from './varsler.js';

const META: Record<AgentId, { name: string; description: string }> = {
  innboks: { name: 'Innboks-agent', description: 'Prioriterer mail fra Gmail og Outlook og forklarer hvorfor.' },
  glipp: { name: 'Gått glipp av', description: 'Finner det du ikke har fått med deg i dag: mail, nevninger, DM-er og reviews.' },
  morgenbrief: { name: 'Morgenbrief', description: 'Lager en rolig oppsummering av dagen når alarmen går.' },
  alarm: { name: 'Alarm', description: 'Holder styr på vekkerklokkene dine og når neste alarm går.' },
  varsler: { name: 'Varsler', description: 'Sender push-varsel til mobilen når noe nytt haster.' },
};

type Logger = { info: (o: object, m: string) => void; warn: (o: object, m: string) => void };

export function createAgents(deps: { cfg: Config; store: Store; snapshot: (force?: boolean) => Promise<Snapshot>; log: Logger }) {
  const { cfg, store, snapshot, log } = deps;
  const status = new Map<AgentId, AgentStatus>(
    (Object.keys(META) as AgentId[]).map((id) => [id, { id, ...META[id], status: 'idle', lastRunAt: null, summary: 'Ikke kjørt ennå' }]),
  );
  const notifier = createNotifier();

  const mark = (id: AgentId, s: AgentStatus['status'], summary: string) =>
    status.set(id, { ...status.get(id)!, status: s, summary, lastRunAt: new Date().toISOString() });

  async function dashboard(force = false): Promise<Dashboard> {
    const now = new Date();
    const snap = await snapshot(force);
    const alarms = await store.listAlarms();

    const inbox = runInbox(snap.mail, { vipSenders: cfg.vipSenders }, now);
    mark('innboks', 'ok', inbox.summary);

    const missed = runMissed({ ...snap, mail: inbox.mail }, now);
    mark('glipp', 'ok', missed.summary);

    const briefing = runBriefing({ ...snap, mail: inbox.mail }, missed.missed, alarms, { ownerName: cfg.ownerName, now });
    mark('morgenbrief', 'ok', `${briefing.lines.length} punkter klare`);

    const na = nextAlarm(alarms, now);
    mark('alarm', 'ok', na ? `Neste: ${describeDays(na.alarm.days).toLowerCase()} kl. ${na.alarm.time} (${relativeTime(na.at.toISOString(), now)})` : 'Ingen aktive alarmer');

    if (!status.get('varsler')!.lastRunAt) {
      mark('varsler', 'idle', cfg.push.enabled ? 'Venter på neste runde' : 'Av (sett PUSH_ENABLED=true)');
    }

    return {
      briefing, missed: missed.missed, mail: inbox.mail, messages: snap.messages, calendar: snap.calendar,
      updates: snap.updates, alarms, agents: [...status.values()], sources: snap.sources,
    };
  }

  async function runNotifier(): Promise<void> {
    if (!cfg.push.enabled) return;
    try {
      const d = await dashboard();
      const fresh = notifier.fresh(d.missed);
      const tokens = await store.pushTokens();
      await sendExpoPush(buildPushMessages(fresh, tokens, cfg.push.includeContent));
      mark('varsler', 'ok', fresh.length ? `Sendte varsel om ${fresh.length} ting` : 'Ingenting nytt som haster');
      // Logger kun antall, aldri innhold.
      if (fresh.length) log.info({ count: fresh.length, devices: tokens.length }, 'push sendt');
    } catch (err) {
      mark('varsler', 'error', 'Kunne ikke sende varsel');
      log.warn({ err: (err as Error).message }, 'varsler feilet');
    }
  }

  async function run(id: AgentId): Promise<AgentStatus> {
    status.set(id, { ...status.get(id)!, status: 'running' });
    if (id === 'varsler') await runNotifier();
    else await dashboard(true);
    return status.get(id)!;
  }

  return { dashboard, run, runNotifier, list: () => [...status.values()] };
}

export type Agents = ReturnType<typeof createAgents>;

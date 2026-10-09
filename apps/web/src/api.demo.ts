/**
 * Demo-API som kjører helt i nettleseren (`vite build --mode demo`).
 * Bruker de samme demo-dataene og agentene som API-et, så demoen oppfører seg som den ekte appen.
 */
import { describeDays, nextAlarm, relativeTime, type AgentId, type AgentStatus, type Alarm, type AlarmInput, type Dashboard, type SourceStatus } from '@life/shared';
import { runMissed } from '../../api/src/agents/glipp';
import { runInbox } from '../../api/src/agents/innboks';
import { runBriefing } from '../../api/src/agents/morgenbrief';
import * as demo from '../../api/src/connectors/demo';

export class AuthError extends Error {}

let alarms: Alarm[] = [
  { id: 'hverdag', time: '07:00', days: [1, 2, 3, 4, 5], label: 'Jobb', enabled: true, briefing: true },
  { id: 'helg', time: '09:00', days: [0, 6], label: 'Sovemorgen', enabled: false, briefing: true },
];

const META: Record<AgentId, { name: string; description: string }> = {
  innboks: { name: 'Innboks-agent', description: 'Prioriterer mail fra Gmail og Outlook og forklarer hvorfor.' },
  glipp: { name: 'Gått glipp av', description: 'Finner det du ikke har fått med deg i dag.' },
  morgenbrief: { name: 'Morgenbrief', description: 'Lager en rolig oppsummering av dagen når alarmen går.' },
  alarm: { name: 'Alarm', description: 'Holder styr på vekkerklokkene dine.' },
  varsler: { name: 'Varsler', description: 'Sender push-varsel til mobilen når noe nytt haster.' },
};
const runs: Partial<Record<AgentId, string>> = {};

const SOURCES: SourceStatus[] = [
  ['discord', 'Discord'], ['github', 'GitHub'], ['gmail', 'Gmail'], ['google-calendar', 'Google Kalender'], ['news', 'Nyheter'],
  ['outlook', 'Outlook'], ['outlook-calendar', 'Outlook-kalender'], ['slack', 'Slack'], ['telegram', 'Telegram'], ['weather', 'Vær (MET)'],
].map(([id, name]) => ({ id: id!, name: name!, mode: 'demo' as const }));

const sorted = () => [...alarms].sort((a, b) => a.time.localeCompare(b.time));

function dashboard(): Dashboard {
  const now = new Date();
  const mail = [...demo.demoGmail(now), ...demo.demoOutlook(now)];
  const messages = [...demo.demoSlack(now), ...demo.demoDiscord(now), ...demo.demoTelegram(now)].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const calendar = [...demo.demoGoogleCalendar(now), ...demo.demoOutlookCalendar(now)].sort((a, b) => a.start.localeCompare(b.start));
  const updates = [...demo.demoGithub(now), ...demo.demoNews(now)].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const weather = demo.demoWeather(now, 'Oslo');

  const inbox = runInbox(mail, { vipSenders: [] }, now);
  const missed = runMissed({ mail: inbox.mail, messages, calendar, updates }, now);
  const briefing = runBriefing({ mail: inbox.mail, messages, calendar, updates, weather }, missed.missed, sorted(), { now });
  const na = nextAlarm(alarms, now);

  const summary: Record<AgentId, string> = {
    innboks: inbox.summary,
    glipp: missed.summary,
    morgenbrief: `${briefing.lines.length} punkter klare`,
    alarm: na ? `Neste: ${describeDays(na.alarm.days).toLowerCase()} kl. ${na.alarm.time} (${relativeTime(na.at.toISOString(), now)})` : 'Ingen aktive alarmer',
    varsler: runs.varsler ? 'Ingenting nytt som haster (demo)' : 'Av i demo',
  };
  const agents: AgentStatus[] = (Object.keys(META) as AgentId[]).map((id) => ({
    id, ...META[id], status: id === 'varsler' && !runs.varsler ? 'idle' : 'ok', lastRunAt: runs[id] ?? now.toISOString(), summary: summary[id],
  }));

  return { briefing, missed: missed.missed, mail: inbox.mail, messages, calendar, updates, alarms: sorted(), agents, sources: SOURCES };
}

const tick = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

export const api = {
  login: async (_token: string) => ({ ok: true as const }),
  logout: async () => ({ ok: true as const }),
  dashboard: async (_refresh = false) => tick(dashboard()),
  runAgent: async (id: AgentId) => {
    runs[id] = new Date().toISOString();
    return tick(dashboard().agents.find((a) => a.id === id)!);
  },
  createAlarm: async (a: AlarmInput) => {
    const alarm = { ...a, id: crypto.randomUUID() };
    alarms.push(alarm);
    return alarm;
  },
  updateAlarm: async (id: string, a: AlarmInput) => {
    const alarm = { ...a, id };
    alarms = alarms.map((x) => (x.id === id ? alarm : x));
    return alarm;
  },
  deleteAlarm: async (id: string) => {
    alarms = alarms.filter((x) => x.id !== id);
  },
};

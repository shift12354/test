import {
  clock, greetingFor, nextAlarm,
  type Alarm, type Briefing, type CalendarEvent, type MailItem, type MessageItem, type MissedItem, type UpdateItem, type Weather,
} from '@life/shared';

type Input = { mail: MailItem[]; messages: MessageItem[]; calendar: CalendarEvent[]; updates: UpdateItem[]; weather: Weather | null };

/** Morgenbrief-agenten: én rolig oppsummering av dagen, på norsk. */
export function runBriefing(
  snap: Input,
  missed: MissedItem[],
  alarms: Alarm[],
  opts: { ownerName?: string; now?: Date } = {},
): Briefing {
  const now = opts.now ?? new Date();
  const lines: string[] = [];
  const w = snap.weather;
  if (w) {
    const rain = w.precipitationMm >= 1 ? ` Ta med paraply (${w.precipitationMm} mm).` : '';
    lines.push(`${w.temperature}° og ${w.description} i ${w.place}, mellom ${w.low}° og ${w.high}° i dag.${rain}`);
  }

  const today = snap.calendar.filter((e) => new Date(e.end) > now);
  const next = today.find((e) => !e.allDay && new Date(e.start) > now) ?? null;
  if (snap.calendar.length === 0) lines.push('Ingen avtaler i dag, så kalenderen er din.');
  else if (next) lines.push(`${snap.calendar.length} avtaler i dag. Neste: ${next.title} kl. ${clock(next.start)}.`);
  else lines.push(`${snap.calendar.length} avtaler i dag, alle er unnagjort.`);

  const unreadMail = snap.mail.filter((m) => m.unread);
  const urgentMail = unreadMail.filter((m) => m.priority === 'high');
  if (unreadMail.length) {
    lines.push(`${unreadMail.length} uleste mail${urgentMail.length ? `, og ${urgentMail.length} av dem haster` : ''}.`);
  }
  const unreadMsg = snap.messages.filter((m) => m.unread);
  const mentions = unreadMsg.filter((m) => m.mentionsMe);
  if (unreadMsg.length) {
    lines.push(`${unreadMsg.length} uleste meldinger${mentions.length ? `, og ${mentions.length} nevner deg` : ''}.`);
  }
  if (missed.length) lines.push(`Du har gått glipp av ${missed.length} ting. De viktigste står under.`);
  const top = snap.updates.find((u) => u.source === 'news');
  if (top) lines.push(`Toppsak: ${top.title}`);

  const na = nextAlarm(alarms, now);
  const name = opts.ownerName ? `, ${opts.ownerName}` : '';
  return {
    greeting: `${greetingFor(now)}${name}`,
    generatedAt: now.toISOString(),
    lines,
    weather: w,
    nextEvent: next,
    nextAlarm: na ? { alarm: na.alarm, at: na.at.toISOString() } : null,
    counts: {
      unreadMail: unreadMail.length,
      unreadMessages: unreadMsg.length,
      eventsToday: snap.calendar.length,
      missed: missed.length,
    },
    highlights: missed.slice(0, 3),
  };
}

import type { CalendarEvent, MailItem, MessageItem, MissedItem, Priority, UpdateItem } from '@life/shared';
import { sourceLabel } from '@life/shared';

const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/**
 * "Gått glipp av"-agenten: finner ting du ikke har fått med deg i løpet av dagen.
 * Tar inn mail som allerede er prioritert av innboks-agenten.
 */
export function runMissed(
  input: { mail: MailItem[]; messages: MessageItem[]; calendar: CalendarEvent[]; updates: UpdateItem[] },
  now = new Date(),
): { missed: MissedItem[]; summary: string } {
  const out: MissedItem[] = [];
  const minutesAgo = (iso: string) => (now.getTime() - new Date(iso).getTime()) / 60000;

  for (const m of input.mail) {
    if (!m.unread || m.priority === 'low' || !m.priority) continue;
    if (minutesAgo(m.receivedAt) < 30) continue; // nettopp kommet, ikke "gått glipp av" ennå
    out.push({
      id: `missed-${m.id}`, kind: 'mail', title: m.subject, detail: `Fra ${m.from.name || m.from.address}`,
      source: sourceLabel[m.source] ?? m.source, at: m.receivedAt, priority: m.priority,
      reason: m.reasons?.[0] ?? 'Ulest mail', url: m.url,
    });
  }

  for (const msg of input.messages) {
    if (!msg.unread) continue;
    const isDm = msg.channel === 'DM' || !msg.channel.startsWith('#');
    if (!msg.mentionsMe && !isDm) continue;
    out.push({
      id: `missed-${msg.id}`, kind: 'message', title: msg.text, detail: `${msg.from} i ${msg.channel}`,
      source: sourceLabel[msg.source] ?? msg.source, at: msg.sentAt,
      priority: msg.mentionsMe ? 'high' : 'medium',
      reason: msg.mentionsMe ? 'Du ble nevnt' : 'Direktemelding', url: msg.url,
    });
  }

  for (const e of input.calendar) {
    if (e.allDay) continue;
    const startsIn = -minutesAgo(e.start);
    if (startsIn > 0 && startsIn <= 30) {
      out.push({
        id: `missed-${e.id}`, kind: 'event', title: e.title,
        detail: e.location ? `Starter om ${Math.round(startsIn)} min, ${e.location}` : `Starter om ${Math.round(startsIn)} min`,
        source: sourceLabel[e.source] ?? e.source, at: e.start, priority: 'high', reason: 'Starter snart', url: e.url,
      });
    }
  }

  for (const u of input.updates) {
    if (u.source !== 'github') continue;
    const important = ['review_requested', 'mention', 'assign', 'security_alert'];
    if (!u.reason || !important.includes(u.reason)) continue;
    out.push({
      id: `missed-${u.id}`, kind: 'update', title: u.title, detail: u.summary ?? '', source: 'GitHub', at: u.publishedAt,
      priority: u.reason === 'security_alert' ? 'high' : 'medium',
      reason: { review_requested: 'Venter på din review', mention: 'Du ble nevnt', assign: 'Tildelt deg', security_alert: 'Sikkerhetsvarsel' }[u.reason] ?? u.reason,
      url: u.url,
    });
  }

  out.sort((a, b) => rank[a.priority] - rank[b.priority] || b.at.localeCompare(a.at));
  const high = out.filter((o) => o.priority === 'high').length;
  return {
    missed: out,
    summary: out.length ? `${out.length} ting, ${high} haster` : 'Du har fått med deg alt ✨',
  };
}

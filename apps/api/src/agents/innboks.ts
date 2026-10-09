import type { MailItem, Priority } from '@life/shared';

export type InboxRules = { vipSenders: string[] };

const URGENT = ['haster', 'viktig', 'frist', 'i dag', 'asap', 'urgent', 'forfall', 'purring', 'svar', 'signer'];
const BULK = ['no-reply', 'noreply', 'nyhetsbrev', 'newsletter', 'meld deg av', 'unsubscribe', 'tilbud'];

/** Innboks-agenten: gir hver mail en prioritet og en forklaring på norsk. */
export function scoreMail(mail: MailItem, rules: InboxRules, now = new Date()): { score: number; priority: Priority; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const text = `${mail.subject} ${mail.snippet}`.toLowerCase();
  const from = `${mail.from.name} ${mail.from.address}`.toLowerCase();

  if (mail.unread) score += 2;
  if (mail.important) {
    score += 3;
    reasons.push('Merket som viktig');
  }
  const vip = rules.vipSenders.find((v) => from.includes(v));
  if (vip) {
    score += 4;
    reasons.push(`Fra VIP (${vip})`);
  }
  const word = URGENT.find((w) => text.includes(w));
  if (word) {
    score += 3;
    reasons.push(`Inneholder «${word}»`);
  }
  if (now.getTime() - new Date(mail.receivedAt).getTime() < 2 * 3600_000) score += 1;
  if (BULK.some((w) => from.includes(w) || text.includes(w))) {
    score -= 4;
    reasons.push('Ser ut som nyhetsbrev/reklame');
  }
  const priority: Priority = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
  return { score, priority, reasons };
}

export function runInbox(mail: MailItem[], rules: InboxRules, now = new Date()) {
  const ranked = mail
    .map((m) => ({ m, s: scoreMail(m, rules, now) }))
    .sort((a, b) => b.s.score - a.s.score || b.m.receivedAt.localeCompare(a.m.receivedAt))
    .map(({ m, s }): MailItem => ({ ...m, priority: s.priority, reasons: s.reasons }));
  const unread = ranked.filter((m) => m.unread);
  const important = unread.filter((m) => m.priority === 'high');
  return {
    mail: ranked,
    summary: unread.length
      ? `${unread.length} uleste, ${important.length} som haster`
      : 'Innboksen er tom for uleste 🎉',
  };
}

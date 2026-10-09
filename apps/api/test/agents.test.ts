import { describe, expect, it } from 'vitest';
import { nextOccurrence, type MailItem } from '@life/shared';
import { scoreMail, runInbox } from '../src/agents/innboks.js';
import { runMissed } from '../src/agents/glipp.js';
import { runBriefing } from '../src/agents/morgenbrief.js';
import { buildPushMessages, createNotifier } from '../src/agents/varsler.js';
import { demoGmail, demoGoogleCalendar, demoSlack, demoWeather } from '../src/connectors/demo.js';
import { parseRss } from '../src/connectors/updates.js';

const now = new Date('2026-10-09T10:00:00+02:00');
const mail = (p: Partial<MailItem>): MailItem => ({
  id: 'x', source: 'gmail', from: { name: 'A', address: 'a@example.com' }, subject: 'Hei', snippet: '',
  receivedAt: now.toISOString(), unread: true, important: false, ...p,
});

describe('innboks-agent', () => {
  it('prioriterer viktig + haster høyt', () => {
    const s = scoreMail(mail({ important: true, subject: 'Haster: svar i dag' }), { vipSenders: [] }, now);
    expect(s.priority).toBe('high');
    expect(s.reasons).toContain('Merket som viktig');
  });
  it('nedprioriterer nyhetsbrev', () => {
    const s = scoreMail(mail({ from: { name: 'Butikk', address: 'no-reply@example.com' }, subject: 'Tilbud' }), { vipSenders: [] }, now);
    expect(s.priority).toBe('low');
  });
  it('VIP-avsender gir høy prioritet', () => {
    const s = scoreMail(mail({ from: { name: 'Sjefen', address: 'sjef@example.com' } }), { vipSenders: ['sjef@example.com'] }, now);
    expect(s.priority).toBe('high');
  });
  it('sorterer viktigst først', () => {
    const { mail: ranked } = runInbox(demoGmail(now), { vipSenders: [] }, now);
    expect(ranked[0]?.id).toBe('demo-g1');
    expect(ranked.at(-1)?.priority).toBe('low');
  });
});

describe('gått glipp av-agent', () => {
  it('finner nevninger, viktige mail og møter som starter snart', () => {
    const { mail: ranked } = runInbox(demoGmail(now), { vipSenders: [] }, now);
    const cal = [{ id: 'e', source: 'google' as const, title: 'Møte', start: new Date(now.getTime() + 15 * 60000).toISOString(), end: new Date(now.getTime() + 45 * 60000).toISOString(), allDay: false }];
    const { missed } = runMissed({ mail: ranked, messages: demoSlack(now), calendar: cal, updates: [] }, now);
    const kinds = missed.map((m) => m.kind);
    expect(kinds).toContain('mail');
    expect(kinds).toContain('message');
    expect(kinds).toContain('event');
    expect(missed[0]?.priority).toBe('high');
    expect(missed.find((m) => m.title.includes('Ukens beste tilbud'))).toBeUndefined();
  });
});

describe('morgenbrief-agent', () => {
  it('lager norsk oppsummering', () => {
    const b = runBriefing(
      { mail: [], messages: [], calendar: demoGoogleCalendar(now), updates: [], weather: demoWeather(now, 'Oslo') },
      [],
      [{ id: 'a', time: '07:00', days: [1, 2, 3, 4, 5], label: '', enabled: true, briefing: true }],
      { now, ownerName: 'Test' },
    );
    expect(b.greeting).toBe('God dag, Test'); // kl. 10:00
    expect(b.lines.join(' ')).toMatch(/lett regn i Oslo/);
    expect(b.nextEvent?.title).toBe('Tannlege');
    expect(b.nextAlarm).not.toBeNull();
  });
});

describe('alarm', () => {
  it('finner neste hverdag', () => {
    // Fredag 9. okt 10:00 → neste hverdag kl 07 er mandag 12. okt
    const at = nextOccurrence({ id: 'a', time: '07:00', days: [1, 2, 3, 4, 5], label: '', enabled: true, briefing: true }, now);
    expect(at?.getDay()).toBe(1);
    expect(at?.getDate()).toBe(12);
  });
  it('deaktivert alarm går aldri', () => {
    expect(nextOccurrence({ id: 'a', time: '07:00', days: [], label: '', enabled: false, briefing: true }, now)).toBeNull();
  });
});

describe('varsler-agent', () => {
  const item = { id: '1', kind: 'mail' as const, title: 'Hemmelig kontrakt', detail: '', source: 'Gmail', at: now.toISOString(), priority: 'high' as const, reason: '' };
  it('sender ikke innhold som standard (personvern)', () => {
    const [msg] = buildPushMessages([item], ['ExponentPushToken[abc]'], false);
    expect(JSON.stringify(msg)).not.toContain('Hemmelig');
  });
  it('varsler bare én gang per ting', () => {
    const n = createNotifier();
    expect(n.fresh([item])).toHaveLength(1);
    expect(n.fresh([item])).toHaveLength(0);
  });
});

describe('RSS', () => {
  it('parser CDATA og entities', () => {
    const items = parseRss('<rss><channel><item><title><![CDATA[Hei & hå]]></title><link>https://example.com/a</link></item></channel></rss>');
    expect(items[0]).toMatchObject({ title: 'Hei & hå', link: 'https://example.com/a' });
  });
});

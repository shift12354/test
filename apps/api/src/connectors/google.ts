import type { CalendarEvent, MailItem } from '@life/shared';
import type { Config } from '../config.js';
import { fetchJson, oauthRefresher } from '../lib/http.js';
import { demoGmail, demoGoogleCalendar } from './demo.js';
import type { Connector } from './types.js';
import { startOfToday, endOfToday, parseFrom } from './util.js';

/** Gmail + Google Kalender. Read-only scopes: gmail.readonly, calendar.readonly */
export function googleConnectors(cfg: Config): [Connector<'mail'>, Connector<'calendar'>] {
  const g = cfg.google;
  const configured = () => Boolean(g.clientId && g.clientSecret && g.refreshToken);
  const accessToken = oauthRefresher('Google', 'https://oauth2.googleapis.com/token', () => ({
    client_id: g.clientId,
    client_secret: g.clientSecret,
    refresh_token: g.refreshToken,
  }));
  const get = async <T>(url: string) =>
    fetchJson<T>('Google', url, { headers: { authorization: `Bearer ${await accessToken()}` } });

  type GmailList = { messages?: { id: string }[] };
  type GmailMsg = {
    id: string; snippet: string; labelIds?: string[]; internalDate: string;
    payload?: { headers?: { name: string; value: string }[] };
  };

  const gmail: Connector<'mail'> = {
    id: 'gmail', name: 'Gmail', kind: 'mail', configured,
    demo: demoGmail,
    async fetchLive() {
      const q = encodeURIComponent('in:inbox newer_than:2d');
      const list = await get<GmailList>(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=25`);
      const msgs = await Promise.all(
        (list.messages ?? []).map((m) =>
          get<GmailMsg>(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          ),
        ),
      );
      return msgs.map((m): MailItem => {
        const h = (n: string) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? '';
        const labels = m.labelIds ?? [];
        return {
          id: `gmail-${m.id}`, source: 'gmail', from: parseFrom(h('from')),
          subject: h('subject') || '(uten emne)', snippet: m.snippet,
          receivedAt: new Date(Number(m.internalDate)).toISOString(),
          unread: labels.includes('UNREAD'), important: labels.includes('IMPORTANT'),
          url: `https://mail.google.com/mail/u/0/#inbox/${m.id}`,
        };
      });
    },
  };

  type GEvent = {
    id: string; summary?: string; location?: string; htmlLink?: string; status?: string;
    start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string };
  };

  const calendar: Connector<'calendar'> = {
    id: 'google-calendar', name: 'Google Kalender', kind: 'calendar', configured,
    demo: demoGoogleCalendar,
    async fetchLive() {
      const p = new URLSearchParams({
        timeMin: startOfToday().toISOString(), timeMax: endOfToday().toISOString(),
        singleEvents: 'true', orderBy: 'startTime', maxResults: '50',
      });
      const res = await get<{ items?: GEvent[] }>(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`);
      return (res.items ?? [])
        .filter((e) => e.status !== 'cancelled')
        .map((e): CalendarEvent => ({
          id: `gcal-${e.id}`, source: 'google', title: e.summary ?? '(uten tittel)',
          start: new Date(e.start.dateTime ?? e.start.date ?? '').toISOString(),
          end: new Date(e.end.dateTime ?? e.end.date ?? '').toISOString(),
          allDay: !e.start.dateTime, location: e.location, url: e.htmlLink,
        }));
    },
  };

  return [gmail, calendar];
}

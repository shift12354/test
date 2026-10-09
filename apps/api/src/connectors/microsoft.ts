import type { CalendarEvent, MailItem } from '@life/shared';
import type { Config } from '../config.js';
import { fetchJson, oauthRefresher } from '../lib/http.js';
import { demoOutlook, demoOutlookCalendar } from './demo.js';
import type { Connector } from './types.js';
import { endOfToday, startOfToday } from './util.js';

/** Outlook / Microsoft 365 via Microsoft Graph. Scopes: Mail.Read, Calendars.Read */
export function microsoftConnectors(cfg: Config): [Connector<'mail'>, Connector<'calendar'>] {
  const ms = cfg.microsoft;
  const configured = () => Boolean(ms.clientId && ms.refreshToken);
  const tenant = encodeURIComponent(ms.tenant);
  const accessToken = oauthRefresher('Microsoft', `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, () => ({
    client_id: ms.clientId,
    ...(ms.clientSecret ? { client_secret: ms.clientSecret } : {}),
    refresh_token: ms.refreshToken,
    scope: 'offline_access Mail.Read Calendars.Read',
  }));
  const get = async <T>(url: string) =>
    fetchJson<T>('Microsoft', url, {
      headers: { authorization: `Bearer ${await accessToken()}`, prefer: 'outlook.timezone="UTC"' },
    });

  type GMail = {
    id: string; subject?: string; bodyPreview?: string; receivedDateTime: string; isRead: boolean;
    importance?: string; webLink?: string; from?: { emailAddress?: { name?: string; address?: string } };
  };

  const mail: Connector<'mail'> = {
    id: 'outlook', name: 'Outlook', kind: 'mail', configured,
    demo: demoOutlook,
    async fetchLive() {
      const since = new Date(Date.now() - 2 * 86400_000).toISOString();
      const p = new URLSearchParams({
        $top: '25', $orderby: 'receivedDateTime desc', $filter: `receivedDateTime ge ${since}`,
        $select: 'id,subject,bodyPreview,from,receivedDateTime,isRead,importance,webLink',
      });
      const res = await get<{ value: GMail[] }>(`https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${p}`);
      return res.value.map((m): MailItem => ({
        id: `outlook-${m.id}`, source: 'outlook',
        from: { name: m.from?.emailAddress?.name ?? '', address: m.from?.emailAddress?.address ?? '' },
        subject: m.subject || '(uten emne)', snippet: m.bodyPreview ?? '',
        receivedAt: new Date(m.receivedDateTime).toISOString(), unread: !m.isRead,
        important: m.importance === 'high', url: m.webLink,
      }));
    },
  };

  type GEvent = {
    id: string; subject?: string; isAllDay: boolean; isCancelled?: boolean; webLink?: string;
    start: { dateTime: string }; end: { dateTime: string }; location?: { displayName?: string };
  };

  const calendar: Connector<'calendar'> = {
    id: 'outlook-calendar', name: 'Outlook-kalender', kind: 'calendar', configured,
    demo: demoOutlookCalendar,
    async fetchLive() {
      const p = new URLSearchParams({
        startDateTime: startOfToday().toISOString(), endDateTime: endOfToday().toISOString(),
        $select: 'id,subject,start,end,isAllDay,isCancelled,location,webLink', $top: '50',
      });
      const res = await get<{ value: GEvent[] }>(`https://graph.microsoft.com/v1.0/me/calendarView?${p}`);
      return res.value
        .filter((e) => !e.isCancelled)
        .map((e): CalendarEvent => ({
          id: `ocal-${e.id}`, source: 'outlook', title: e.subject || '(uten tittel)',
          // Graph returnerer UTC uten "Z" når vi ber om UTC
          start: new Date(`${e.start.dateTime.replace(/Z?$/, 'Z')}`).toISOString(),
          end: new Date(`${e.end.dateTime.replace(/Z?$/, 'Z')}`).toISOString(),
          allDay: e.isAllDay, location: e.location?.displayName || undefined, url: e.webLink,
        }));
    },
  };

  return [mail, calendar];
}

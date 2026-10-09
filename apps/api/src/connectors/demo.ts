import type { CalendarEvent, MailItem, MessageItem, UpdateItem, Weather } from '@life/shared';

/** Fiktive demo-data. Ingen ekte personer eller adresser (bruk kun example.com). */

const ago = (now: Date, min: number) => new Date(now.getTime() - min * 60_000).toISOString();
const at = (now: Date, h: number, m = 0) => {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export function demoGmail(now: Date): MailItem[] {
  return [
    {
      id: 'demo-g1', source: 'gmail', from: { name: 'Kari Nordmann', address: 'kari@example.com' },
      subject: 'Haster: signering av kontrakt i dag', snippet: 'Hei! Kan du se over og signere før kl. 15? Vedlagt ligger …',
      receivedAt: ago(now, 95), unread: true, important: true,
    },
    {
      id: 'demo-g2', source: 'gmail', from: { name: 'Strømselskapet', address: 'faktura@example.com' },
      subject: 'Faktura for september, forfall 15.10', snippet: 'Beløp å betale: 1 284,00 kr. Forfallsdato …',
      receivedAt: ago(now, 300), unread: true, important: false,
    },
    {
      id: 'demo-g3', source: 'gmail', from: { name: 'Nyhetsbrev', address: 'no-reply@example.com' },
      subject: 'Ukens beste tilbud 🎉', snippet: 'Ikke gå glipp av … Meld deg av her.',
      receivedAt: ago(now, 40), unread: true, important: false,
    },
    {
      id: 'demo-g4', source: 'gmail', from: { name: 'Ola Hansen', address: 'ola@example.com' },
      subject: 'Middag på fredag?', snippet: 'Tenkte vi kunne ta den nye restauranten i sentrum …',
      receivedAt: ago(now, 600), unread: false, important: false,
    },
  ];
}

export function demoOutlook(now: Date): MailItem[] {
  return [
    {
      id: 'demo-o1', source: 'outlook', from: { name: 'Prosjektleder', address: 'leder@example.com' },
      subject: 'Frist flyttet til torsdag', snippet: 'Kunden har bedt om mer tid. Ny frist er torsdag kl. 12.',
      receivedAt: ago(now, 180), unread: true, important: true,
    },
    {
      id: 'demo-o2', source: 'outlook', from: { name: 'HR', address: 'hr@example.com' },
      subject: 'Påminnelse: registrer timer', snippet: 'Husk å føre timer for denne uken innen fredag.',
      receivedAt: ago(now, 1300), unread: false, important: false,
    },
  ];
}

export function demoSlack(now: Date): MessageItem[] {
  return [
    { id: 'demo-s1', source: 'slack', channel: '#prosjekt-alfa', from: 'Ingrid', text: '@deg kan du ta en kikk på PR-en før standup?', sentAt: ago(now, 70), unread: true, mentionsMe: true },
    { id: 'demo-s2', source: 'slack', channel: 'DM', from: 'Jonas', text: 'Har du tid til en rask prat i dag?', sentAt: ago(now, 150), unread: true, mentionsMe: false },
  ];
}

export function demoDiscord(now: Date): MessageItem[] {
  return [
    { id: 'demo-d1', source: 'discord', channel: '#gaming', from: 'Mats', text: 'Spillkveld i kveld kl 20?', sentAt: ago(now, 220), unread: true, mentionsMe: false },
  ];
}

export function demoTelegram(now: Date): MessageItem[] {
  return [
    { id: 'demo-t1', source: 'telegram', channel: 'Familie', from: 'Mamma', text: 'Husk bursdagen til bestemor på søndag ❤️', sentAt: ago(now, 400), unread: true, mentionsMe: false },
  ];
}

export function demoGoogleCalendar(now: Date): CalendarEvent[] {
  return [
    { id: 'demo-c1', source: 'google', title: 'Standup', start: at(now, 9, 15), end: at(now, 9, 30), allDay: false, location: 'Google Meet' },
    { id: 'demo-c2', source: 'google', title: 'Tannlege', start: at(now, 14, 0), end: at(now, 14, 45), allDay: false, location: 'Storgata 1' },
    { id: 'demo-c3', source: 'google', title: 'Trening', start: at(now, 18, 0), end: at(now, 19, 0), allDay: false },
  ];
}

export function demoOutlookCalendar(now: Date): CalendarEvent[] {
  return [
    { id: 'demo-oc1', source: 'outlook', title: 'Kundemøte, prosjekt Alfa', start: at(now, 11, 0), end: at(now, 12, 0), allDay: false, location: 'Teams' },
  ];
}

export function demoGithub(now: Date): UpdateItem[] {
  return [
    { id: 'demo-gh1', source: 'github', title: 'Review requested: Legg til alarm-API', summary: 'eksempel/life-dashboard', publishedAt: ago(now, 120), reason: 'review_requested' },
    { id: 'demo-gh2', source: 'github', title: 'CI feilet på main', summary: 'eksempel/nettside', publishedAt: ago(now, 30), reason: 'ci_activity' },
  ];
}

export function demoNews(now: Date): UpdateItem[] {
  return [
    { id: 'demo-n1', source: 'news', title: 'Demo: Kraftig regnvær ventet på Østlandet i kveld', publishedAt: ago(now, 60) },
    { id: 'demo-n2', source: 'news', title: 'Demo: Ny togforbindelse åpner neste uke', publishedAt: ago(now, 200) },
    { id: 'demo-n3', source: 'news', title: 'Demo: Strømprisen faller i helgen', publishedAt: ago(now, 330) },
  ];
}

export function demoWeather(now: Date, place: string): Weather {
  return {
    place, temperature: 9, high: 12, low: 5, precipitationMm: 2.4,
    symbol: 'lightrain', description: 'lett regn', updatedAt: now.toISOString(),
  };
}

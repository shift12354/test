import type { Alarm } from './schemas';

/** Neste tidspunkt alarmen går, regnet fra `now` i lokal tid. */
export function nextOccurrence(alarm: Alarm, now: Date = new Date()): Date | null {
  if (!alarm.enabled) return null;
  const [h, m] = alarm.time.split(':').map(Number) as [number, number];
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    d.setHours(h, m, 0, 0);
    if (d <= now) continue;
    if (alarm.days.length === 0 || alarm.days.includes(d.getDay())) return d;
  }
  return null;
}

export function nextAlarm(alarms: Alarm[], now: Date = new Date()): { alarm: Alarm; at: Date } | null {
  let best: { alarm: Alarm; at: Date } | null = null;
  for (const alarm of alarms) {
    const at = nextOccurrence(alarm, now);
    if (at && (!best || at < best.at)) best = { alarm, at };
  }
  return best;
}

export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return 'God natt';
  if (h < 10) return 'God morgen';
  if (h < 17) return 'God dag';
  if (h < 22) return 'God kveld';
  return 'God natt';
}

const rtf = new Intl.RelativeTimeFormat('nb', { numeric: 'auto' });

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMin = Math.round((new Date(iso).getTime() - now.getTime()) / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffH = Math.round(diffMin / 60);
  if (Math.abs(diffH) < 24) return rtf.format(diffH, 'hour');
  return rtf.format(Math.round(diffH / 24), 'day');
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export const DAY_NAMES_SHORT = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'] as const;

export function describeDays(days: number[]): string {
  if (days.length === 0) return 'Én gang';
  if (days.length === 7) return 'Hver dag';
  const sorted = [...days].sort();
  if (sorted.join() === '1,2,3,4,5') return 'Hverdager';
  if (sorted.join() === '0,6') return 'Helg';
  // Mandag først
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => DAY_NAMES_SHORT[d])
    .join(', ');
}

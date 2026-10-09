export function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** "Kari Nordmann <kari@example.com>" → { name, address } */
export function parseFrom(raw: string): { name: string; address: string } {
  const m = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: (m[1] ?? '').trim() || (m[2] ?? ''), address: (m[2] ?? '').trim() };
  return { name: raw.trim(), address: raw.trim() };
}

export function truncate(s: string, max = 200): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

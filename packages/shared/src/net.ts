/**
 * Er vertsnavnet en lokal adresse (loopback eller privat IPv4-nett)?
 * Krever en hel IPv4-adresse, så `10.evil.com` eller `localhost.evil.com` ikke slipper gjennom.
 */
export function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '::1') return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (m.slice(1).some((p) => Number(p) > 255)) return false;
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/** Tillater http kun mot lokale adresser (utvikling). Alt annet må være https. Returnerer origin eller null. */
export function validateApiUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    // Brukernavn/passord i URL-en skal aldri lagres eller sendes.
    if (u.username || u.password) return null;
    if (u.protocol === 'https:' || (u.protocol === 'http:' && isLocalHost(u.hostname))) return u.origin;
    return null;
  } catch {
    return null;
  }
}

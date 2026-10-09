import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const sha256 = (s: string) => createHash('sha256').update(s).digest();

/** Konstant-tids-sammenligning. Hasher først så lengden ikke lekker. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export const SESSION_COOKIE = 'ld_session';
export const SESSION_TTL_S = 60 * 60 * 24 * 30;

const sessionKey = (token: string) => sha256(`life-dashboard:session:${token}`);

/** Tilstandsløs sesjon: `<utløp>.<hmac>`. Bytter du DASHBOARD_TOKEN, blir alle sesjoner ugyldige. */
export function signSession(token: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + SESSION_TTL_S;
  const mac = createHmac('sha256', sessionKey(token)).update(String(exp)).digest('base64url');
  return `${exp}.${mac}`;
}

export function verifySession(token: string, value: string | undefined, now = Date.now()): boolean {
  if (!value) return false;
  const [expStr, mac] = value.split('.');
  if (!expStr || !mac || !/^\d+$/.test(expStr)) return false;
  if (Number(expStr) * 1000 < now) return false;
  const expected = createHmac('sha256', sessionKey(token)).update(expStr).digest('base64url');
  return safeEqual(mac, expected);
}

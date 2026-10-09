import type { MissedItem } from '@life/shared';

export type PushMessage = { to: string; title: string; body: string; sound: 'default'; priority: 'high'; data: { screen: string } };

/**
 * Varsler-agenten: lager push-varsler for nye ting som haster.
 * Personvern: uten includeContent sendes kun antall. Ingen emnelinjer eller avsendere
 * går via Expo/Apple/Google.
 */
export function buildPushMessages(
  fresh: MissedItem[],
  tokens: string[],
  includeContent: boolean,
): PushMessage[] {
  if (!fresh.length || !tokens.length) return [];
  const title = fresh.length === 1 ? '1 ny ting som haster' : `${fresh.length} nye ting som haster`;
  const body = includeContent
    ? fresh.slice(0, 3).map((f) => `• ${f.title}`).join('\n')
    : 'Åpne Life Dashboard for å se hva det gjelder.';
  return tokens.map((to) => ({ to, title, body, sound: 'default', priority: 'high', data: { screen: 'glipp' } }));
}

/** Holder styr på hva vi allerede har varslet om, så du ikke får samme varsel to ganger. */
export function createNotifier() {
  const seen = new Set<string>();
  return {
    fresh(items: MissedItem[]): MissedItem[] {
      const out = items.filter((i) => i.priority === 'high' && !seen.has(i.id));
      for (const i of out) seen.add(i.id);
      if (seen.size > 5000) seen.clear();
      return out;
    },
  };
}

export async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (!messages.length) return;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Expo push svarte ${res.status}`);
}

import type { CalendarEvent, MailItem, MessageItem, UpdateItem, Weather } from '@life/shared';

export type Kind = 'mail' | 'messages' | 'calendar' | 'updates' | 'weather';

export interface KindMap {
  mail: MailItem[];
  messages: MessageItem[];
  calendar: CalendarEvent[];
  updates: UpdateItem[];
  weather: Weather | null;
}

/** Én connector per ekstern kilde. Uten nøkler brukes `demo()`. */
export interface Connector<K extends Kind = Kind> {
  id: string;
  name: string;
  kind: K;
  configured(): boolean;
  fetchLive(): Promise<KindMap[K]>;
  demo(now: Date): KindMap[K];
}

import { z } from 'zod';

/** Kontrakten mellom API, web og mobil. Endres her først. */

export const Priority = z.enum(['high', 'medium', 'low']);
export type Priority = z.infer<typeof Priority>;

export const MailSource = z.enum(['gmail', 'outlook']);
export const MessageSource = z.enum(['slack', 'discord', 'telegram']);
export const CalendarSource = z.enum(['google', 'outlook']);
export const UpdateSource = z.enum(['news', 'github']);

export const MailItem = z.object({
  id: z.string(),
  source: MailSource,
  from: z.object({ name: z.string(), address: z.string() }),
  subject: z.string(),
  snippet: z.string(),
  receivedAt: z.string(),
  unread: z.boolean(),
  important: z.boolean(),
  url: z.string().optional(),
  /** Settes av innboks-agenten */
  priority: Priority.optional(),
  reasons: z.array(z.string()).optional(),
});
export type MailItem = z.infer<typeof MailItem>;

export const MessageItem = z.object({
  id: z.string(),
  source: MessageSource,
  channel: z.string(),
  from: z.string(),
  text: z.string(),
  sentAt: z.string(),
  unread: z.boolean(),
  mentionsMe: z.boolean(),
  url: z.string().optional(),
});
export type MessageItem = z.infer<typeof MessageItem>;

export const CalendarEvent = z.object({
  id: z.string(),
  source: CalendarSource,
  title: z.string(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
  location: z.string().optional(),
  url: z.string().optional(),
});
export type CalendarEvent = z.infer<typeof CalendarEvent>;

export const UpdateItem = z.object({
  id: z.string(),
  source: UpdateSource,
  title: z.string(),
  summary: z.string().optional(),
  url: z.string().optional(),
  publishedAt: z.string(),
  /** F.eks. "review_requested" for GitHub */
  reason: z.string().optional(),
});
export type UpdateItem = z.infer<typeof UpdateItem>;

export const Weather = z.object({
  place: z.string(),
  temperature: z.number(),
  high: z.number(),
  low: z.number(),
  precipitationMm: z.number(),
  symbol: z.string(),
  description: z.string(),
  updatedAt: z.string(),
});
export type Weather = z.infer<typeof Weather>;

export const MissedItem = z.object({
  id: z.string(),
  kind: z.enum(['mail', 'message', 'event', 'update']),
  title: z.string(),
  detail: z.string(),
  source: z.string(),
  at: z.string(),
  priority: Priority,
  /** Hvorfor agenten mener dette er viktig, på norsk */
  reason: z.string(),
  url: z.string().optional(),
});
export type MissedItem = z.infer<typeof MissedItem>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const AlarmInput = z.object({
  time: z.string().regex(HHMM, 'Tid må være HH:MM'),
  /** 0 = søndag … 6 = lørdag. Tom liste = engangsalarm. */
  days: z.array(z.number().int().min(0).max(6)).max(7),
  label: z.string().trim().max(60).default(''),
  enabled: z.boolean().default(true),
  /** Vis morgenbrief når alarmen går */
  briefing: z.boolean().default(true),
});
export type AlarmInput = z.infer<typeof AlarmInput>;

export const Alarm = AlarmInput.extend({ id: z.string() });
export type Alarm = z.infer<typeof Alarm>;

export const AgentId = z.enum(['innboks', 'glipp', 'morgenbrief', 'alarm', 'varsler']);
export type AgentId = z.infer<typeof AgentId>;

export const AgentStatus = z.object({
  id: AgentId,
  name: z.string(),
  description: z.string(),
  status: z.enum(['idle', 'running', 'ok', 'error']),
  lastRunAt: z.string().nullable(),
  summary: z.string(),
});
export type AgentStatus = z.infer<typeof AgentStatus>;

export const SourceStatus = z.object({
  id: z.string(),
  name: z.string(),
  mode: z.enum(['live', 'demo', 'error']),
  error: z.string().optional(),
});
export type SourceStatus = z.infer<typeof SourceStatus>;

export const Briefing = z.object({
  greeting: z.string(),
  generatedAt: z.string(),
  lines: z.array(z.string()),
  weather: Weather.nullable(),
  nextEvent: CalendarEvent.nullable(),
  nextAlarm: z.object({ alarm: Alarm, at: z.string() }).nullable(),
  counts: z.object({
    unreadMail: z.number(),
    unreadMessages: z.number(),
    eventsToday: z.number(),
    missed: z.number(),
  }),
  highlights: z.array(MissedItem),
});
export type Briefing = z.infer<typeof Briefing>;

export const Dashboard = z.object({
  briefing: Briefing,
  missed: z.array(MissedItem),
  mail: z.array(MailItem),
  messages: z.array(MessageItem),
  calendar: z.array(CalendarEvent),
  updates: z.array(UpdateItem),
  alarms: z.array(Alarm),
  agents: z.array(AgentStatus),
  sources: z.array(SourceStatus),
});
export type Dashboard = z.infer<typeof Dashboard>;

export const PushRegistration = z.object({
  token: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/),
});

export const LoginInput = z.object({ token: z.string().min(1).max(512) });

export type ApiError = { error: { code: string; message: string } };

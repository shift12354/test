import {
  clock, priorityLabel, relativeTime, sourceLabel,
  type AgentId, type AgentStatus, type Briefing, type CalendarEvent, type MailItem,
  type MessageItem, type MissedItem, type SourceStatus, type UpdateItem, type Weather,
} from '@life/shared';
import type { ReactNode } from 'react';

export function Card({ title, count, className = '', action, children }: { title: string; count?: number; className?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`card ${className}`} aria-label={title}>
      <header className="card-head">
        <h2>{title}{count !== undefined && <span className="count">{count}</span>}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;

/** Åpner kun http(s)-lenker, og alltid uten referrer. */
function Ext({ href, children }: { href?: string; children: ReactNode }) {
  if (!href || !/^https?:\/\//i.test(href)) return <>{children}</>;
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

const Dot = ({ p }: { p: 'high' | 'medium' | 'low' }) => <span className={`badge ${p}`}>{priorityLabel[p]}</span>;
const Src = ({ s }: { s: string }) => <span className="src">{sourceLabel[s] ?? s}</span>;

const WEATHER_ICON: [string, string][] = [['thunder', '⛈️'], ['snow', '🌨️'], ['sleet', '🌨️'], ['rain', '🌧️'], ['fog', '🌫️'], ['cloudy', '☁️'], ['partly', '⛅'], ['fair', '🌤️'], ['clear', '☀️']];
const weatherIcon = (s: string) => WEATHER_ICON.find(([k]) => s.includes(k))?.[1] ?? '🌡️';

export function BriefingCard({ b }: { b: Briefing }) {
  return (
    <Card title="Morgenbrief" className="span-2 brief">
      <ul className="brief-lines">
        {b.lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
      <div className="stats">
        <Stat label="Uleste mail" value={b.counts.unreadMail} />
        <Stat label="Meldinger" value={b.counts.unreadMessages} />
        <Stat label="Avtaler i dag" value={b.counts.eventsToday} />
        <Stat label="Gått glipp av" value={b.counts.missed} tone={b.counts.missed ? 'high' : undefined} />
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'high' }) {
  return (
    <div className="stat">
      <span className={`stat-value ${tone ?? ''}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function WeatherCard({ w }: { w: Weather | null }) {
  return (
    <Card title="Vær">
      {!w ? <Empty>Ingen værdata</Empty> : (
        <div className="weather">
          <span className="weather-icon" aria-hidden>{weatherIcon(w.symbol)}</span>
          <div>
            <div className="temp">{w.temperature}°</div>
            <div className="muted">{w.description}, {w.place}</div>
            <div className="muted small">↑ {w.high}° ↓ {w.low}° · {w.precipitationMm} mm</div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function MissedCard({ items }: { items: MissedItem[] }) {
  return (
    <Card title="Gått glipp av" count={items.length} className="span-2">
      {items.length === 0 ? <Empty>Du har fått med deg alt ✨</Empty> : (
        <ul className="list">
          {items.map((m) => (
            <li key={m.id} className={`row prio-${m.priority}`}>
              <div className="row-main">
                <Ext href={m.url}><strong className="clamp">{m.title}</strong></Ext>
                <span className="muted small">{m.detail} · {m.reason}</span>
              </div>
              <div className="row-meta"><Dot p={m.priority} /><span className="muted small">{m.source} · {relativeTime(m.at)}</span></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function MailCard({ mail }: { mail: MailItem[] }) {
  const unread = mail.filter((m) => m.unread).length;
  return (
    <Card title="Innboks" count={unread}>
      {mail.length === 0 ? <Empty>Ingen mail</Empty> : (
        <ul className="list">
          {mail.slice(0, 8).map((m) => (
            <li key={m.id} className={`row ${m.unread ? 'unread' : ''}`}>
              <div className="row-main">
                <span className="small"><strong>{m.from.name || m.from.address}</strong> <Src s={m.source} /></span>
                <Ext href={m.url}><span className="clamp">{m.subject}</span></Ext>
                {m.reasons?.length ? <span className="muted small">{m.reasons.join(' · ')}</span> : null}
              </div>
              <div className="row-meta">{m.priority && m.priority !== 'low' && <Dot p={m.priority} />}<span className="muted small">{relativeTime(m.receivedAt)}</span></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function MessagesCard({ messages }: { messages: MessageItem[] }) {
  return (
    <Card title="Meldinger" count={messages.filter((m) => m.unread).length}>
      {messages.length === 0 ? <Empty>Ingen nye meldinger</Empty> : (
        <ul className="list">
          {messages.slice(0, 8).map((m) => (
            <li key={m.id} className={`row ${m.unread ? 'unread' : ''}`}>
              <div className="row-main">
                <span className="small"><strong>{m.from}</strong> i {m.channel} <Src s={m.source} /></span>
                <Ext href={m.url}><span className="clamp">{m.text}</span></Ext>
              </div>
              <div className="row-meta">{m.mentionsMe && <span className="badge high">@deg</span>}<span className="muted small">{relativeTime(m.sentAt)}</span></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function CalendarCard({ events }: { events: CalendarEvent[] }) {
  const now = Date.now();
  return (
    <Card title="I dag" count={events.length}>
      {events.length === 0 ? <Empty>Ingen avtaler i dag</Empty> : (
        <ol className="timeline">
          {events.map((e) => {
            const past = new Date(e.end).getTime() < now;
            const live = new Date(e.start).getTime() <= now && !past;
            return (
              <li key={e.id} className={past ? 'past' : live ? 'live' : ''}>
                <time>{e.allDay ? 'Hele dagen' : clock(e.start)}</time>
                <div>
                  <Ext href={e.url}><strong>{e.title}</strong></Ext>
                  <span className="muted small">{[e.location, sourceLabel[e.source]].filter(Boolean).join(' · ')}{live ? ' · pågår nå' : ''}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export function UpdatesCard({ updates }: { updates: UpdateItem[] }) {
  return (
    <Card title="Oppdateringer" count={updates.length}>
      {updates.length === 0 ? <Empty>Ingen oppdateringer</Empty> : (
        <ul className="list">
          {updates.slice(0, 8).map((u) => (
            <li key={u.id} className="row">
              <div className="row-main">
                <Ext href={u.url}><span className="clamp">{u.title}</span></Ext>
                <span className="muted small"><Src s={u.source} />{u.summary ? ` · ${u.summary}` : ''}</span>
              </div>
              <div className="row-meta"><span className="muted small">{relativeTime(u.publishedAt)}</span></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const STATUS_LABEL = { idle: 'Venter', running: 'Kjører …', ok: 'OK', error: 'Feil' } as const;

export function AgentsCard({ agents, onRun }: { agents: AgentStatus[]; onRun: (id: AgentId) => void }) {
  return (
    <Card title="Agenter" count={agents.length}>
      <ul className="list">
        {agents.map((a) => (
          <li key={a.id} className="row">
            <div className="row-main">
              <span><span className={`status-dot ${a.status}`} aria-label={STATUS_LABEL[a.status]} /> <strong>{a.name}</strong></span>
              <span className="muted small">{a.summary}</span>
            </div>
            <button className="btn ghost small" onClick={() => onRun(a.id)} disabled={a.status === 'running'} aria-label={`Kjør ${a.name}`}>Kjør</button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const MODE = { live: 'Tilkoblet', demo: 'Demo', error: 'Feil' } as const;

export function SourcesCard({ sources }: { sources: SourceStatus[] }) {
  const demo = sources.filter((s) => s.mode === 'demo').length;
  return (
    <Card title="Kilder">
      {demo > 0 && <p className="muted small">{demo} av {sources.length} kilder viser demo-data. Legg inn nøkler i <code>.env</code> for å koble til (se docs/API.md).</p>}
      <ul className="chips">
        {sources.map((s) => (
          <li key={s.id} className={`chip ${s.mode}`} title={s.error}>{s.name}: {MODE[s.mode]}</li>
        ))}
      </ul>
    </Card>
  );
}

import { DAY_NAMES_SHORT, describeDays, nextOccurrence, relativeTime, type Alarm, type AlarmInput, type Briefing } from '@life/shared';
import { useState, type FormEvent } from 'react';
import { Card } from './Cards';

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export function AlarmsCard({ alarms, onCreate, onUpdate, onDelete }: {
  alarms: Alarm[];
  onCreate: (a: AlarmInput) => Promise<void>;
  onUpdate: (id: string, a: AlarmInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [time, setTime] = useState('07:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [label, setLabel] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onCreate({ time, days, label, enabled: true, briefing: true });
    setAdding(false);
    setLabel('');
  }

  const toggleDay = (d: number) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]));
  return (
    <Card title="Alarmer" count={alarms.filter((a) => a.enabled).length}
      action={<button className="btn ghost small" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>{adding ? 'Avbryt' : '+ Ny'}</button>}>
      {adding && (
        <form className="alarm-form" onSubmit={submit}>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required aria-label="Tid" />
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Navn (valgfritt)" maxLength={60} aria-label="Navn" />
          <div className="days" role="group" aria-label="Dager">
            {WEEK.map((d) => (
              <button type="button" key={d} className={`day ${days.includes(d) ? 'on' : ''}`} aria-pressed={days.includes(d)} onClick={() => toggleDay(d)}>
                {DAY_NAMES_SHORT[d]}
              </button>
            ))}
          </div>
          <button className="btn primary">Lagre alarm</button>
        </form>
      )}
      <ul className="list">
        {alarms.map((a) => {
          const next = nextOccurrence(a);
          const { id, ...input } = a;
          return (
            <li key={id} className={`row alarm ${a.enabled ? '' : 'off'}`}>
              <div className="row-main">
                <span className="alarm-time">{a.time}</span>
                <span className="muted small">{[a.label, describeDays(a.days), next ? relativeTime(next.toISOString()) : null].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="row-meta">
                <label className="switch">
                  <input type="checkbox" checked={a.enabled} onChange={() => void onUpdate(id, { ...input, enabled: !a.enabled })} aria-label={`Alarm ${a.time} på/av`} />
                  <span aria-hidden />
                </label>
                <button className="btn ghost small" onClick={() => void onDelete(id)} aria-label={`Slett alarm ${a.time}`}>✕</button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function AlarmOverlay({ alarm, briefing, onStop, onSnooze }: { alarm: Alarm; briefing: Briefing | null; onStop: () => void; onSnooze: () => void }) {
  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-labelledby="alarm-title">
      <div className="overlay-inner">
        <p className="muted">{alarm.label || 'Alarm'}</p>
        <h1 id="alarm-title" className="big-time">{alarm.time}</h1>
        {alarm.briefing && briefing && (
          <div className="card">
            <h2>{briefing.greeting} ☀️</h2>
            <ul className="brief-lines">{briefing.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}
        <div className="overlay-actions">
          <button className="btn ghost" onClick={onSnooze}>Slumre 9 min</button>
          <button className="btn primary" onClick={onStop} autoFocus>Stopp</button>
        </div>
      </div>
    </div>
  );
}

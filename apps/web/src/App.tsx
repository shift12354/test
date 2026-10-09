import type { AgentId, AlarmInput, Dashboard } from '@life/shared';
import { useCallback, useEffect, useState } from 'react';
import { api, AuthError } from './api';
import { useAlarmClock } from './alarmClock';
import { AlarmOverlay, AlarmsCard } from './components/Alarms';
import {
  AgentsCard, BriefingCard, CalendarCard, MailCard, MessagesCard, MissedCard, SourcesCard, UpdatesCard, WeatherCard,
} from './components/Cards';
import { Login } from './components/Login';
import { applyTheme, loadThemePref, resolveTheme, saveThemePref, type ThemePref } from './theme';

const REFRESH_MS = 2 * 60_000;

export function App() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<ThemePref>(loadThemePref);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      setData(await api.dashboard(refresh));
      setAuthed(true);
      setError('');
    } catch (err) {
      if (err instanceof AuthError) setAuthed(false);
      else setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(tick);
    };
  }, [load]);

  useEffect(() => {
    applyTheme(resolveTheme(theme));
    saveThemePref(theme);
  }, [theme]);

  const alarm = useAlarmClock(data?.alarms ?? []);

  if (authed === false) return <Login onDone={() => void load()} />;
  if (!data) {
    return <main className="center" aria-busy="true"><p className="muted">{error || 'Laster dashboardet …'}</p></main>;
  }

  const mutate = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const nextTheme: Record<ThemePref, ThemePref> = { system: 'dark', dark: 'light', light: 'system' };
  const themeLabel = { system: 'Auto', dark: 'Mørk', light: 'Lys' }[theme];
  const b = data.briefing;

  return (
    <>
      <header className="top">
        <div>
          <p className="muted small">{now.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{b.greeting}</h1>
          {b.nextAlarm && <p className="muted small">⏰ Neste alarm {new Date(b.nextAlarm.at).toLocaleString('nb-NO', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
        <div className="top-actions">
          <span className="clock" aria-hidden>{now.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span>
          <button className="btn ghost small" onClick={() => void load(true)} disabled={loading} aria-label="Oppdater">{loading ? '…' : '↻'}</button>
          <button className="btn ghost small" onClick={() => setTheme(nextTheme[theme])} aria-label={`Tema: ${themeLabel}`}>{themeLabel}</button>
          {'Notification' in window && Notification.permission === 'default' && (
            <button className="btn ghost small" onClick={() => void Notification.requestPermission()}>Slå på varsler</button>
          )}
          <button className="btn ghost small" onClick={() => void api.logout().then(() => setAuthed(false))}>Logg ut</button>
        </div>
      </header>

      {error && <p className="error banner" role="alert">{error}</p>}

      <main className="grid">
        <BriefingCard b={b} />
        <WeatherCard w={b.weather} />
        <MissedCard items={data.missed} />
        <CalendarCard events={data.calendar} />
        <MailCard mail={data.mail} />
        <MessagesCard messages={data.messages} />
        <UpdatesCard updates={data.updates} />
        <AlarmsCard
          alarms={data.alarms}
          onCreate={(a: AlarmInput) => mutate(() => api.createAlarm(a))}
          onUpdate={(id, a) => mutate(() => api.updateAlarm(id, a))}
          onDelete={(id) => mutate(() => api.deleteAlarm(id))}
        />
        <AgentsCard agents={data.agents} onRun={(id: AgentId) => void mutate(() => api.runAgent(id))} />
        <SourcesCard sources={data.sources} />
      </main>

      {alarm.ringing && <AlarmOverlay alarm={alarm.ringing} briefing={b} onStop={alarm.stop} onSnooze={() => alarm.snooze()} />}
    </>
  );
}

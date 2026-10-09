import { nextAlarm, type Alarm } from '@life/shared';
import { useEffect, useRef, useState } from 'react';

/**
 * Vekkerklokke i nettleseren. Virker så lenge fanen er åpen.
 * Mobilappen bruker ekte planlagte varsler som går selv om appen er lukket.
 */
export function useAlarmClock(alarms: Alarm[]) {
  const [ringing, setRinging] = useState<Alarm | null>(null);
  const target = useRef<{ alarm: Alarm; at: number } | null>(null);
  const audio = useRef<{ ctx: AudioContext; timer: number } | null>(null);

  useEffect(() => {
    const n = nextAlarm(alarms);
    target.current = n ? { alarm: n.alarm, at: n.at.getTime() } : null;
  }, [alarms]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = target.current;
      if (!t || Date.now() < t.at) return;
      target.current = null;
      setRinging(t.alarm);
      startSound();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⏰ Alarm', { body: t.alarm.label || `Klokken er ${t.alarm.time}`, tag: 'ld-alarm' });
      }
      // Finn neste forekomst etter denne
      const n = nextAlarm(alarms, new Date(Date.now() + 61_000));
      target.current = n ? { alarm: n.alarm, at: n.at.getTime() } : null;
    }, 5000);
    return () => window.clearInterval(id);
  }, [alarms]);

  function startSound() {
    try {
      const ctx = new AudioContext();
      const beep = () => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.45);
      };
      beep();
      audio.current = { ctx, timer: window.setInterval(beep, 900) };
    } catch {
      /* lyd blokkert av nettleseren til brukeren har klikket på siden */
    }
  }

  function stop() {
    if (audio.current) {
      window.clearInterval(audio.current.timer);
      void audio.current.ctx.close();
      audio.current = null;
    }
    setRinging(null);
  }

  function snooze(minutes = 9) {
    const a = ringing;
    stop();
    if (a) target.current = { alarm: a, at: Date.now() + minutes * 60_000 };
  }

  /** Start alarmen nå (testknappen). Lyd krever et klikk, og det har vi her. */
  function ring(a: Alarm) {
    setRinging(a);
    startSound();
  }

  return { ringing, stop, snooze, ring };
}

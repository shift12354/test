import { clock, relativeTime, sourceLabel, type Dashboard } from '@life/shared';
import { View } from 'react-native';
import { useColors } from '../theme';
import { Card, Empty, openUrl, Row, T } from '../ui';

export function DayScreen({ d }: { d: Dashboard }) {
  const c = useColors();
  const w = d.briefing.weather;
  const now = Date.now();
  return (
    <>
      {w && (
        <Card title="Vær">
          <T bold style={{ fontSize: 44, lineHeight: 50 }}>{w.temperature}°</T>
          <T muted>{w.description}, {w.place} · ↑ {w.high}° ↓ {w.low}° · {w.precipitationMm} mm</T>
        </Card>
      )}
      <Card title="I dag" count={d.calendar.length}>
        {d.calendar.length === 0 ? <Empty>Ingen avtaler i dag</Empty> : d.calendar.map((e, i) => {
          const past = new Date(e.end).getTime() < now;
          const live = !past && new Date(e.start).getTime() <= now;
          return (
            <Row key={e.id} onPress={() => openUrl(e.url)} last={i === d.calendar.length - 1}>
              <T style={{ width: 56, color: live ? c.accent : c.textMuted, fontWeight: live ? '600' : '400' }}>{e.allDay ? 'Dag' : clock(e.start)}</T>
              <View style={{ flex: 1, opacity: past ? 0.5 : 1 }}>
                <T bold>{e.title}</T>
                <T muted small>{[e.location, sourceLabel[e.source], live ? 'pågår nå' : null].filter(Boolean).join(' · ')}</T>
              </View>
            </Row>
          );
        })}
      </Card>
      <Card title="Oppdateringer" count={d.updates.length}>
        {d.updates.length === 0 ? <Empty>Ingen oppdateringer</Empty> : d.updates.map((u, i) => (
          <Row key={u.id} onPress={() => openUrl(u.url)} last={i === d.updates.length - 1}>
            <View style={{ flex: 1 }}>
              <T lines={2}>{u.title}</T>
              <T muted small>{sourceLabel[u.source]}{u.summary ? ` · ${u.summary}` : ''}</T>
            </View>
            <T muted small>{relativeTime(u.publishedAt)}</T>
          </Row>
        ))}
      </Card>
    </>
  );
}

import { relativeTime, type Dashboard } from '@life/shared';
import { StyleSheet, View } from 'react-native';
import { useColors } from '../theme';
import { Badge, Card, Empty, openUrl, Row, T } from '../ui';

export function HomeScreen({ d }: { d: Dashboard }) {
  const c = useColors();
  const b = d.briefing;
  const stats = [
    ['Mail', b.counts.unreadMail], ['Meldinger', b.counts.unreadMessages], ['Avtaler', b.counts.eventsToday], ['Glipp', b.counts.missed],
  ] as const;
  return (
    <>
      <Card title="Morgenbrief">
        <View style={{ gap: 6 }}>
          {b.lines.map((l, i) => <T key={i}>– {l}</T>)}
        </View>
        <View style={st.stats}>
          {stats.map(([label, n]) => (
            <View key={label} style={[st.stat, { backgroundColor: c.surfaceRaised }]}>
              <T bold style={{ fontSize: 22, lineHeight: 28, color: label === 'Glipp' && n ? c.high : c.text }}>{n}</T>
              <T muted small>{label}</T>
            </View>
          ))}
        </View>
      </Card>
      <Card title="Gått glipp av" count={d.missed.length}>
        {d.missed.length === 0 ? <Empty>Du har fått med deg alt ✨</Empty> : d.missed.map((m, i) => (
          <Row key={m.id} accent={m.priority} onPress={() => openUrl(m.url)} last={i === d.missed.length - 1}>
            <View style={{ flex: 1, gap: 2 }}>
              <T bold lines={2}>{m.title}</T>
              <T muted small lines={1}>{m.detail} · {m.reason}</T>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge p={m.priority} />
              <T muted small>{relativeTime(m.at)}</T>
            </View>
          </Row>
        ))}
      </Card>
    </>
  );
}

const st = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: { flex: 1, borderRadius: 12, padding: 10 },
});

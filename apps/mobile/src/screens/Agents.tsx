import type { AgentId, Dashboard } from '@life/shared';
import { View } from 'react-native';
import { useColors } from '../theme';
import { Button, Card, Row, T } from '../ui';

const MODE = { live: 'Tilkoblet', demo: 'Demo', error: 'Feil' } as const;

export function AgentsScreen({ d, onRun, onLogout }: { d: Dashboard; onRun: (id: AgentId) => void; onLogout: () => void }) {
  const c = useColors();
  const dot = { idle: c.textMuted, running: c.medium, ok: c.low, error: c.high } as const;
  return (
    <>
      <Card title="Agenter" count={d.agents.length}>
        {d.agents.map((a, i) => (
          <Row key={a.id} last={i === d.agents.length - 1}>
            <View style={{ flex: 1, gap: 2 }}>
              <T bold><T style={{ color: dot[a.status] }}>● </T>{a.name}</T>
              <T muted small>{a.summary}</T>
            </View>
            <Button small title="Kjør" onPress={() => onRun(a.id)} disabled={a.status === 'running'} />
          </Row>
        ))}
      </Card>
      <Card title="Kilder">
        {d.sources.map((s, i) => (
          <Row key={s.id} last={i === d.sources.length - 1}>
            <T>{s.name}</T>
            <T small style={{ color: s.mode === 'live' ? c.low : s.mode === 'error' ? c.high : c.textMuted }}>{MODE[s.mode]}</T>
          </Row>
        ))}
      </Card>
      <Button title="Logg ut av denne enheten" onPress={onLogout} />
    </>
  );
}

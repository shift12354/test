import type { Briefing } from '@life/shared';
import { StyleSheet, View } from 'react-native';
import { useColors } from '../theme';
import { Button, Card, T } from '../ui';

export function RingingScreen({ briefing, onStop, onSnooze }: { briefing: Briefing | null; onStop: () => void; onSnooze: () => void }) {
  const c = useColors();
  const now = new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[st.wrap, { backgroundColor: c.bg }]} accessibilityViewIsModal>
      <T bold style={{ fontSize: 88, lineHeight: 96, textAlign: 'center', letterSpacing: -3 }}>{now}</T>
      {briefing && (
        <Card title={briefing.greeting}>
          <View style={{ gap: 6 }}>{briefing.lines.map((l, i) => <T key={i}>– {l}</T>)}</View>
        </Card>
      )}
      <View style={st.actions}>
        <View style={{ flex: 1 }}><Button title="Slumre 9 min" onPress={onSnooze} /></View>
        <View style={{ flex: 1 }}><Button primary title="Stopp" onPress={onStop} /></View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 16, justifyContent: 'center', gap: 16, zIndex: 10 },
  actions: { flexDirection: 'row', gap: 12 },
});

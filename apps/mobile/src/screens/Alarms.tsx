import { DAY_NAMES_SHORT, describeDays, nextOccurrence, radius, relativeTime, type Alarm, type AlarmInput } from '@life/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useColors } from '../theme';
import { Button, Card, Row, T } from '../ui';

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export function AlarmsScreen({ alarms, onCreate, onUpdate, onDelete }: {
  alarms: Alarm[];
  onCreate: (a: AlarmInput) => void;
  onUpdate: (id: string, a: AlarmInput) => void;
  onDelete: (id: string) => void;
}) {
  const c = useColors();
  const [adding, setAdding] = useState(false);
  const [time, setTime] = useState('07:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [label, setLabel] = useState('');
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  const input = [st.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }];
  return (
    <Card title="Alarmer" right={<Button small title={adding ? 'Avbryt' : '+ Ny'} onPress={() => setAdding(!adding)} />}>
      {adding && (
        <View style={{ gap: 10, marginBottom: 16 }}>
          <TextInput style={[input, { fontSize: 32, fontWeight: '600' }]} value={time} onChangeText={setTime} placeholder="07:00" placeholderTextColor={c.textMuted} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel="Tid (TT:MM)" />
          <TextInput style={input} value={label} onChangeText={setLabel} placeholder="Navn (valgfritt)" placeholderTextColor={c.textMuted} maxLength={60} accessibilityLabel="Navn" />
          <View style={st.days}>
            {WEEK.map((d) => {
              const on = days.includes(d);
              return (
                <Pressable key={d} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                  style={[st.day, { borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accent : 'transparent' }]}>
                  <T small style={{ color: on ? c.accentText : c.textMuted }}>{DAY_NAMES_SHORT[d]}</T>
                </Pressable>
              );
            })}
          </View>
          <Button primary title="Lagre alarm" disabled={!valid} onPress={() => { onCreate({ time, days, label, enabled: true, briefing: true }); setAdding(false); setLabel(''); }} />
        </View>
      )}
      {alarms.map((a, i) => {
        const { id, ...rest } = a;
        const next = nextOccurrence(a);
        return (
          <Row key={id} last={i === alarms.length - 1}>
            <Pressable style={{ flex: 1 }} onLongPress={() => onDelete(id)} accessibilityHint="Hold inne for å slette">
              <T bold muted={!a.enabled} style={{ fontSize: 34, lineHeight: 40 }}>{a.time}</T>
              <T muted small>{[a.label, describeDays(a.days), next ? relativeTime(next.toISOString()) : null].filter(Boolean).join(' · ')}</T>
            </Pressable>
            <Switch value={a.enabled} onValueChange={(v) => onUpdate(id, { ...rest, enabled: v })} trackColor={{ true: c.accent, false: c.surfaceRaised }} accessibilityLabel={`Alarm ${a.time}`} />
          </Row>
        );
      })}
      <T muted small style={{ marginTop: 8 }}>Hold inne en alarm for å slette den.</T>
    </Card>
  );
}

const st = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: radius.md, minHeight: 48, paddingHorizontal: 12, fontSize: 16 },
  days: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  day: { minWidth: 42, minHeight: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

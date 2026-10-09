import { font, priorityLabel, radius, space, type Priority } from '@life/shared';
import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { useColors } from './theme';

export function Card({ title, count, right, children }: { title: string; count?: number; right?: ReactNode; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityLabel={title}>
      <View style={s.head}>
        <Text style={[s.title, { color: c.textMuted }]} accessibilityRole="header">
          {title.toUpperCase()}{count !== undefined ? `  ${count}` : ''}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function T({ children, muted, small, bold, style, lines }: { children: ReactNode; muted?: boolean; small?: boolean; bold?: boolean; style?: TextStyle; lines?: number }) {
  const c = useColors();
  return (
    <Text numberOfLines={lines} style={[{ color: muted ? c.textMuted : c.text, fontSize: small ? font.size.sm - 1 : font.size.md, fontWeight: bold ? '600' : '400', lineHeight: small ? 18 : 22 }, style]}>
      {children}
    </Text>
  );
}

export function Row({ children, accent, onPress, last }: { children: ReactNode; accent?: Priority; onPress?: () => void; last?: boolean }) {
  const c = useColors();
  const bar = accent ? { borderLeftWidth: 3, borderLeftColor: c[accent], paddingLeft: space.md } : null;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.row, { borderBottomColor: c.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 }, bar]}>
      {children}
    </Pressable>
  );
}

export function Badge({ p, label }: { p: Priority; label?: string }) {
  const c = useColors();
  return (
    <View style={[s.badge, { borderColor: c[p] }]}>
      <Text style={{ color: c[p], fontSize: 11, fontWeight: '600' }}>{label ?? priorityLabel[p]}</Text>
    </View>
  );
}

export function Button({ title, onPress, primary, disabled, small }: { title: string; onPress: () => void; primary?: boolean; disabled?: boolean; small?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: primary ? c.accent : c.surfaceRaised, borderColor: primary ? c.accent : c.border, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}
    >
      <Text style={{ color: primary ? c.accentText : c.text, fontWeight: '600', fontSize: small ? 13 : 16 }}>{title}</Text>
    </Pressable>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <T muted>{children}</T>;

/** Åpner kun https-lenker. */
export const openUrl = (url?: string) => {
  if (url && /^https:\/\//i.test(url)) void Linking.openURL(url);
};

const s = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: space.lg, marginBottom: space.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  title: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8 },
  row: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', gap: space.md, minHeight: 44, alignItems: 'center' },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1, alignSelf: 'flex-end' },
  btn: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 36, paddingHorizontal: space.md },
});

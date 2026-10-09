import { radius, space } from '@life/shared';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { createApi } from '../api';
import { saveSettings, validateUrl, type Settings } from '../storage';
import { useColors } from '../theme';
import { Button, T } from '../ui';

export function SetupScreen({ onDone }: { onDone: (s: Settings) => void }) {
  const c = useColors();
  const [url, setUrl] = useState('http://192.168.1.10:8787');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function connect() {
    setError('');
    const origin = validateUrl(url);
    if (!origin) return setError('Bruk https://, eller http:// kun mot en lokal adresse.');
    setBusy(true);
    try {
      const s = { url: origin, token: token.trim() };
      await createApi(s).dashboard();
      await saveSettings(s);
      onDone(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = [st.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.wrap}>
      <View style={[st.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <T bold style={{ fontSize: 24, lineHeight: 30 }}>Life Dashboard</T>
        <T muted>Koble til API-et ditt. Tilgangsnøkkelen lagres kryptert på enheten.</T>
        <TextInput style={input} value={url} onChangeText={setUrl} placeholder="https://dashboard.example.com" placeholderTextColor={c.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="url" accessibilityLabel="API-adresse" />
        <TextInput style={input} value={token} onChangeText={setToken} placeholder="Tilgangsnøkkel" placeholderTextColor={c.textMuted} secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel="Tilgangsnøkkel" />
        {error ? <T style={{ color: c.high }}>{error}</T> : null}
        <Button title={busy ? 'Kobler til …' : 'Koble til'} primary onPress={connect} disabled={busy || !token} />
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: space.lg },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: space.xl, gap: space.md },
  input: { borderWidth: 1, borderRadius: radius.md, minHeight: 48, paddingHorizontal: space.md, fontSize: 16 },
});

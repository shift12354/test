import { greetingFor, palette, space, type AgentId, type AlarmInput, type Briefing, type Dashboard } from '@life/shared';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthError, createApi, type Api } from './src/api';
import { getPushToken, scheduleAlarms, setupNotifications, snooze } from './src/notifications';
import { AgentsScreen } from './src/screens/Agents';
import { AlarmsScreen } from './src/screens/Alarms';
import { DayScreen } from './src/screens/Day';
import { HomeScreen } from './src/screens/Home';
import { InboxScreen } from './src/screens/Inbox';
import { RingingScreen } from './src/screens/Ringing';
import { SetupScreen } from './src/screens/Setup';
import { clearSettings, loadSettings, type Settings } from './src/storage';
import { ThemeContext } from './src/theme';
import { T } from './src/ui';

type Tab = 'hjem' | 'innboks' | 'dag' | 'alarmer' | 'agenter';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hjem', label: 'Hjem', icon: '☀︎' },
  { id: 'innboks', label: 'Innboks', icon: '✉︎' },
  { id: 'dag', label: 'I dag', icon: '◷' },
  { id: 'alarmer', label: 'Alarmer', icon: '⏰' },
  { id: 'agenter', label: 'Agenter', icon: '◎' },
];

export default function App() {
  // Mørkt er standard, lyst tema følger systemet.
  const scheme = useColorScheme();
  const colors = palette[scheme === 'light' ? 'light' : 'dark'];
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined);
  const [data, setData] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<Tab>('hjem');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [ringing, setRinging] = useState(false);
  const pushRegistered = useRef(false);

  const api: Api | null = useMemo(() => (settings ? createApi(settings) : null), [settings]);

  useEffect(() => {
    void loadSettings().then(setSettings);
    void setupNotifications();
  }, []);

  const load = useCallback(async (refresh = false) => {
    if (!api) return;
    try {
      const d = await api.dashboard(refresh);
      setData(d);
      setError('');
      await scheduleAlarms(d.alarms);
      if (!pushRegistered.current) {
        pushRegistered.current = true;
        const token = await getPushToken();
        if (token) await api.registerPush(token).catch(() => undefined);
      }
    } catch (e) {
      if (e instanceof AuthError) {
        await clearSettings();
        setSettings(null);
      }
      setError((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 2 * 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Når alarmen går (eller brukeren trykker på den): vis morgenbriefen i fullskjerm.
  useEffect(() => {
    const onAlarm = (n: Notifications.Notification) => {
      if (String(n.request.content.data?.kind ?? '').startsWith('alarm')) {
        setRinging(true);
        void load(true);
      }
    };
    const rec = Notifications.addNotificationReceivedListener(onAlarm);
    const resp = Notifications.addNotificationResponseReceivedListener((r) => {
      if (r.actionIdentifier === 'snooze') return void snooze();
      onAlarm(r.notification);
      if (r.notification.request.content.data?.screen === 'glipp') setTab('hjem');
    });
    return () => {
      rec.remove();
      resp.remove();
    };
  }, [load]);

  const mutate = (fn: (a: Api) => Promise<unknown>) => api && void fn(api).then(() => load()).catch((e: Error) => setError(e.message));

  const briefing: Briefing | null = data?.briefing ?? null;

  return (
    <ThemeContext.Provider value={colors}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
        <SafeAreaView style={[st.root, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
          {settings === undefined ? null : settings === null ? (
            <SetupScreen onDone={setSettings} />
          ) : (
            <>
              <View style={st.header}>
                <T muted small>{new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</T>
                <T bold style={{ fontSize: 28, lineHeight: 34 }}>{briefing?.greeting ?? greetingFor(new Date())}</T>
                {error ? <T small style={{ color: colors.high }}>{error}</T> : null}
              </View>
              <ScrollView
                contentContainerStyle={st.content}
                refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.textMuted} onRefresh={async () => { setRefreshing(true); await load(true); setRefreshing(false); }} />}
              >
                {!data ? <T muted>Laster …</T> : (
                  <>
                    {tab === 'hjem' && <HomeScreen d={data} />}
                    {tab === 'innboks' && <InboxScreen d={data} />}
                    {tab === 'dag' && <DayScreen d={data} />}
                    {tab === 'alarmer' && (
                      <AlarmsScreen
                        alarms={data.alarms}
                        onCreate={(a: AlarmInput) => mutate((x) => x.createAlarm(a))}
                        onUpdate={(id, a) => mutate((x) => x.updateAlarm(id, a))}
                        onDelete={(id) => mutate((x) => x.deleteAlarm(id))}
                      />
                    )}
                    {tab === 'agenter' && (
                      <AgentsScreen d={data} onRun={(id: AgentId) => mutate((x) => x.runAgent(id))}
                        onLogout={async () => { await clearSettings(); setData(null); setSettings(null); }} />
                    )}
                  </>
                )}
              </ScrollView>
              <SafeAreaView edges={['bottom']} style={[st.tabbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <Pressable key={t.id} onPress={() => setTab(t.id)} style={st.tab} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={t.label}>
                      <Text style={{ fontSize: 20, color: active ? colors.accent : colors.textMuted }}>{t.icon}</Text>
                      <Text style={{ fontSize: 11, color: active ? colors.accent : colors.textMuted, fontWeight: active ? '600' : '400' }}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </SafeAreaView>
              {ringing && <RingingScreen briefing={briefing} onStop={() => setRinging(false)} onSnooze={() => { setRinging(false); void snooze(); }} />}
            </>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  tabbar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, minHeight: 56, justifyContent: 'center', gap: 2 },
});

import { nextOccurrence, type Alarm } from '@life/shared';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const ALARM_CHANNEL = 'alarm';
export const ALARM_CATEGORY = 'alarm';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
      name: 'Alarmer',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 300, 500, 300, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
    await Notifications.setNotificationChannelAsync('varsler', {
      name: 'Varsler',
      importance: Notifications.AndroidImportance.HIGH,
      // Skjul innholdet på låseskjermen
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY, [
    { identifier: 'snooze', buttonTitle: 'Slumre 9 min' },
    { identifier: 'stop', buttonTitle: 'Stopp', options: { opensAppToForeground: true } },
  ]);
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status === 'granted';
}

/**
 * Planlegger alle alarmer som lokale varsler, så de går selv om appen er lukket.
 * Expo bruker ukedag 1 = søndag … 7 = lørdag. Vi bruker 0 = søndag.
 */
export async function scheduleAlarms(alarms: Alarm[]): Promise<number> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing.filter((n) => n.content.data?.kind === 'alarm').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  let count = 0;
  for (const a of alarms.filter((x) => x.enabled)) {
    const [hour, minute] = a.time.split(':').map(Number) as [number, number];
    const content: Notifications.NotificationContentInput = {
      title: `⏰ ${a.time}${a.label ? ` · ${a.label}` : ''}`,
      body: a.briefing ? 'God morgen! Trykk for morgenbriefen.' : 'Alarm',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: ALARM_CATEGORY,
      interruptionLevel: 'timeSensitive',
      data: { kind: 'alarm', alarmId: a.id },
    };
    if (a.days.length === 0) {
      const at = nextOccurrence(a);
      if (!at) continue;
      await Notifications.scheduleNotificationAsync({
        content, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: ALARM_CHANNEL },
      });
      count++;
    } else {
      for (const d of a.days) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: d + 1, hour, minute, channelId: ALARM_CHANNEL },
        });
        count++;
      }
    }
  }
  return count;
}

export async function snooze(minutes = 9): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: '⏰ Slumring ferdig', body: 'På tide å stå opp!', sound: 'default', categoryIdentifier: ALARM_CATEGORY, data: { kind: 'alarm-snooze' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60, channelId: ALARM_CHANNEL },
  });
}

/** Expo push-token for varsler gjennom dagen. Krever fysisk enhet og et EAS-prosjekt. */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

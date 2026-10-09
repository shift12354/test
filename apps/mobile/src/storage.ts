import { validateApiUrl } from '@life/shared';
import * as SecureStore from 'expo-secure-store';

/** Tokenet lagres kryptert i Keychain (iOS) / Keystore (Android), aldri i AsyncStorage. */
const KEYS = { url: 'ld_api_url', token: 'ld_token' } as const;

export type Settings = { url: string; token: string };

export async function loadSettings(): Promise<Settings | null> {
  const [url, token] = await Promise.all([SecureStore.getItemAsync(KEYS.url), SecureStore.getItemAsync(KEYS.token)]);
  return url && token ? { url, token } : null;
}

export async function saveSettings(s: Settings): Promise<void> {
  await SecureStore.setItemAsync(KEYS.url, s.url);
  await SecureStore.setItemAsync(KEYS.token, s.token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function clearSettings(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(KEYS.url), SecureStore.deleteItemAsync(KEYS.token)]);
}

/** Tillater http kun mot lokale adresser (utvikling). Alt annet må være https. Se validateApiUrl i @life/shared. */
export const validateUrl = validateApiUrl;

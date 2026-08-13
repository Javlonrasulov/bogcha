import Constants from 'expo-constants';

/**
 * API manzili. Emulyatorda `localhost` ilovaning o'zini ko'rsatadi, shuning
 * uchun ishlab chiqishda Metro xosti (LAN IP) avtomatik olinadi.
 */
function resolveApiUrl(): string {
  const configured =
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    'http://localhost:4000/api/v1';

  if (!configured.includes('localhost')) return configured;

  const debuggerHost =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? null;
  const lanHost = debuggerHost?.split(':')[0];

  return lanHost ? configured.replace('localhost', lanHost) : configured;
}

export const API_URL = resolveApiUrl();

export const APP_VERSION = Constants.expoConfig?.version ?? '0.1.0';

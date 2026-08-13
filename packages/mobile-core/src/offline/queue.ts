import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient, ApiError } from '../api/client';

/**
 * Offline navbat (TZ §41).
 *
 * Internet bo'lmasa davomat qurilmada saqlanadi va ulanish qaytganda serverga
 * yuboriladi. Har bir element `idempotencyKey` bilan yuboriladi, shuning uchun
 * takroriy yuborish serverda dublikat yaratmaydi.
 *
 * Konflikt yechimi: kalit `groupId:date` bo'yicha bitta element saqlanadi —
 * bir kunni bir necha marta belgilash navbatda oxirgi holatni qoldiradi
 * (last-write-wins), server tomonida esa `clientRecordedAt` bilan taqqoslanadi.
 */

const STORAGE_KEY = 'bogcha.offlineQueue';
const MAX_ATTEMPTS = 6;

export interface QueuedRequest<TBody = unknown> {
  /** `groupId:date` kabi mantiqiy kalit — bir xil kalitli element ustiga yoziladi. */
  key: string;
  path: string;
  method: 'POST' | 'PATCH';
  body: TBody;
  idempotencyKey: string;
  /** Qurilmada belgilangan vaqt — serverdagi konflikt yechimi uchun. */
  clientRecordedAt: string;
  attempts: number;
  lastError?: string;
}

export interface FlushResult {
  sent: number;
  failed: number;
  /** Navbatda qolgan elementlar soni. */
  pending: number;
}

async function readQueue(): Promise<QueuedRequest[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedRequest[]) : [];
  } catch {
    // Buzilgan ma'lumot ilovani to'xtatmasligi kerak.
    await AsyncStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

async function writeQueue(queue: readonly QueuedRequest[]): Promise<void> {
  if (queue.length === 0) return AsyncStorage.removeItem(STORAGE_KEY);
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function queueSize(): Promise<number> {
  return (await readQueue()).length;
}

export async function listQueue(): Promise<QueuedRequest[]> {
  return readQueue();
}

/** Navbatga qo'shadi; bir xil `key` bo'lsa eski elementni almashtiradi. */
export async function enqueue(
  item: Omit<QueuedRequest, 'attempts' | 'lastError'>,
): Promise<QueuedRequest[]> {
  const queue = await readQueue();
  const next = [...queue.filter((entry) => entry.key !== item.key), { ...item, attempts: 0 }];
  await writeQueue(next);
  return next;
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Navbatni serverga yuboradi. Tarmoq yo'q bo'lsa darhol to'xtaydi — qolgan
 * elementlar keyingi urinishga saqlanadi. Serverdan mazmunli xato kelsa
 * (4xx) element o'chiriladi, chunki qayta yuborish natija bermaydi.
 */
export async function flushQueue(api: ApiClient): Promise<FlushResult> {
  const queue = await readQueue();
  if (queue.length === 0) return { sent: 0, failed: 0, pending: 0 };

  const remaining: QueuedRequest[] = [];
  let sent = 0;
  let failed = 0;
  let offline = false;

  for (const item of queue) {
    if (offline) {
      remaining.push(item);
      continue;
    }

    try {
      await api.request(item.path, {
        method: item.method,
        body: {
          ...(item.body as Record<string, unknown>),
          idempotencyKey: item.idempotencyKey,
          clientRecordedAt: item.clientRecordedAt,
        },
      });
      sent += 1;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;

      if (apiError?.isOffline) {
        // Tarmoq yo'q — qolgan elementlarni ham urinmaymiz.
        offline = true;
        remaining.push(item);
        continue;
      }

      const attempts = item.attempts + 1;
      const permanent = apiError !== null && apiError.status >= 400 && apiError.status < 500;

      if (permanent || attempts >= MAX_ATTEMPTS) {
        failed += 1;
        continue;
      }
      remaining.push({ ...item, attempts, lastError: apiError?.message });
    }
  }

  await writeQueue(remaining);
  return { sent, failed, pending: remaining.length };
}

/** Takrorlanmaydigan idempotentlik kaliti: qurilma + mantiqiy kalit + vaqt. */
export function buildIdempotencyKey(deviceId: string, key: string): string {
  return `${deviceId}:${key}:${Date.now().toString(36)}`;
}

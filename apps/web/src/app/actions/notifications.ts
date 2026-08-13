'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '../../lib/api';
import type { ActionResult } from './attendance';

/** Bitta bildirishnomani o'qilgan deb belgilash (TZ §30). */
export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/notifications/${id}/read`, { method: 'POST', body: {} });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/notifications');
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    await apiFetch('/notifications/read-all', { method: 'POST', body: {} });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/notifications');
  return { ok: true };
}

'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '../../lib/api';
import type { ActionResult } from './attendance';

/** Parolni o'zgartirish (TZ §40). */
export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  try {
    await apiFetch('/auth/change-password', { method: 'POST', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/profile');
  return { ok: true };
}

/** Barcha qurilmalardan chiqish — parol o'g'irlangan deb gumon qilinsa. */
export async function logoutAllDevicesAction(): Promise<ActionResult> {
  try {
    await apiFetch('/auth/logout-all', { method: 'POST', body: {} });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  return { ok: true };
}

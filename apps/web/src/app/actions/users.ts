'use server';

import { revalidatePath } from 'next/cache';
import type { Locale, Role } from '@bogcha/shared';
import { ApiError, apiFetch } from '../../lib/api';
import type { ActionResult } from './attendance';

export interface UserFormInput {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
  roles: Role[];
  branchIds: string[];
  groupIds: string[];
  locale?: Locale;
  isActive?: boolean;
}

/** Yangi foydalanuvchi (TZ §3). */
export async function createUserAction(input: UserFormInput): Promise<ActionResult> {
  try {
    await apiFetch('/users', {
      method: 'POST',
      body: {
        ...input,
        ...(input.email ? { email: input.email } : {}),
      },
    });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/users');
  return { ok: true };
}

export async function updateUserAction(
  id: string,
  input: Partial<UserFormInput>,
): Promise<ActionResult> {
  try {
    await apiFetch(`/users/${id}`, { method: 'PATCH', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/users');
  return { ok: true };
}

export async function resetUserPasswordAction(
  id: string,
  newPassword: string,
): Promise<ActionResult> {
  try {
    await apiFetch(`/users/${id}/reset-password`, { method: 'POST', body: { newPassword } });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/users');
  return { ok: true };
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/users');
  return { ok: true };
}

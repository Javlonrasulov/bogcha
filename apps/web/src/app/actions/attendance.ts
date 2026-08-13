'use server';

import { revalidatePath } from 'next/cache';
import { markAttendanceSchema, type AttendanceStatus } from '@bogcha/shared';
import { ApiError, apiFetch } from '../../lib/api';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface AttendanceEntryPayload {
  childId: string;
  status: AttendanceStatus;
  arrivedAt?: string;
  leftAt?: string;
  note?: string;
}

/** Guruh davomatini saqlash (TZ §8). */
export async function markAttendanceAction(input: {
  groupId: string;
  date: string;
  entries: AttendanceEntryPayload[];
  idempotencyKey?: string;
}): Promise<ActionResult> {
  const parsed = markAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validatsiya xatosi' };
  }

  try {
    await apiFetch('/attendance', { method: 'POST', body: parsed.data });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/attendance');
  revalidatePath('/');
  return { ok: true };
}

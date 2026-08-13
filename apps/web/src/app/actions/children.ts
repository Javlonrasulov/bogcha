'use server';

import { revalidatePath } from 'next/cache';
import { createChildSchema, type CreateChildInput } from '@bogcha/shared';
import { ApiError, apiFetch } from '../../lib/api';
import type { ActionResult } from './attendance';

export type CreateChildResult = ActionResult & { id?: string };

/** Yangi bola qabul qilish (TZ §6). */
export async function createChildAction(input: CreateChildInput): Promise<CreateChildResult> {
  const parsed = createChildSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validatsiya xatosi' };
  }

  try {
    const child = await apiFetch<{ id: string }>('/children', {
      method: 'POST',
      body: parsed.data,
    });
    revalidatePath('/children');
    revalidatePath('/');
    return { ok: true, id: child.id };
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }
}

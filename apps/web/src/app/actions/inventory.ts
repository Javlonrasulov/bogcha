'use server';

import { revalidatePath } from 'next/cache';
import { StockMovementType } from '@bogcha/shared';
import { ApiError, apiFetch } from '../../lib/api';
import type { ActionResult } from './attendance';

/** Qo'lda kirim/chiqim — sabab bilan, auditga yoziladi (TZ §13). */
export async function createMovementAction(input: {
  branchId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  date: string;
  unitCost?: number;
  supplierId?: string;
  reason?: string;
  documentNumber?: string;
}): Promise<ActionResult> {
  if (!(input.quantity > 0)) return { ok: false, error: "Miqdor 0 dan katta bo'lishi kerak" };

  try {
    await apiFetch('/stock/movements', { method: 'POST', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/inventory');
  revalidatePath('/');
  return { ok: true };
}

/** Inventarizatsiya: haqiqiy qoldiqni kiritish. */
export async function adjustStockAction(input: {
  branchId: string;
  productId: string;
  countedQuantity: number;
  date: string;
  reason: string;
}): Promise<ActionResult> {
  if (input.reason.trim().length < 5) {
    return { ok: false, error: "Sabab kamida 5 belgidan iborat bo'lishi kerak" };
  }

  try {
    await apiFetch('/stock/adjust', {
      method: 'POST',
      body: { ...input, type: StockMovementType.ADJUSTMENT },
    });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/inventory');
  revalidatePath('/');
  return { ok: true };
}

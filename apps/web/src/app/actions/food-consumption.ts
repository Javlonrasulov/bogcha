'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '../../lib/api';
import type { ActionResult } from './attendance';

export async function createProductNormAction(input: {
  branchId: string;
  productId: string;
  quantityPerChild: number;
  unit: string;
  effectiveFrom: string;
  note?: string;
}): Promise<ActionResult> {
  if (!(input.quantityPerChild > 0)) {
    return { ok: false, error: "Me'yor 0 dan katta bo'lishi kerak" };
  }

  try {
    await apiFetch('/food-consumption/norms', { method: 'POST', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/food-consumption');
  return { ok: true };
}

export async function upsertFoodActualAction(input: {
  branchId: string;
  date: string;
  lines: { productId: string; actualQuantity: number }[];
}): Promise<ActionResult> {
  try {
    await apiFetch('/food-consumption/actual', { method: 'POST', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/food-consumption');
  return { ok: true };
}

export async function upsertFoodStockCheckAction(input: {
  branchId: string;
  checkDate: string;
  lines: { productId: string; countedQuantity: number; note?: string }[];
}): Promise<ActionResult> {
  try {
    await apiFetch('/food-consumption/stock-check', { method: 'POST', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/food-consumption');
  return { ok: true };
}

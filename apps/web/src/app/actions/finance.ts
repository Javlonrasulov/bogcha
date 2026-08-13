'use server';

import { revalidatePath } from 'next/cache';
import { PaymentMethod } from '@bogcha/shared';
import { ApiError, apiFetch } from '../../lib/api';
import type { ActionResult } from './attendance';

/** Xarajat kiritish (TZ §17). */
export async function createExpenseAction(input: {
  branchId: string;
  categoryId: string;
  amount: number;
  date: string;
  description?: string;
  paymentMethod: PaymentMethod;
}): Promise<ActionResult> {
  if (!(input.amount > 0)) return { ok: false, error: "Summa 0 dan katta bo'lishi kerak" };

  try {
    await apiFetch('/expenses', { method: 'POST', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/expenses');
  revalidatePath('/');
  return { ok: true };
}

/** Daromad kiritish. */
export async function createIncomeAction(input: {
  branchId: string;
  categoryId: string;
  amount: number;
  date: string;
  description?: string;
  paymentMethod: PaymentMethod;
}): Promise<ActionResult> {
  if (!(input.amount > 0)) return { ok: false, error: "Summa 0 dan katta bo'lishi kerak" };

  try {
    await apiFetch('/incomes', { method: 'POST', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/incomes');
  revalidatePath('/');
  return { ok: true };
}

/** Bola to'lovini qabul qilish — eng qadimgi qarzdan yopiladi (TZ §18). */
export async function recordPaymentAction(input: {
  childId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  invoiceId?: string;
  receiptNumber?: string;
  note?: string;
}): Promise<ActionResult> {
  if (!(input.amount > 0)) return { ok: false, error: "Summa 0 dan katta bo'lishi kerak" };

  try {
    await apiFetch('/payments', { method: 'POST', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/payments');
  revalidatePath('/debts');
  revalidatePath('/');
  return { ok: true };
}

/** Oylik hisob-fakturalarni yaratish. */
export async function generateInvoicesAction(input: {
  period: string;
  branchId?: string;
  dueDay: number;
}): Promise<ActionResult> {
  try {
    await apiFetch('/invoices/generate', { method: 'POST', body: input });
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : 'Server xatosi' };
  }

  revalidatePath('/payments');
  revalidatePath('/debts');
  return { ok: true };
}

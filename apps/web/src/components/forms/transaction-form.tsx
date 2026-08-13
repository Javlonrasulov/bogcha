'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { PaymentMethod } from '@bogcha/shared';
import { createExpenseAction, createIncomeAction } from '../../app/actions/finance';
import { useAppDataOptional } from '../../lib/app-data';
import { useT } from '../../i18n/client';
import { cn, todayIso } from '../../lib/utils';
import { inputClass } from '../ui/filters';

interface Option {
  id: string;
  name: string;
}

/**
 * Daromad/xarajat kiritish paneli. Sahifa ichida ochiladi — ortiqcha modal
 * ishlatilmaydi (TZ §34).
 */
export function TransactionForm({
  kind,
  branches,
  categories,
  defaultBranchId,
  label,
}: {
  kind: 'EXPENSE' | 'INCOME';
  branches: Option[];
  categories: Option[];
  defaultBranchId: string | null;
  label: string;
}) {
  const t = useT();
  const router = useRouter();
  const appData = useAppDataOptional();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = () => {
    const value = Number(amount);
    if (!branchId || !categoryId || !(value > 0)) {
      setMessage({ ok: false, text: t.common.error });
      return;
    }

    startTransition(async () => {
      const payload = {
        branchId,
        categoryId,
        amount: value,
        date,
        paymentMethod: method,
        ...(description.trim() ? { description: description.trim() } : {}),
      };
      const result =
        kind === 'EXPENSE'
          ? await createExpenseAction(payload)
          : await createIncomeAction(payload);

      if (result.ok) {
        setMessage({ ok: true, text: t.common.saved });
        setAmount('');
        setDescription('');
        await appData?.refresh();
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error ?? t.common.error });
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={categories.length === 0 || branches.length === 0}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-brand px-4 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-all hover:brightness-105 disabled:opacity-60"
      >
        <Plus className="size-4" />
        {label}
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-soft lg:w-[34rem]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-content">{label}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid size-8 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
          aria-label={t.common.cancel}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.common.amount}
          </span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.common.date}
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.common.category}
          </span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={cn(inputClass, 'cursor-pointer')}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.finance.paymentMethod}
          </span>
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            className={cn(inputClass, 'cursor-pointer')}
          >
            {Object.values(PaymentMethod).map((value) => (
              <option key={value} value={value}>
                {t.finance.methods[value]}
              </option>
            ))}
          </select>
        </label>

        {branches.length > 1 ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-content-secondary">
              {t.common.branch}
            </span>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className={cn(inputClass, 'cursor-pointer')}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={cn('block', branches.length > 1 ? '' : 'sm:col-span-2')}>
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.common.description}
          </span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {message ? (
        <p className={cn('text-xs', message.ok ? 'text-success' : 'text-danger')}>{message.text}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-brand px-4 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-all disabled:opacity-60"
        >
          {pending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : null}
          {t.common.save}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-10 items-center rounded-xl px-3 text-sm text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Plus, X } from 'lucide-react';
import { StockMovementType } from '@bogcha/shared';
import { adjustStockAction, createMovementAction } from '../../actions/inventory';
import { useAppDataOptional } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { cn, todayIso } from '../../../lib/utils';
import { inputClass } from '../../../components/ui/filters';

interface ProductOption {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
}

type Mode = 'IN' | 'OUT' | 'ADJUSTMENT';

/**
 * Ombor kirim/chiqim va inventarizatsiya paneli. Modal emas — sahifa ichida
 * ochiladi, shunda kontekst yo'qolmaydi (TZ §34).
 */
export function MovementForm({
  branchId,
  products,
  units,
}: {
  branchId: string;
  products: ProductOption[];
  units: Record<string, string>;
}) {
  const t = useT();
  const router = useRouter();
  const appData = useAppDataOptional();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('IN');
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const product = products.find((item) => item.id === productId);

  const submit = () => {
    const amount = Number(quantity);
    if (!productId || !(amount > 0)) {
      setMessage({ ok: false, text: t.common.error });
      return;
    }

    startTransition(async () => {
      const result =
        mode === 'ADJUSTMENT'
          ? await adjustStockAction({
              branchId,
              productId,
              countedQuantity: amount,
              date,
              reason: reason.trim(),
            })
          : await createMovementAction({
              branchId,
              productId,
              type: mode === 'IN' ? StockMovementType.IN : StockMovementType.OUT,
              quantity: amount,
              date,
              ...(unitCost ? { unitCost: Number(unitCost) } : {}),
              ...(reason.trim() ? { reason: reason.trim() } : {}),
            });

      if (result.ok) {
        setMessage({ ok: true, text: t.common.saved });
        setQuantity('');
        setReason('');
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
        disabled={products.length === 0}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-brand px-4 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-all hover:brightness-105 disabled:opacity-60"
      >
        <Plus className="size-4" />
        {t.inventory.addMovement}
      </button>
    );
  }

  const MODES: Array<{ value: Mode; label: string; icon: React.ReactNode }> = [
    { value: 'IN', label: t.inventory.types.IN, icon: <ArrowDownToLine className="size-4" /> },
    { value: 'OUT', label: t.inventory.types.OUT, icon: <ArrowUpFromLine className="size-4" /> },
    {
      value: 'ADJUSTMENT',
      label: t.inventory.adjust,
      icon: <ClipboardCheck className="size-4" />,
    },
  ];

  return (
    <div className="w-full space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-soft lg:w-[34rem]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-all',
                mode === item.value
                  ? 'bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand/25'
                  : 'text-content-secondary hover:bg-surface-muted',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
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
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.common.product}
          </span>
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className={cn(inputClass, 'cursor-pointer')}
          >
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {mode === 'ADJUSTMENT' ? t.inventory.currentStock : t.common.quantity}
            {product ? ` (${units[product.unit] ?? product.unit})` : ''}
          </span>
          <input
            type="number"
            min={0}
            step="0.001"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={inputClass}
          />
        </label>

        {mode === 'IN' ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-content-secondary">
              {t.inventory.unitCost}
            </span>
            <input
              type="number"
              min={0}
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              placeholder={String(product?.unitCost ?? '')}
              className={inputClass}
            />
          </label>
        ) : (
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
        )}

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.common.reason}
            {mode === 'ADJUSTMENT' ? ' *' : ''}
          </span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t.audit.subtitle}
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

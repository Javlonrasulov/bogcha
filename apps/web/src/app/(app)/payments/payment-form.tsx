'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, X } from 'lucide-react';
import { PaymentMethod } from '@bogcha/shared';
import { recordPaymentAction } from '../../actions/finance';
import { useAppDataOptional } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { cn, formatMoney, todayIso } from '../../../lib/utils';
import { inputClass } from '../../../components/ui/filters';

interface ChildOption {
  id: string;
  fullName: string;
  groupName: string | null;
  debt: number;
  monthlyFee: number;
}

/** To'lov qabul qilish paneli: bola tanlanadi, summa avtomatik taklif qilinadi (TZ §18). */
export function PaymentForm({ options, label }: { options: ChildOption[]; label: string }) {
  const t = useT();
  const router = useRouter();
  const appData = useAppDataOptional();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [childId, setChildId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options.slice(0, 6);
    return options.filter((child) => child.fullName.toLowerCase().includes(needle)).slice(0, 6);
  }, [options, query]);

  const selected = options.find((child) => child.id === childId) ?? null;

  const pick = (child: ChildOption) => {
    setChildId(child.id);
    setQuery(child.fullName);
    setAmount(String(child.debt > 0 ? child.debt : child.monthlyFee));
  };

  const submit = () => {
    const value = Number(amount);
    if (!childId || !(value > 0)) {
      setMessage({ ok: false, text: t.common.error });
      return;
    }

    startTransition(async () => {
      const result = await recordPaymentAction({
        childId,
        amount: value,
        date,
        method,
        ...(note.trim() ? { note: note.trim() } : {}),
      });

      if (result.ok) {
        setMessage({ ok: true, text: t.common.saved });
        setAmount('');
        setNote('');
        setChildId(null);
        setQuery('');
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
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-brand px-4 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-all hover:brightness-105"
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setChildId(null);
          }}
          placeholder={t.children.searchPlaceholder}
          className={cn(inputClass, 'pl-9')}
        />
        {!childId && matches.length > 0 ? (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lifted">
            {matches.map((child) => (
              <li key={child.id}>
                <button
                  type="button"
                  onClick={() => pick(child)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm transition-colors hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-content">{child.fullName}</span>
                    <span className="block text-xs text-content-muted">
                      {child.groupName ?? t.children.noGroup}
                    </span>
                  </span>
                  {child.debt > 0 ? (
                    <span className="tabular shrink-0 text-xs font-medium text-danger">
                      {formatMoney(child.debt)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {selected ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-muted px-3.5 py-2.5 text-xs">
          <span className="text-content-secondary">
            {t.children.debt}:{' '}
            <span className={cn('tabular font-semibold', selected.debt > 0 ? 'text-danger' : 'text-success')}>
              {formatMoney(selected.debt)}
            </span>
          </span>
          <span className="text-content-secondary">
            {t.children.netFee}:{' '}
            <span className="tabular font-semibold text-content">
              {formatMoney(selected.monthlyFee)}
            </span>
          </span>
        </div>
      ) : null}

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
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.common.note}
          </span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
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
          disabled={pending || !childId}
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

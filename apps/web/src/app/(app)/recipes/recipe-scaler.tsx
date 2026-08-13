'use client';

import { useMemo, useState } from 'react';
import { Calculator, Minus, Plus } from 'lucide-react';
import { useT } from '../../../i18n/client';
import { formatMoney, formatNumber, formatQuantity } from '../../../lib/utils';

interface ScalerItem {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
}

/**
 * Retseptni kelgan bolalar soniga moslash (TZ §11). Hisob mijozda bajariladi —
 * oshpaz raqamni o'zgartirganda natija darhol ko'rinadi.
 */
export function RecipeScaler({
  baseHeadcount,
  items,
  wastePercent,
  units,
}: {
  recipeId: string;
  baseHeadcount: number;
  items: ScalerItem[];
  wastePercent: number;
  units: Record<string, string>;
}) {
  const t = useT();
  const [headcount, setHeadcount] = useState(baseHeadcount);

  const scaled = useMemo(() => {
    const factor = (headcount / baseHeadcount) * (1 + wastePercent / 100);
    const rows = items.map((item) => ({
      ...item,
      scaledQuantity: item.quantity * factor,
      cost: item.quantity * factor * item.unitCost,
    }));
    return { rows, total: rows.reduce((sum, row) => sum + row.cost, 0), factor };
  }, [headcount, baseHeadcount, items, wastePercent]);

  const step = (delta: number) =>
    setHeadcount((current) => Math.max(1, Math.min(10_000, current + delta)));

  return (
    <div className="rounded-2xl border border-line bg-surface-muted/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-content">
            <Calculator className="size-4 text-brand" />
            {t.recipes.scaleFor}
          </p>
          <p className="mt-0.5 text-xs text-content-muted">{t.recipes.scaleHint}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => step(-5)}
            className="grid size-9 place-items-center rounded-xl bg-surface text-content-secondary ring-1 ring-inset ring-line transition-colors hover:text-content"
            aria-label="-5"
          >
            <Minus className="size-4" />
          </button>
          <input
            type="number"
            min={1}
            max={10_000}
            value={headcount}
            onChange={(event) => setHeadcount(Math.max(1, Number(event.target.value) || 1))}
            className="tabular h-9 w-20 rounded-xl border border-line bg-surface px-2 text-center text-sm font-semibold text-content outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/15"
          />
          <button
            type="button"
            onClick={() => step(5)}
            className="grid size-9 place-items-center rounded-xl bg-surface text-content-secondary ring-1 ring-inset ring-line transition-colors hover:text-content"
            aria-label="+5"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line/60">
        {scaled.rows.map((row) => (
          <li key={row.productId} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="min-w-0 truncate text-content-secondary">{row.name}</span>
            <span className="flex shrink-0 items-center gap-4">
              <span className="tabular font-medium text-content">
                {formatQuantity(row.scaledQuantity, row.unit, units)}
              </span>
              <span className="tabular w-24 text-right text-content-muted">
                {formatMoney(row.cost)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-content-secondary">
          {formatNumber(headcount)} {t.children.title.toLowerCase()}
        </span>
        <span className="flex items-center gap-4">
          <span className="tabular font-semibold text-content">{formatMoney(scaled.total)}</span>
          <span className="tabular w-24 text-right text-content-muted">
            {formatMoney(scaled.total / headcount)}
          </span>
        </span>
      </div>
    </div>
  );
}

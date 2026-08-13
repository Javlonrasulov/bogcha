'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Package,
  Plus,
  Scale,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Permission, Unit, type FoodConsumptionReport } from '@bogcha/shared';
import { useAppData, useViewer } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import {
  buildQuery,
  formatDateNumeric,
  formatNumber,
  formatQuantity,
} from '../../../lib/utils';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { EmptyState } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { StatCard } from '../../../components/ui/stat-card';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { inputClass } from '../../../components/ui/filters';
import { ProductPicker } from './product-picker';
import { createProductNormAction } from '../../actions/food-consumption';
import { resolveFoodRange, type RangePreset } from './range';

type NormInputMode = 'weight' | 'volume' | 'single';

function normInputMode(unit: string | undefined): NormInputMode {
  if (unit === Unit.KG || unit === Unit.GRAM) return 'weight';
  if (unit === Unit.LITER || unit === Unit.MILLILITER) return 'volume';
  return 'single';
}

/** 1.35 kg → "1 kg 350 g"; 1.3 l → "1 litr 300 ml" */
function formatCompoundNorm(
  quantity: number,
  unit: string,
  unitLabels: Record<string, string>,
): string {
  if (!(quantity > 0)) return `0 ${unitLabels[unit] ?? unit}`;

  if (unit === Unit.KG || unit === Unit.GRAM) {
    const totalGrams = unit === Unit.KG ? Math.round(quantity * 1000) : Math.round(quantity);
    const kg = Math.floor(totalGrams / 1000);
    const gr = totalGrams % 1000;
    const parts: string[] = [];
    if (kg > 0) parts.push(`${kg} ${unitLabels.KG ?? 'kg'}`);
    if (gr > 0) parts.push(`${gr} ${unitLabels.GRAM ?? 'g'}`);
    return parts.join(' ') || `0 ${unitLabels.KG ?? 'kg'}`;
  }

  if (unit === Unit.LITER || unit === Unit.MILLILITER) {
    const totalMl = unit === Unit.LITER ? Math.round(quantity * 1000) : Math.round(quantity);
    const litr = Math.floor(totalMl / 1000);
    const ml = totalMl % 1000;
    const parts: string[] = [];
    if (litr > 0) parts.push(`${litr} ${unitLabels.LITER ?? 'litr'}`);
    if (ml > 0) parts.push(`${ml} ${unitLabels.MILLILITER ?? 'ml'}`);
    return parts.join(' ') || `0 ${unitLabels.LITER ?? 'litr'}`;
  }

  return `${formatQuantity(quantity)} ${unitLabels[unit] ?? unit}`;
}

function parseOptionalNumber(value: string): number {
  if (!value.trim()) return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function FoodConsumptionView() {
  const t = useT();
  const viewer = useViewer();
  const { data } = useAppData();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const preset = (searchParams.get('range') as RangePreset | null) ?? '7';
  const { from, to } = resolveFoodRange(preset, searchParams.get('from'), searchParams.get('to'));
  const dailyHref = `/food-consumption/daily${buildQuery({
    range: searchParams.get('range'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })}`;
  const branchId = data.branchId ?? viewer.requiredBranchId ?? '';
  const canManage =
    viewer.can(Permission.PRODUCT_MANAGE) ||
    viewer.can(Permission.RECIPE_MANAGE) ||
    viewer.can(Permission.STOCK_MANAGE);
  const units = t.products.units as unknown as Record<string, string>;

  const [report, setReport] = useState<FoodConsumptionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [normModalOpen, setNormModalOpen] = useState(false);
  const [normsOpen, setNormsOpen] = useState(false);

  const [normForm, setNormForm] = useState({
    productId: '',
    major: '',
    minor: '',
    note: '',
  });

  const warehouseProducts = useMemo(
    () =>
      [...data.products]
        .filter((product) => product.isActive !== false)
        .sort((a, b) => a.name.localeCompare(b.name, 'uz')),
    [data.products],
  );

  const selectedNormProduct = warehouseProducts.find((product) => product.id === normForm.productId);
  const inputMode = normInputMode(selectedNormProduct?.unit);

  async function reloadReport() {
    if (!branchId) return;
    const res = await fetch(
      `/api/food-consumption/report${buildQuery({ branchId, from, to })}`,
      { cache: 'no-store' },
    );
    const json = (await res.json()) as FoodConsumptionReport & { message?: string };
    if (!res.ok) throw new Error(json.message ?? t.common.error);
    setReport(json);
  }

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        await reloadReport();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t.common.error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, from, to, t.common.error]);

  function saveNorm() {
    if (!branchId || !normForm.productId || !selectedNormProduct) return;

    const major = parseOptionalNumber(normForm.major);
    const minor = parseOptionalNumber(normForm.minor);
    if (Number.isNaN(major) || Number.isNaN(minor)) {
      setToast({ ok: false, text: t.foodConsumption.invalidNorm });
      return;
    }

    const productUnit = selectedNormProduct.unit as Unit;
    let quantityPerChild = 0;
    let unit: Unit = productUnit;

    if (inputMode === 'weight') {
      const totalKg = major + minor / 1000;
      if (!(totalKg > 0)) {
        setToast({ ok: false, text: t.foodConsumption.invalidNorm });
        return;
      }
      // Ombordagi birlikka moslab saqlaymiz.
      if (productUnit === Unit.GRAM) {
        quantityPerChild = totalKg * 1000;
        unit = Unit.GRAM;
      } else {
        quantityPerChild = totalKg;
        unit = Unit.KG;
      }
    } else if (inputMode === 'volume') {
      const totalLitr = major + minor / 1000;
      if (!(totalLitr > 0)) {
        setToast({ ok: false, text: t.foodConsumption.invalidNorm });
        return;
      }
      if (productUnit === Unit.MILLILITER) {
        quantityPerChild = totalLitr * 1000;
        unit = Unit.MILLILITER;
      } else {
        quantityPerChild = totalLitr;
        unit = Unit.LITER;
      }
    } else {
      if (!(major > 0)) {
        setToast({ ok: false, text: t.foodConsumption.invalidNorm });
        return;
      }
      quantityPerChild = major;
      unit = productUnit;
    }

    startTransition(async () => {
      const result = await createProductNormAction({
        branchId,
        productId: normForm.productId,
        quantityPerChild,
        unit,
        effectiveFrom: from,
        note: normForm.note || undefined,
      });
      if (result.ok) {
        setNormForm({ productId: '', major: '', minor: '', note: '' });
        setNormModalOpen(false);
        setToast({ ok: true, text: t.foodConsumption.normAdded });
        try {
          await reloadReport();
        } catch {
          /* ignore */
        }
      } else {
        setToast({ ok: false, text: result.error ?? t.common.error });
      }
    });
  }

  function closeNormModal() {
    setNormModalOpen(false);
    setNormForm({ productId: '', major: '', minor: '', note: '' });
  }

  useEffect(() => {
    if (!normModalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNormModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [normModalOpen]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const presentTotal = report?.totals.presentCount ?? 0;
  const productCount = report?.products.length ?? 0;

  return (
    <>
      <PageHeader
        title={t.foodConsumption.title}
        subtitle={t.foodConsumption.subtitle}
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            {canManage ? (
              <button
                type="button"
                onClick={() => setNormModalOpen(true)}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-brand px-3 text-xs font-medium text-white shadow-[var(--shadow-glow)] transition-all hover:brightness-105 sm:gap-2 sm:px-4 sm:text-sm"
              >
                <Plus className="size-4 shrink-0" />
                <span className="truncate">{t.foodConsumption.addNorm}</span>
              </button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <Link
              href={dailyHref}
              className={`inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-medium text-content transition hover:border-brand/30 hover:bg-brand-soft/40 hover:text-brand sm:gap-2 sm:px-4 sm:text-sm ${
                canManage ? '' : 'col-span-2 sm:col-span-1'
              }`}
            >
              <CalendarDays className="size-4 shrink-0" />
              <span className="truncate">{t.foodConsumption.dailyTable}</span>
            </Link>
          </div>
        }
      />

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex justify-center px-4">
          <div
            className={`pointer-events-auto flex animate-[rise_0.35s_both] items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lifted ring-1 ${
              toast.ok
                ? 'bg-success-soft text-success ring-success/25'
                : 'bg-danger-soft text-danger ring-danger/25'
            }`}
          >
            {toast.ok ? <CheckCircle2 className="size-4 shrink-0" /> : null}
            {toast.text}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <StatCard
          label={t.foodConsumption.kpiPresent}
          value={formatNumber(presentTotal)}
          hint={`${formatDateNumeric(from)} — ${formatDateNumeric(to)}`}
          icon="attendance"
          tone="brand"
          className="p-3 sm:p-5"
        />
        <StatCard
          label={t.foodConsumption.kpiNormProducts}
          value={formatNumber(productCount)}
          hint={t.foodConsumption.kpiNormProductsHint}
          icon={<UtensilsCrossed className="size-5" />}
          tone="info"
          className="p-3 sm:p-5"
        />
        <StatCard
          label={t.foodConsumption.kpiCalculated}
          value={formatNumber(report?.days.filter((d) => d.presentCount > 0).length ?? 0)}
          hint={t.foodConsumption.kpiCalculatedHint}
          icon={<Package className="size-5" />}
          tone="accent"
          className="p-3 sm:p-5"
        />
        <StatCard
          label={t.foodConsumption.kpiExpected}
          value={formatNumber(productCount)}
          hint={t.foodConsumption.kpiExpectedHint}
          icon={<Scale className="size-5" />}
          tone="success"
          className="p-3 sm:p-5"
        />
      </div>

      <Card>
        <CardHeader
          title={t.foodConsumption.forecastTitle}
          subtitle={t.foodConsumption.forecastHint}
        />
        {!report?.stock.length ? (
          <EmptyState
            title={t.foodConsumption.noNorms}
            hint={t.foodConsumption.noNormsHint}
            icon={<Boxes className="size-5" />}
          />
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {report.stock.map((row) => {
                const unitLabel = units[row.unit] ?? row.unit;
                const product = report.products.find((item) => item.productId === row.productId);
                const normQty = product?.quantityPerChild ?? 0;
                return (
                  <article
                    key={row.productId}
                    className="rounded-2xl border border-line bg-surface-muted/30 p-3"
                  >
                    <h3 className="text-sm font-semibold text-content">{row.productName}</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                      <div>
                        <dt className="text-content-muted">
                          {t.foodConsumption.opening}
                          <span className="mt-0.5 block tabular">{formatDateNumeric(from)}</span>
                        </dt>
                        <dd className="mt-0.5 tabular font-medium text-content">
                          {formatQuantity(row.openingQuantity)} {unitLabel}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-content-muted">{t.foodConsumption.inbound}</dt>
                        <dd className="mt-0.5 tabular font-medium text-content">
                          {formatQuantity(row.inboundQuantity)} {unitLabel}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-content-muted">{t.foodConsumption.presentChildren}</dt>
                        <dd className="mt-0.5 tabular font-medium text-content">
                          {formatNumber(presentTotal)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-content-muted">{t.foodConsumption.perChild}</dt>
                        <dd className="mt-0.5 tabular font-medium text-content">
                          {formatCompoundNorm(normQty, product?.normUnit ?? row.unit, units)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-content-muted">{t.foodConsumption.calculatedSpend}</dt>
                        <dd className="mt-0.5 tabular font-medium text-content">
                          {formatQuantity(row.normConsumption)} {unitLabel}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-content-muted">
                          {t.foodConsumption.expected}
                          <span className="mt-0.5 block tabular">{formatDateNumeric(to)}</span>
                        </dt>
                        <dd className="mt-0.5 tabular font-semibold text-brand">
                          {formatQuantity(row.expectedByNorm)} {unitLabel}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <TableWrap className="min-w-0">
                <thead>
                  <tr>
                    <Th className="sticky left-0 z-20 min-w-[9rem] bg-surface-muted/95">
                      {t.common.product}
                    </Th>
                    <Th align="right">
                      <span className="block">{t.foodConsumption.opening}</span>
                      <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-content-muted">
                        {formatDateNumeric(from)}
                      </span>
                    </Th>
                    <Th align="right">{t.foodConsumption.inbound}</Th>
                    <Th align="right">{t.foodConsumption.presentChildren}</Th>
                    <Th align="right">{t.foodConsumption.perChild}</Th>
                    <Th align="right">{t.foodConsumption.calculatedSpend}</Th>
                    <Th align="right">
                      <span className="block">{t.foodConsumption.expected}</span>
                      <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-content-muted">
                        {formatDateNumeric(to)}
                      </span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {report.stock.map((row) => {
                    const unitLabel = units[row.unit] ?? row.unit;
                    const product = report.products.find((item) => item.productId === row.productId);
                    const normQty = product?.quantityPerChild ?? 0;
                    return (
                      <Tr key={row.productId}>
                        <Td className="sticky left-0 z-10 bg-surface font-medium text-content">
                          {row.productName}
                        </Td>
                        <Td align="right" className="tabular text-content">
                          {formatQuantity(row.openingQuantity)} {unitLabel}
                        </Td>
                        <Td align="right" className="tabular text-content">
                          {formatQuantity(row.inboundQuantity)} {unitLabel}
                        </Td>
                        <Td align="right" className="tabular text-content">
                          {formatNumber(presentTotal)}
                        </Td>
                        <Td align="right" className="tabular text-content">
                          {formatCompoundNorm(normQty, product?.normUnit ?? row.unit, units)}
                        </Td>
                        <Td align="right" className="tabular font-medium text-content">
                          {formatQuantity(row.normConsumption)} {unitLabel}
                        </Td>
                        <Td align="right" className="tabular font-semibold text-brand">
                          {formatQuantity(row.expectedByNorm)} {unitLabel}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            </div>
          </>
        )}
      </Card>

      <Card>
        <button
          type="button"
          className={`flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-muted/40 ${
            normsOpen ? 'border-b border-line' : ''
          }`}
          aria-expanded={normsOpen}
          onClick={() => setNormsOpen((open) => !open)}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-content">{t.foodConsumption.normsTitle}</h2>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium tabular text-content-secondary">
                {report?.norms.length ?? 0}
              </span>
            </div>
            <p className="mt-1 text-sm text-content-secondary">{t.foodConsumption.normsListHint}</p>
          </div>
          <ChevronDown
            className={`mt-0.5 size-5 shrink-0 text-content-secondary transition-transform ${
              normsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {normsOpen ? (
          !report?.norms.length ? (
            <EmptyState
              title={t.foodConsumption.noNorms}
              hint={t.foodConsumption.noNormsHint}
              icon={<UtensilsCrossed className="size-5" />}
            />
          ) : (
            <>
              <ul className="divide-y divide-line md:hidden">
                {report.norms.map((norm) => (
                  <li key={norm.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{norm.productName}</p>
                      <p className="mt-0.5 text-xs text-content-muted">
                        {t.foodConsumption.effectiveFrom}: {formatDateNumeric(norm.effectiveFrom)}
                      </p>
                    </div>
                    <p className="shrink-0 tabular text-sm font-semibold text-content">
                      {formatCompoundNorm(norm.quantityPerChild, norm.unit, units)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>{t.common.product}</Th>
                      <Th align="right">{t.foodConsumption.perChild}</Th>
                      <Th>{t.foodConsumption.effectiveFrom}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.norms.map((norm) => (
                      <Tr key={norm.id}>
                        <Td className="font-medium text-content">{norm.productName}</Td>
                        <Td align="right" className="tabular text-content">
                          {formatCompoundNorm(norm.quantityPerChild, norm.unit, units)}
                        </Td>
                        <Td className="text-content">{formatDateNumeric(norm.effectiveFrom)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableWrap>
              </div>
            </>
          )
        ) : null}
      </Card>

      {normModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label={t.common.cancel}
            className="absolute inset-0 bg-canvas/70 backdrop-blur-sm"
            onClick={closeNormModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[81] flex max-h-[min(92dvh,42rem)] w-full max-w-lg animate-[scale-in_0.2s_both] flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-lifted sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-lg font-semibold text-content">{t.foodConsumption.addNorm}</h2>
                <p className="mt-1 text-sm text-content-secondary">{t.foodConsumption.normsHint}</p>
              </div>
              <button
                type="button"
                onClick={closeNormModal}
                className="grid size-8 place-items-center rounded-lg text-content-muted transition hover:bg-surface-muted hover:text-content"
                aria-label={t.common.cancel}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <div>
                <span className="mb-1 block text-xs font-medium text-content-secondary">
                  {t.common.product}
                </span>
                <ProductPicker
                  products={warehouseProducts}
                  value={normForm.productId}
                  onChange={(productId) =>
                    setNormForm((prev) => ({ ...prev, productId, major: '', minor: '' }))
                  }
                  placeholder={t.foodConsumption.pickProduct}
                  units={units}
                  label={t.common.product}
                />
              </div>

              {inputMode === 'weight' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-content-secondary">
                      {t.foodConsumption.perChildKg}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={normForm.major}
                      onChange={(event) =>
                        setNormForm((prev) => ({ ...prev, major: event.target.value }))
                      }
                      placeholder="1"
                      className={inputClass}
                      disabled={!selectedNormProduct}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-content-secondary">
                      {t.foodConsumption.perChildGram}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      step="1"
                      value={normForm.minor}
                      onChange={(event) =>
                        setNormForm((prev) => ({ ...prev, minor: event.target.value }))
                      }
                      placeholder="350"
                      className={inputClass}
                      disabled={!selectedNormProduct}
                    />
                  </label>
                </div>
              ) : inputMode === 'volume' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-content-secondary">
                      {t.foodConsumption.perChildLiter}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={normForm.major}
                      onChange={(event) =>
                        setNormForm((prev) => ({ ...prev, major: event.target.value }))
                      }
                      placeholder="1"
                      className={inputClass}
                      disabled={!selectedNormProduct}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-content-secondary">
                      {t.foodConsumption.perChildMl}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      step="1"
                      value={normForm.minor}
                      onChange={(event) =>
                        setNormForm((prev) => ({ ...prev, minor: event.target.value }))
                      }
                      placeholder="300"
                      className={inputClass}
                      disabled={!selectedNormProduct}
                    />
                  </label>
                </div>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">
                    {t.foodConsumption.perChild}
                    {selectedNormProduct
                      ? ` (${units[selectedNormProduct.unit] ?? selectedNormProduct.unit})`
                      : ''}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    value={normForm.major}
                    onChange={(event) =>
                      setNormForm((prev) => ({ ...prev, major: event.target.value }))
                    }
                    placeholder="0"
                    className={inputClass}
                    disabled={!selectedNormProduct}
                  />
                </label>
              )}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <button
                type="button"
                onClick={closeNormModal}
                className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-content-secondary transition hover:bg-surface-muted sm:h-10"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={
                  pending ||
                  !normForm.productId ||
                  (!normForm.major.trim() && !normForm.minor.trim())
                }
                onClick={saveNorm}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-brand px-4 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-all hover:brightness-105 disabled:opacity-50 sm:h-10"
              >
                {t.foodConsumption.addNorm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

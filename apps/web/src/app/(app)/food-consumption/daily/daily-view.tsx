'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  UtensilsCrossed,
} from 'lucide-react';
import type { FoodConsumptionReport } from '@bogcha/shared';
import { useAppData, useViewer } from '../../../../lib/app-data';
import { useT } from '../../../../i18n/client';
import {
  buildQuery,
  formatDateNumeric,
  formatNumber,
  formatQuantity,
} from '../../../../lib/utils';
import { Card, CardBody, CardHeader } from '../../../../components/ui/card';
import { EmptyState } from '../../../../components/ui/misc';
import { PageHeader } from '../../../../components/ui/page-header';
import { Td, Th, Tr } from '../../../../components/ui/table';
import { resolveFoodRange, type RangePreset } from '../range';

export function FoodDailyView() {
  const t = useT();
  const viewer = useViewer();
  const { data } = useAppData();
  const searchParams = useSearchParams();

  const preset = (searchParams.get('range') as RangePreset | null) ?? '7';
  const { from, to } = resolveFoodRange(preset, searchParams.get('from'), searchParams.get('to'));
  const branchId = data.branchId ?? viewer.requiredBranchId ?? '';
  const units = t.products.units as unknown as Record<string, string>;
  const backHref = `/food-consumption${buildQuery({
    range: searchParams.get('range'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })}`;

  const [report, setReport] = useState<FoodConsumptionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, Math.floor(el.clientWidth * 0.55)), behavior: 'smooth' });
  };

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/food-consumption/report${buildQuery({ branchId, from, to })}`,
          { cache: 'no-store' },
        );
        const json = (await res.json()) as FoodConsumptionReport & { message?: string };
        if (!res.ok) throw new Error(json.message ?? t.common.error);
        if (!cancelled) setReport(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t.common.error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, from, to, t.common.error]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [report, fullScreen, loading, updateScrollState]);

  useEffect(() => {
    if (!fullScreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullScreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [fullScreen]);

  const tableToolbar = (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label={t.foodConsumption.scrollLeft}
        title={t.foodConsumption.scrollLeft}
        disabled={!canScrollLeft}
        onClick={() => scrollByDir(-1)}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-content-secondary transition hover:bg-surface-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label={t.foodConsumption.scrollRight}
        title={t.foodConsumption.scrollRight}
        disabled={!canScrollRight}
        onClick={() => scrollByDir(1)}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-content-secondary transition hover:bg-surface-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ChevronRight className="size-4" />
      </button>
      <button
        type="button"
        aria-label={fullScreen ? t.foodConsumption.exitFullScreen : t.foodConsumption.fullScreen}
        title={fullScreen ? t.foodConsumption.exitFullScreen : t.foodConsumption.fullScreen}
        onClick={() => setFullScreen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-content-secondary transition hover:bg-surface-muted hover:text-content"
      >
        {fullScreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>
    </div>
  );

  const tableContent =
    !report || report.products.length === 0 ? null : (
      <div
        ref={scrollRef}
        className={`-mx-3 overflow-x-auto overscroll-x-contain px-3 sm:mx-0 sm:px-0 ${fullScreen ? 'max-h-[calc(100dvh-5.5rem)] overflow-y-auto' : ''}`}
      >
        <table className="w-full min-w-[36rem] border-collapse text-sm sm:min-w-[42rem]">
          <thead>
            <tr>
              <Th className="sticky left-0 z-20 min-w-[7.5rem] bg-surface-muted/95">
                {t.common.date}
              </Th>
              <Th align="right" className="min-w-[7rem]">
                {t.foodConsumption.presentChildren}
              </Th>
              {report.products.map((product) => (
                <Th key={product.productId} align="right" className="min-w-[8rem]">
                  <span className="text-content">{product.productName}</span>
                  <div className="text-[10px] font-normal normal-case text-content-muted">
                    {units[product.unit] ?? product.unit}
                  </div>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.days.map((day) => (
              <Tr key={day.date}>
                <Td className="sticky left-0 z-10 bg-surface font-medium text-content">
                  {formatDateNumeric(day.date)}
                </Td>
                <Td align="right" className="tabular text-content">
                  {formatNumber(day.presentCount)}
                </Td>
                {day.products.map((cell) => {
                  const unitLabel = units[cell.unit] ?? cell.unit;
                  return (
                    <Td key={cell.productId} align="right" className="tabular text-content">
                      {formatQuantity(cell.plannedQuantity)} {unitLabel}
                    </Td>
                  );
                })}
              </Tr>
            ))}
            <Tr className="bg-surface-muted/50 font-semibold" interactive={false}>
              <Td className="sticky left-0 z-10 bg-surface-muted/90 text-content">
                {t.common.total}
              </Td>
              <Td align="right" className="tabular text-content">
                {formatNumber(report.totals.presentCount)}
              </Td>
              {report.products.map((product) => {
                const unitLabel = units[product.unit] ?? product.unit;
                const planned = report.totals.plannedByProduct[product.productId] ?? 0;
                return (
                  <Td key={product.productId} align="right" className="tabular text-content">
                    {formatQuantity(planned)} {unitLabel}
                  </Td>
                );
              })}
            </Tr>
          </tbody>
        </table>
      </div>
    );

  return (
    <>
      <PageHeader
        title={t.foodConsumption.dailyTable}
        subtitle={t.foodConsumption.dailyHint}
        actions={
          <Link
            href={backHref || '/food-consumption'}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-surface px-3 text-sm font-medium text-content-secondary ring-1 ring-inset ring-line transition hover:bg-surface-muted hover:text-content sm:w-auto"
          >
            <ArrowLeft className="size-4" />
            {t.foodConsumption.backToMain}
          </Link>
        }
      />

      <Card className={fullScreen ? 'invisible' : undefined}>
        <CardHeader
          title={`${formatDateNumeric(from)} — ${formatDateNumeric(to)}`}
          subtitle={t.foodConsumption.dailyHint}
          action={!loading && !error && report?.products.length ? tableToolbar : undefined}
        />
        {loading ? (
          <CardBody>
            <p className="text-sm text-content-muted">{t.common.loading}</p>
          </CardBody>
        ) : error ? (
          <CardBody>
            <p className="text-sm text-danger">{error}</p>
          </CardBody>
        ) : !report || report.products.length === 0 ? (
          <EmptyState
            title={t.foodConsumption.noNorms}
            hint={t.foodConsumption.noNormsHint}
            icon={<UtensilsCrossed className="size-5" />}
          />
        ) : fullScreen ? (
          <CardBody>
            <p className="text-sm text-content-muted">{t.foodConsumption.fullScreen}</p>
          </CardBody>
        ) : (
          tableContent
        )}
      </Card>

      {fullScreen && report && report.products.length > 0 ? (
        <div className="fixed inset-0 z-[90] flex flex-col bg-canvas">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-content">
                {t.foodConsumption.dailyTable}
              </h2>
              <p className="text-xs text-content-muted">
                {formatDateNumeric(from)} — {formatDateNumeric(to)}
              </p>
            </div>
            {tableToolbar}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-surface">{tableContent}</div>
        </div>
      ) : null}
    </>
  );
}

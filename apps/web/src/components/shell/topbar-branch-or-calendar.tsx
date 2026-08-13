'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useT } from '../../i18n/client';
import { todayIso } from '../../lib/utils';
import { BranchSwitcher } from './switchers';
import { FoodRangeCalendar } from './food-range-calendar';

type RangePreset = 'today' | 'yesterday' | '7' | '10' | '30' | 'custom';

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function resolveRange(preset: RangePreset, fromParam: string | null, toParam: string | null) {
  const today = todayIso();
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'yesterday') {
    const yesterday = shiftDays(today, -1);
    return { from: yesterday, to: yesterday };
  }
  if (preset === '7') return { from: shiftDays(today, -6), to: today };
  if (preset === '10') return { from: shiftDays(today, -9), to: today };
  if (preset === '30') return { from: shiftDays(today, -29), to: today };
  if (preset === 'custom' && fromParam && toParam) return { from: fromParam, to: toParam };
  // Default: oxirgi 7 kun
  return { from: shiftDays(today, -6), to: today };
}

/**
 * Oziq-ovqat sarfi sahifasida filial o'rniga kalendar;
 * boshqa sahifalarda oddiy filial tanlovi.
 */
export function TopbarBranchOrCalendar({
  branches,
  activeBranchId,
  allowAll,
}: {
  branches: Array<{ id: string; name: string; childrenCount: number }>;
  activeBranchId: string | null;
  allowAll: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();

  if (!pathname.startsWith('/food-consumption')) {
    return (
      <BranchSwitcher
        branches={branches}
        activeBranchId={activeBranchId}
        allowAll={allowAll}
      />
    );
  }

  const preset = (searchParams.get('range') as RangePreset | null) ?? '7';
  const { from, to } = resolveRange(preset, searchParams.get('from'), searchParams.get('to'));

  const presets: { key: RangePreset; label: string }[] = [
    { key: 'today', label: t.foodConsumption.rangeToday },
    { key: 'yesterday', label: t.foodConsumption.rangeYesterday },
    { key: '7', label: t.foodConsumption.range7 },
    { key: '10', label: t.foodConsumption.range10 },
    { key: 'custom', label: t.foodConsumption.rangeCustom },
  ];

  function setPreset(next: RangePreset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', next);
    if (next === 'custom') {
      if (!params.get('from')) params.set('from', from);
      if (!params.get('to')) params.set('to', to);
    } else {
      params.delete('from');
      params.delete('to');
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function setCustomRange(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', 'custom');
    params.set('from', nextFrom);
    params.set('to', nextTo);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <FoodRangeCalendar
      from={from}
      to={to}
      presets={presets}
      activePreset={preset}
      onSelectPreset={setPreset}
      onSelectRange={setCustomRange}
      selectDayLabel={t.foodConsumption.calendarPickDay}
      selectRangeLabel={t.foodConsumption.calendarPickEnd}
      applyLabel={t.foodConsumption.calendarApplyDay}
    />
  );
}

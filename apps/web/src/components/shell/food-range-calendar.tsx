'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatDateNumeric, todayIso } from '../../lib/utils';
import { Dropdown } from '../ui/dropdown';

const WEEKDAYS_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'] as const;

type Preset = 'today' | 'yesterday' | '7' | '10' | '30' | 'custom';

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y: y ?? 2026, m: (m ?? 1) - 1, d: d ?? 1 };
}

function shiftDays(iso: string, days: number): string {
  const { y, m, d } = parseIso(iso);
  const date = new Date(Date.UTC(y, m, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Dushanba=0 … Yakshanba=6 */
function mondayIndex(year: number, month: number, day: number): number {
  const js = new Date(Date.UTC(year, month, day)).getUTCDay();
  return (js + 6) % 7;
}

function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

function resolvePresetRange(preset: Preset): { from: string; to: string } | null {
  const today = todayIso();
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'yesterday') {
    const yesterday = shiftDays(today, -1);
    return { from: yesterday, to: yesterday };
  }
  if (preset === '7') return { from: shiftDays(today, -6), to: today };
  if (preset === '10') return { from: shiftDays(today, -9), to: today };
  if (preset === '30') return { from: shiftDays(today, -29), to: today };
  return null;
}

export function FoodRangeCalendar({
  from,
  to,
  presets,
  activePreset,
  onSelectRange,
  onSelectPreset,
  selectDayLabel,
  selectRangeLabel,
  applyLabel,
}: {
  from: string;
  to: string;
  presets: { key: Preset; label: string }[];
  activePreset?: Preset;
  onSelectRange: (from: string, to: string) => void;
  onSelectPreset: (preset: Preset) => void;
  selectDayLabel: string;
  selectRangeLabel: string;
  applyLabel: string;
}) {
  const today = todayIso();
  const initial = parseIso(to || today);
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);
  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  const cells = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const startPad = mondayIndex(viewYear, viewMonth, 1);
    const items: Array<{ iso: string; day: number; inMonth: boolean } | null> = [];

    for (let i = 0; i < startPad; i += 1) items.push(null);
    for (let day = 1; day <= total; day += 1) {
      items.push({ iso: toIso(viewYear, viewMonth, day), day, inMonth: true });
    }
    while (items.length % 7 !== 0) items.push(null);
    return items;
  }, [viewYear, viewMonth]);

  const previewFrom = draftStart
    ? hoverDay && hoverDay < draftStart
      ? hoverDay
      : draftStart
    : from;
  const previewEnd = draftStart
    ? hoverDay && hoverDay > draftStart
      ? hoverDay
      : draftStart
    : to;

  const rangeLabel =
    from === to ? formatDateNumeric(from) : `${formatDateNumeric(from)} — ${formatDateNumeric(to)}`;

  const currentPreset =
    activePreset ??
    presets.find((item) => {
      const range = resolvePresetRange(item.key);
      return range && range.from === from && range.to === to;
    })?.key ??
    'custom';

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  function pickDay(iso: string, close: () => void) {
    if (!draftStart) {
      setDraftStart(iso);
      setHoverDay(iso);
      return;
    }
    const start = draftStart <= iso ? draftStart : iso;
    const end = draftStart <= iso ? iso : draftStart;
    setDraftStart(null);
    setHoverDay(null);
    onSelectRange(start, end);
    close();
  }

  const quickPresets = presets.filter((p) => p.key !== 'custom');

  return (
    <Dropdown
      align="end"
      panelClassName="w-[min(20.5rem,calc(100vw-1.5rem))] p-0"
      trigger={({ open }) => (
        <span
          className={cn(
            'inline-flex h-9 max-w-[8.5rem] items-center gap-1.5 rounded-xl bg-surface px-2 text-sm text-content-secondary ring-1 ring-inset ring-line transition-colors sm:max-w-[16rem] sm:px-2.5',
            'hover:bg-surface-muted hover:text-content',
            open && 'bg-brand-soft text-brand ring-brand/30',
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-brand" />
          <span className="truncate text-xs font-medium sm:text-sm">{rangeLabel}</span>
        </span>
      )}
    >
      {({ close }) => (
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="inline-flex size-8 items-center justify-center rounded-xl text-content-secondary transition hover:bg-surface-muted hover:text-content"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="text-sm font-semibold tracking-tight text-content">
              {String(viewMonth + 1).padStart(2, '0')}.{viewYear}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="inline-flex size-8 items-center justify-center rounded-xl text-content-secondary transition hover:bg-surface-muted hover:text-content"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS_SHORT.map((label) => (
              <div
                key={label}
                className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-content-muted"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, index) => {
              if (!cell) return <div key={`empty-${index}`} className="aspect-square" />;

              const isToday = cell.iso === today;
              const isStart = cell.iso === previewFrom;
              const isEnd = cell.iso === previewEnd;
              const isSingle = previewFrom === previewEnd && isStart;
              const isMiddle =
                !isSingle && inRange(cell.iso, previewFrom, previewEnd) && !isStart && !isEnd;
              const isFuture = cell.iso > today;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={isFuture}
                  onMouseEnter={() => draftStart && setHoverDay(cell.iso)}
                  onFocus={() => draftStart && setHoverDay(cell.iso)}
                  onClick={() => pickDay(cell.iso, close)}
                  className={cn(
                    'relative aspect-square rounded-xl text-sm font-medium transition',
                    isFuture && 'cursor-not-allowed opacity-35',
                    !isFuture && 'hover:bg-brand/10 hover:text-brand',
                    isMiddle && 'rounded-none bg-brand/10 text-brand',
                    isStart &&
                      !isSingle &&
                      'rounded-l-xl rounded-r-md bg-brand text-white hover:bg-brand-strong hover:text-white',
                    isEnd &&
                      !isSingle &&
                      'rounded-r-xl rounded-l-md bg-brand text-white hover:bg-brand-strong hover:text-white',
                    isSingle && 'bg-brand text-white shadow-sm hover:bg-brand-strong hover:text-white',
                    isToday && !isStart && !isEnd && !isMiddle && 'ring-1 ring-inset ring-brand/40',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <p className="text-xs text-content-muted">
              {draftStart ? selectRangeLabel : selectDayLabel}
            </p>

            {draftStart ? (
              <button
                type="button"
                onClick={() => {
                  onSelectRange(draftStart, draftStart);
                  setDraftStart(null);
                  setHoverDay(null);
                  close();
                }}
                className="h-9 w-full rounded-xl bg-brand text-sm font-semibold text-white"
              >
                {applyLabel}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {quickPresets.map((item) => {
                  const active = currentPreset === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setDraftStart(null);
                        onSelectPreset(item.key);
                        close();
                      }}
                      className={cn(
                        'h-8 rounded-xl px-2 text-xs font-medium transition',
                        active
                          ? 'bg-brand text-white shadow-sm'
                          : 'bg-surface-muted text-content-secondary hover:bg-brand/10 hover:text-brand',
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}

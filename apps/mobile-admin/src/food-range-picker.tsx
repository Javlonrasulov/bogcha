import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Row, radius, spacing, useTheme } from '@bogcha/mobile-core';
import { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import {
  formatDateNumeric,
  todayIso,
  type RangePreset,
} from './food-consumption';

const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'] as const;
const CELL = '14.2857%';

function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y: y ?? 2026, m: (m ?? 1) - 1, d: d ?? 1 };
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function mondayIndex(year: number, month: number, day: number): number {
  const js = new Date(Date.UTC(year, month, day)).getUTCDay();
  return (js + 6) % 7;
}

function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

/**
 * Admin web `FoodRangeCalendar` bilan bir xil UX.
 */
export function FoodRangePicker({
  preset,
  from,
  to,
  labels,
  onSelectPreset,
  onSelectRange,
  compact = false,
}: {
  preset: RangePreset;
  from: string;
  to: string;
  labels: {
    today: string;
    yesterday: string;
    range7: string;
    range10: string;
    custom: string;
    pickDay: string;
    pickEnd: string;
    apply: string;
  };
  onSelectPreset: (preset: RangePreset) => void;
  onSelectRange: (from: string, to: string) => void;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const today = todayIso();
  const initial = parseIso(to || today);
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);
  const [draftStart, setDraftStart] = useState<string | null>(null);

  /** Webdagi 2×2 tezkor tugmalar — “Boshqa oralik” yo‘q. */
  const quickPresets: Array<{ key: RangePreset; label: string }> = [
    { key: 'today', label: labels.today },
    { key: 'yesterday', label: labels.yesterday },
    { key: '7', label: labels.range7 },
    { key: '10', label: labels.range10 },
  ];

  const cells = useMemo(() => {
    const firstDow = mondayIndex(viewYear, viewMonth, 1);
    const count = daysInMonth(viewYear, viewMonth);
    const grid: Array<{ iso: string; day: number } | null> = [];
    for (let i = 0; i < firstDow; i += 1) grid.push(null);
    for (let day = 1; day <= count; day += 1) {
      grid.push({ iso: toIso(viewYear, viewMonth, day), day });
    }
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [viewYear, viewMonth]);

  const weeks = useMemo(() => {
    const rows: Array<Array<{ iso: string; day: number } | null>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [cells]);

  const previewFrom = draftStart ?? from;
  const previewTo = draftStart ?? to;

  const rangeLabel =
    from === to ? formatDateNumeric(from) : `${formatDateNumeric(from)} — ${formatDateNumeric(to)}`;

  const monthTitle = `${String(viewMonth + 1).padStart(2, '0')}.${viewYear}`;

  function openCalendar() {
    setDraftStart(null);
    const parsed = parseIso(to || today);
    setViewYear(parsed.y);
    setViewMonth(parsed.m);
    setOpen(true);
  }

  function closeCalendar() {
    setOpen(false);
    setDraftStart(null);
  }

  function shiftMonth(delta: number) {
    const date = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(date.getUTCFullYear());
    setViewMonth(date.getUTCMonth());
  }

  function pickDay(iso: string) {
    if (iso > today) return;
    if (!draftStart) {
      setDraftStart(iso);
      return;
    }
    const start = draftStart <= iso ? draftStart : iso;
    const end = draftStart <= iso ? iso : draftStart;
    setDraftStart(null);
    onSelectRange(start, end);
    setOpen(false);
  }

  function applySingleDay() {
    if (!draftStart) return;
    onSelectRange(draftStart, draftStart);
    setDraftStart(null);
    setOpen(false);
  }

  function pickPreset(key: RangePreset) {
    setDraftStart(null);
    onSelectPreset(key);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={openCalendar}
        accessibilityRole="button"
        accessibilityLabel={rangeLabel}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          maxWidth: compact ? 180 : undefined,
          alignSelf: compact ? 'flex-end' : 'stretch',
          height: compact ? 36 : 44,
          paddingHorizontal: compact ? 10 : 14,
          borderRadius: radius.lg,
          backgroundColor: open ? 'rgba(108,92,231,0.12)' : colors.surface,
          borderWidth: 1,
          borderColor: open ? colors.brand : colors.line,
        }}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.brand} />
        <AppText
          variant="caption"
          weight="600"
          numberOfLines={1}
          style={{ flexShrink: 1, color: open ? colors.brand : colors.contentSecondary }}
        >
          {rangeLabel}
        </AppText>
        {!compact ? (
          <Ionicons
            name="chevron-down"
            size={16}
            color={colors.contentMuted}
            style={{ marginLeft: 'auto' }}
          />
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={closeCalendar}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 16,
          }}
          onPress={closeCalendar}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: spacing.lg,
              gap: spacing.md,
              maxWidth: 420,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <Row justify="space-between" align="center">
              <Pressable
                onPress={() => shiftMonth(-1)}
                hitSlop={12}
                style={navBtn(colors.surfaceMuted)}
              >
                <Ionicons name="chevron-back" size={18} color={colors.contentSecondary} />
              </Pressable>
              <AppText variant="body" weight="700">
                {monthTitle}
              </AppText>
              <Pressable
                onPress={() => shiftMonth(1)}
                hitSlop={12}
                style={navBtn(colors.surfaceMuted)}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.contentSecondary} />
              </Pressable>
            </Row>

            <Row>
              {WEEKDAYS.map((day) => (
                <View key={day} style={{ width: CELL, alignItems: 'center', paddingVertical: 4 }}>
                  <AppText variant="caption" tone="muted" weight="700">
                    {day}
                  </AppText>
                </View>
              ))}
            </Row>

            <View style={{ gap: 2 }}>
              {weeks.map((week, weekIndex) => (
                <View key={`w-${weekIndex}`} style={{ flexDirection: 'row' }}>
                  {week.map((cell, col) => {
                    if (!cell) {
                      return <View key={`e-${weekIndex}-${col}`} style={{ width: CELL, aspectRatio: 1 }} />;
                    }

                    const isFuture = cell.iso > today;
                    const isStart = cell.iso === previewFrom;
                    const isEnd = cell.iso === previewTo;
                    const isSingle = previewFrom === previewTo && isStart;
                    const inSel = inRange(cell.iso, previewFrom, previewTo);
                    const isMiddle = inSel && !isStart && !isEnd && !isSingle;
                    const isTodayCell = cell.iso === today;

                    // Hafta ichida uzluksiz oralik: chap/o‘ng radius faqat segment uchlarida.
                    const rangeLeft = isSingle || isStart || (inSel && col === 0);
                    const rangeRight = isSingle || isEnd || (inSel && col === 6);
                    const solid = isStart || isEnd || isSingle;

                    return (
                      <Pressable
                        key={cell.iso}
                        disabled={isFuture}
                        onPress={() => pickDay(cell.iso)}
                        style={{
                          width: CELL,
                          aspectRatio: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isFuture ? 0.35 : 1,
                          backgroundColor: solid
                            ? colors.brand
                            : isMiddle
                              ? 'rgba(108,92,231,0.14)'
                              : 'transparent',
                          borderTopLeftRadius: rangeLeft && inSel ? 12 : 0,
                          borderBottomLeftRadius: rangeLeft && inSel ? 12 : 0,
                          borderTopRightRadius: rangeRight && inSel ? 12 : 0,
                          borderBottomRightRadius: rangeRight && inSel ? 12 : 0,
                          borderWidth: isTodayCell && !inSel ? 1 : 0,
                          borderColor: colors.brand,
                        }}
                      >
                        <AppText
                          variant="caption"
                          weight={solid || isMiddle ? '700' : '500'}
                          style={{
                            color: solid
                              ? colors.brandContrast
                              : isMiddle
                                ? colors.brand
                                : colors.content,
                          }}
                        >
                          {cell.day}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.line,
                paddingTop: spacing.md,
                gap: spacing.sm,
              }}
            >
              <AppText variant="caption" tone="muted">
                {draftStart ? labels.pickEnd : labels.pickDay}
              </AppText>

              {draftStart ? (
                <Button label={labels.apply} size="sm" onPress={applySingleDay} fullWidth />
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {quickPresets.map((item) => {
                    const active = preset === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => pickPreset(item.key)}
                        style={{
                          width: '48.5%',
                          flexGrow: 1,
                          height: 36,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 8,
                          backgroundColor: active ? colors.brand : colors.surfaceMuted,
                        }}
                      >
                        <AppText
                          variant="caption"
                          weight="600"
                          numberOfLines={1}
                          style={{
                            color: active ? colors.brandContrast : colors.contentSecondary,
                          }}
                        >
                          {item.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function navBtn(bg: string) {
  return {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: bg,
  };
}

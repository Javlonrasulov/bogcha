export type RangePreset = 'today' | 'yesterday' | '7' | '10' | '30' | 'custom';

export function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveFoodRange(
  preset: RangePreset,
  fromParam: string | null,
  toParam: string | null,
) {
  const today = new Date().toISOString().slice(0, 10);
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'yesterday') {
    const yesterday = shiftDays(today, -1);
    return { from: yesterday, to: yesterday };
  }
  if (preset === '7') return { from: shiftDays(today, -6), to: today };
  if (preset === '10') return { from: shiftDays(today, -9), to: today };
  if (preset === '30') return { from: shiftDays(today, -29), to: today };
  if (preset === 'custom' && fromParam && toParam) return { from: fromParam, to: toParam };
  return { from: shiftDays(today, -6), to: today };
}

import { Unit, type Unit as UnitType } from '@bogcha/shared';

export type RangePreset = 'today' | 'yesterday' | '7' | '10' | '30' | 'custom';

/** Web bilan bir xil: litr / gramm / dona. */
export const FOOD_UNIT_LABELS: Record<string, string> = {
  KG: 'kg',
  GRAM: 'gramm',
  LITER: 'litr',
  MILLILITER: 'ml',
  PIECE: 'dona',
  BOX: 'quti',
  PACK: 'paket',
  BUNDLE: "bog'lam",
  OTHER: 'boshqa',
};

export function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function resolveFoodRange(
  preset: RangePreset,
  fromParam?: string | null,
  toParam?: string | null,
): { from: string; to: string } {
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
  return { from: shiftDays(today, -6), to: today };
}

/** Web `formatDateNumeric`: 07.08.2026 */
export function formatDateNumeric(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getUTCFullYear()}`;
}

/** Web `formatQuantity` — max 3 kasr. */
export function formatQuantity(value: number, unit?: string): string {
  const formatted = new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 3 }).format(value ?? 0);
  if (!unit) return formatted;
  const label = FOOD_UNIT_LABELS[unit] ?? unit;
  return `${formatted} ${label}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('uz-UZ').format(value ?? 0);
}

export type NormInputMode = 'weight' | 'volume' | 'single';

export function normInputMode(unit: string | undefined): NormInputMode {
  if (unit === Unit.KG || unit === Unit.GRAM) return 'weight';
  if (unit === Unit.LITER || unit === Unit.MILLILITER) return 'volume';
  return 'single';
}

/** Web bilan bir xil: 1.35 → "1 kg 350 gramm" */
export function formatCompoundNorm(value: number, unit: UnitType | string): string {
  const labels = FOOD_UNIT_LABELS;
  if (!(value > 0)) return `0 ${labels[unit] ?? unit}`;

  if (unit === Unit.KG || unit === Unit.GRAM) {
    const totalGrams = unit === Unit.KG ? Math.round(value * 1000) : Math.round(value);
    const kg = Math.floor(totalGrams / 1000);
    const gr = totalGrams % 1000;
    const parts: string[] = [];
    if (kg > 0) parts.push(`${kg} ${labels.KG}`);
    if (gr > 0) parts.push(`${gr} ${labels.GRAM}`);
    return parts.join(' ') || `0 ${labels.KG}`;
  }

  if (unit === Unit.LITER || unit === Unit.MILLILITER) {
    const totalMl = unit === Unit.LITER ? Math.round(value * 1000) : Math.round(value);
    const litr = Math.floor(totalMl / 1000);
    const ml = totalMl % 1000;
    const parts: string[] = [];
    if (litr > 0) parts.push(`${litr} ${labels.LITER}`);
    if (ml > 0) parts.push(`${ml} ${labels.MILLILITER}`);
    return parts.join(' ') || `0 ${labels.LITER}`;
  }

  return formatQuantity(value, String(unit));
}

export function parseOptionalNumber(value: string): number {
  if (!value.trim()) return 0;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

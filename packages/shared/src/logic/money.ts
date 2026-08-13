/**
 * Pul birligi — so'm. Qiymatlar `number` sifatida uzatiladi (bazada Decimal(16,2)),
 * hisob-kitoblardan keyin har doim `roundMoney` bilan yaxlitlanadi.
 */

export const CURRENCY = 'UZS' as const;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundQuantity(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function sum(values: readonly number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

export function sumMoney(values: readonly number[]): number {
  return roundMoney(sum(values));
}

/** Nolga bo'linishdan himoyalangan bo'lish. */
export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator || !Number.isFinite(denominator)) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

/** Foiz (0-100 shkalasi). */
export function percentage(part: number, total: number): number {
  return roundMoney(safeDivide(part, total) * 100);
}

/** O'sish foizi: oldingi davrga nisbatan o'zgarish. */
export function growthPercent(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return roundMoney(((current - previous) / Math.abs(previous)) * 100);
}

export function applyDiscount(amount: number, discountPercent: number, discountAmount = 0): number {
  const afterPercent = amount * (1 - clamp(discountPercent, 0, 100) / 100);
  return roundMoney(Math.max(0, afterPercent - discountAmount));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Katta summalarni qisqartirib ko'rsatish: 55 000 000 → "55 mln". */
export function formatCompactMoney(value: number, locale = 'uz-UZ'): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${trimZeros(value / 1_000_000_000, locale)} mlrd`;
  if (abs >= 1_000_000) return `${trimZeros(value / 1_000_000, locale)} mln`;
  if (abs >= 1_000) return `${trimZeros(value / 1_000, locale)} ming`;
  return trimZeros(value, locale);
}

function trimZeros(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

export function formatMoney(value: number, locale = 'uz-UZ'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

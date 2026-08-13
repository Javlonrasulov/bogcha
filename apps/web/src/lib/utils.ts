import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const NUMBER_LOCALE = 'uz-UZ';

/** 156000000 → "156 000 000" */
export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits }).format(value ?? 0);
}

/** 4800000 → "4.8 mln" — dashboard kartalari uchun. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value ?? 0);
  const format = (divided: number) =>
    new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits: 1 }).format(divided);

  if (abs >= 1_000_000_000) return `${format(value / 1_000_000_000)} mlrd`;
  if (abs >= 1_000_000) return `${format(value / 1_000_000)} mln`;
  if (abs >= 1_000) return `${format(value / 1_000)} ming`;
  return format(value ?? 0);
}

export function formatMoney(value: number): string {
  return `${formatNumber(value)} so'm`;
}

export function formatCompactMoney(value: number): string {
  return `${formatCompact(value)} so'm`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${new Intl.NumberFormat(NUMBER_LOCALE, {
    maximumFractionDigits: fractionDigits,
  }).format(value ?? 0)}%`;
}

export function formatQuantity(
  value: number,
  unit?: string,
  units?: Record<string, string>,
): string {
  const formatted = new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits: 3 }).format(
    value ?? 0,
  );
  if (!unit) return formatted;
  return `${formatted} ${units?.[unit] ?? unit.toLowerCase()}`;
}

const MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

const WEEKDAYS_UZ = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
];

/** "2026-08-11" → "11 avgust 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getUTCDate()} ${MONTHS_UZ[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "2026-08-12" → "12.08.2026" */
export function formatDateNumeric(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getUTCFullYear()}`;
}

/** "2026-08-11" → "11 avg" — grafik o'qlari uchun. */
export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCDate()} ${MONTHS_UZ[date.getUTCMonth()]?.slice(0, 3)}`;
}

export function formatWeekday(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return WEEKDAYS_UZ[date.getUTCDay()] ?? '';
}

/** "2026-08-11T09:15:00.000Z" → "14:15" (Toshkent vaqti). */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(NUMBER_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tashkent',
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** "2026-08" → "Avgust 2026" */
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const name = MONTHS_UZ[Number(month) - 1] ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export function todayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftPeriod(period: string, months: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** `2026-08` → oyning birinchi va oxirgi kuni (API `from`/`to` uchun). */
export function monthRange(period: string): { from: string; to: string } {
  const [year, month] = period.split('-').map(Number);
  const last = new Date(Date.UTC(year ?? 1970, month ?? 1, 0));
  return { from: `${period}-01`, to: last.toISOString().slice(0, 10) };
}

export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** Ismdan barqaror rang indeksi — avatarlar uchun. */
export function colorIndex(seed: string, buckets = 6): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 100_000;
  return hash % buckets;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

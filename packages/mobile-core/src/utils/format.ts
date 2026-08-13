import { formatCompactMoney } from '@bogcha/shared';

/** Mobil ekranlarda joy kam — summalar qisqartirib ko'rsatiladi (TZ §46). */
export function money(value: number): string {
  return formatCompactMoney(value);
}

export function fullMoney(value: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(value);
}

export function percent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function quantity(value: number, unitLabel?: string): string {
  const formatted = new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 3 }).format(value);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthIso(): string {
  return new Date().toISOString().slice(0, 7);
}

/** `2026-08-11` → `11 avgust`. */
export function shortDate(iso: string, locale = 'uz-UZ'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date);
}

export function dateTime(iso: string, locale = 'uz-UZ'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** ISO vaqtdan `HH:mm` ajratadi. */
export function clockTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function nowClock(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** Ism-familiyadan bosh harflar: "Karimov Bekzod" → "KB". */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Yoshni to'liq yilda hisoblaydi. */
export function ageInYears(birthDate: string): number {
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1;
  return Math.max(0, age);
}

/** "5 daqiqa oldin" ko'rinishidagi nisbiy vaqt. */
export function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'hozir';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

/**
 * Sana yordamchilari. Kalendar sanalar (davomat, xarajat sanasi) UTC yarim
 * kechada saqlanadi — shunda vaqt zonasi kunni surib yubormaydi.
 *
 * TypeORM/`pg` ba'zan DATE ni string qaytaradi — shu sababli kirishlar
 * `string | Date` sifatida qabul qilinadi.
 */

export function toDateOnly(value: string | Date): Date {
  if (typeof value === 'string') {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0),
  );
}

export function formatDateOnly(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return toDateOnly(value).toISOString().slice(0, 10);
}

export function todayDateOnly(): Date {
  return toDateOnly(new Date());
}

export function todayString(): string {
  return formatDateOnly(new Date());
}

export function addDays(value: string | Date, days: number): Date {
  const result = toDateOnly(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** `YYYY-MM` davrining boshlanish va tugash sanasi. */
export function periodRange(period: string): { start: Date; end: Date } {
  const [yearRaw, monthRaw] = period.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function periodOf(value: string | Date): string {
  const date = toDateOnly(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function previousPeriod(period: string): string {
  const [yearRaw, monthRaw] = period.split('-');
  let year = Number(yearRaw);
  let month = Number(monthRaw) - 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

const WEEKDAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export function weekdayOf(value: string | Date): (typeof WEEKDAY_NAMES)[number] {
  return WEEKDAY_NAMES[toDateOnly(value).getUTCDay()] ?? 'MONDAY';
}

/** Berilgan oraliqdagi barcha sanalar. */
export function eachDay(from: string | Date, to: string | Date): Date[] {
  const days: Date[] = [];
  let cursor = toDateOnly(from);
  const end = toDateOnly(to);
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/**
 * Ish kunlari soni. `workdays` — ISO kun raqamlari (1 = dushanba, 7 = yakshanba).
 */
export function countWorkdays(from: string | Date, to: string | Date, workdays: number[]): number {
  const allowed = new Set(workdays);
  return eachDay(from, to).filter((day) => {
    const iso = day.getUTCDay() === 0 ? 7 : day.getUTCDay();
    return allowed.has(iso);
  }).length;
}

export function isWorkday(value: string | Date, workdays: number[]): boolean {
  const date = toDateOnly(value);
  const iso = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  return workdays.includes(iso);
}

/** `HH:mm` vaqtini berilgan sanadagi to'liq DateTime ga aylantiradi. */
export function timeOnDate(date: string | Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = toDateOnly(date);
  result.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}

export function startOfMonth(value: string | Date): Date {
  const date = toDateOnly(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function daysBetween(from: string | Date, to: string | Date): number {
  return Math.floor((toDateOnly(to).getTime() - toDateOnly(from).getTime()) / 86_400_000);
}

/** Decimal / string / number qiymatlarni JSON uchun oddiy songa aylantiradi. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const fn = (value as { toNumber: () => number }).toNumber;
    if (typeof fn === 'function') return fn.call(value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

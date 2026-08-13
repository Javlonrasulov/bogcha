export type SearchParams = Record<string, string | string[] | undefined>;

export function param(searchParams: SearchParams, key: string): string | undefined {
  const value = searchParams[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.length > 0 ? single : undefined;
}

export function pageOf(searchParams: SearchParams): number {
  const value = Number(param(searchParams, 'page') ?? 1);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

/** Sahifalash havolalari uchun `page` olib tashlangan so'rov satri. */
export function queryWithoutPage(searchParams: SearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page' || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item) params.append(key, item);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** `hasDebt` kabi boolean filtrlar faqat `true` bo'lganda uzatiladi. */
export function boolParam(searchParams: SearchParams, key: string): true | undefined {
  return param(searchParams, key) === 'true' ? true : undefined;
}

export interface PageLabels {
  showing: string;
  rows: string;
  page: string;
  of: string;
}

import type { PaginatedResult, PaginationQuery } from '@bogcha/shared';

export function paginate(query: Pick<PaginationQuery, 'page' | 'limit'>): {
  skip: number;
  take: number;
} {
  const page = Math.max(1, query.page ?? 1);
  const take = Math.min(200, Math.max(1, query.limit ?? 25));
  return { skip: (page - 1) * take, take };
}

export function paginated<T>(
  items: T[],
  total: number,
  query: Pick<PaginationQuery, 'page' | 'limit'>,
): PaginatedResult<T> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(200, Math.max(1, query.limit ?? 25));
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Tartiblash ustunini oq ro'yxat bo'yicha tekshiradi — SQL injection va
 * mavjud bo'lmagan ustun xatolarini oldini oladi.
 */
export function orderBy<T extends string>(
  query: Pick<PaginationQuery, 'sortBy' | 'sortDir'>,
  allowed: readonly T[],
  fallback: T,
): Record<string, 'asc' | 'desc'> {
  const field = allowed.includes(query.sortBy as T) ? (query.sortBy as T) : fallback;
  return { [field]: query.sortDir === 'asc' ? 'asc' : 'desc' };
}

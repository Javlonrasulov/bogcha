import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, apiFetch } from '../../../lib/api';
import type { GlobalSearchResult } from '../../../lib/types';

/** Global qidiruv uchun BFF proxy — token brauzerga chiqmaydi (TZ §44). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const term = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const empty: GlobalSearchResult = {
    children: [],
    products: [],
    suppliers: [],
    groups: [],
  };

  if (term.length < 2) return NextResponse.json(empty);

  try {
    const result = await apiFetch<GlobalSearchResult>(
      `/dashboard/search?q=${encodeURIComponent(term)}`,
    );
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json(empty, { status });
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, apiFetch } from '../../../../lib/api';

/** Yetkazib beruvchi tafsiloti — on-demand BFF (ro'yxat bootstrap'da). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  try {
    const detail = await apiFetch<unknown>(`/suppliers/${encodeURIComponent(id)}`);
    return NextResponse.json(detail);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : 'Server xatosi';
    return NextResponse.json({ message }, { status });
  }
}

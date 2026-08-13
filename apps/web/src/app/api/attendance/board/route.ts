import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, apiFetch } from '../../../../lib/api';
import { buildQuery } from '../../../../lib/utils';
import type { AttendanceBoard } from '../../../../lib/types';

/** Guruh davomat taxtasi — on-demand BFF (bootstrap'da yo'q). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const groupId = request.nextUrl.searchParams.get('groupId')?.trim() ?? '';
  const date = request.nextUrl.searchParams.get('date')?.trim() ?? '';

  if (!groupId) {
    return NextResponse.json({ message: 'groupId required' }, { status: 400 });
  }

  try {
    const board = await apiFetch<AttendanceBoard | null>(
      `/attendance/board${buildQuery({ groupId, date: date || undefined })}`,
    );
    return NextResponse.json(board);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : 'Server xatosi';
    return NextResponse.json({ message }, { status });
  }
}

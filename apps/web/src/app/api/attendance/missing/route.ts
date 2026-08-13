import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, apiFetch } from '../../../../lib/api';
import { buildQuery, todayIso } from '../../../../lib/utils';
import type { AttendanceMissing } from '../../../../lib/types';

/** Berilgan sana uchun kiritilmagan guruhlar (bootstrap faqat bugun). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const date = request.nextUrl.searchParams.get('date')?.trim() || todayIso();

  try {
    const missing = await apiFetch<AttendanceMissing>(
      `/attendance/missing${buildQuery({ date })}`,
    );
    return NextResponse.json(missing);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : 'Server xatosi';
    return NextResponse.json({ message, date, groups: [] }, { status });
  }
}

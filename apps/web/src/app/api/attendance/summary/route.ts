import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, apiFetch } from '../../../../lib/api';
import { getActiveBranchId } from '../../../../lib/session';
import { buildQuery } from '../../../../lib/utils';
import type { AttendanceSummary, AttendanceTrendPoint } from '../../../../lib/types';

/** Sana/guruh filtri o'zgaganda summary + trend (bootstrap faqat bugun). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const date = url.searchParams.get('date')?.trim() ?? '';
  const groupId = url.searchParams.get('groupId')?.trim() || undefined;
  const branchParam = url.searchParams.get('branchId');
  const cookieBranch = await getActiveBranchId();
  const branchId =
    branchParam === 'all' || branchParam === ''
      ? undefined
      : (branchParam ?? cookieBranch ?? undefined);

  if (!date) {
    return NextResponse.json({ message: 'date required' }, { status: 400 });
  }

  try {
    const [summary, trend] = await Promise.all([
      apiFetch<AttendanceSummary | null>(
        `/attendance/summary${buildQuery({ date, branchId, groupId })}`,
      ),
      apiFetch<AttendanceTrendPoint[]>(
        `/attendance/trend${buildQuery({ days: 30, branchId, groupId })}`,
      ),
    ]);
    return NextResponse.json({ summary, trend });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : 'Server xatosi';
    return NextResponse.json({ message, summary: null, trend: [] }, { status });
  }
}

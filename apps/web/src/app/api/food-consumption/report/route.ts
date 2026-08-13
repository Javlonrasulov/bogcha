import { NextResponse, type NextRequest } from 'next/server';
import type { FoodConsumptionReport } from '@bogcha/shared';
import { ApiError, apiFetch } from '../../../../lib/api';
import { getActiveBranchId } from '../../../../lib/session';
import { buildQuery } from '../../../../lib/utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const from = url.searchParams.get('from')?.trim() ?? '';
  const to = url.searchParams.get('to')?.trim() ?? '';
  const cookieBranch = await getActiveBranchId();
  const branchId = url.searchParams.get('branchId')?.trim() || cookieBranch || '';

  if (!from || !to || !branchId) {
    return NextResponse.json({ message: 'branchId, from, to required' }, { status: 400 });
  }

  try {
    const report = await apiFetch<FoodConsumptionReport>(
      `/food-consumption/report${buildQuery({ branchId, from, to })}`,
    );
    return NextResponse.json(report);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : 'Server xatosi';
    return NextResponse.json({ message }, { status });
  }
}

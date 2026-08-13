import { NextResponse } from 'next/server';
import { ApiError, apiFetch } from '../../../../lib/api';

/** Tarbiyachining guruhlari — token cookie orqali. */
export async function GET(): Promise<NextResponse> {
  try {
    const groups = await apiFetch<unknown[]>('/groups/my');
    return NextResponse.json(groups);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json([], { status });
  }
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, Clock, Users } from 'lucide-react';
import { useT } from '../../i18n/client';
import { formatDate, formatNumber, formatPercent, formatTime, todayIso } from '../../lib/utils';
import type { AttendanceBoard } from '../../lib/types';
import { Badge } from '../../components/ui/badge';
import { Card, CardBody } from '../../components/ui/card';
import { EmptyState, Progress } from '../../components/ui/misc';
import { Skeleton } from '../../components/ui/skeleton';

interface MyGroup {
  id: string;
  name: string;
  capacity: number;
  branch: { id: string; name: string };
  _count: { children: number };
}

/**
 * Tarbiyachi ekrani — BFF orqali guruhlari (TZ §32).
 * Asosiy bootstrap emas: faqat o'z guruhlari kerak.
 */
export function TeacherDashboardClient() {
  const t = useT();
  const [groups, setGroups] = useState<MyGroup[] | null>(null);
  const [boards, setBoards] = useState<Array<AttendanceBoard | null>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const groupsRes = await fetch('/api/attendance/my-groups', { cache: 'no-store' });
        const nextGroups = groupsRes.ok ? ((await groupsRes.json()) as MyGroup[]) : [];
        if (cancelled) return;
        setGroups(nextGroups);

        const boardResults = await Promise.all(
          nextGroups.map(async (group) => {
            const res = await fetch(
              `/api/attendance/board?groupId=${encodeURIComponent(group.id)}`,
              { cache: 'no-store' },
            );
            return res.ok ? ((await res.json()) as AttendanceBoard) : null;
          }),
        );
        if (!cancelled) setBoards(boardResults);
      } catch {
        if (!cancelled) setGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (groups === null) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">
          {t.attendance.markToday}
        </h1>
        <p className="mt-1 text-sm text-content-secondary">{formatDate(todayIso())}</p>
      </header>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            title={t.common.empty}
            hint={t.groups.noTeacher}
            icon={<Users className="size-5" />}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((group, index) => {
            const board = boards[index];
            const summary = board?.summary;
            const present = summary?.present ?? 0;
            const expected = summary?.expected ?? group._count.children;
            const rate = summary?.attendanceRate ?? 0;

            return (
              <Card key={group.id}>
                <CardBody className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-content">{group.name}</h2>
                      <p className="text-xs text-content-muted">{group.branch.name}</p>
                    </div>
                    {board?.isSubmitted ? (
                      <Badge tone="success" dot>
                        <CheckCircle2 className="size-3.5" />
                        {t.attendance.submitted}
                      </Badge>
                    ) : (
                      <Badge tone="warning" dot>
                        <Clock className="size-3.5" />
                        {t.attendance.notSubmitted}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="tabular text-2xl font-semibold text-content">
                      {formatNumber(present)}
                      <span className="text-base font-normal text-content-muted">
                        {' / '}
                        {formatNumber(expected)}
                      </span>
                    </p>
                    <Progress
                      value={rate}
                      tone={rate >= 85 ? 'success' : 'warning'}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-content-muted">
                      {t.dashboard.attendanceRate}: {formatPercent(rate)}
                      {board?.submittedAt ? ` · ${formatTime(board.submittedAt)}` : ''}
                    </p>
                  </div>

                  <Link
                    href={`/attendance?groupId=${group.id}`}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-brand-contrast transition-opacity hover:opacity-90"
                  >
                    <CalendarCheck className="size-4" />
                    {t.attendance.markToday}
                  </Link>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

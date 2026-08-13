'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarCheck, Clock, TriangleAlert } from 'lucide-react';
import { Permission } from '@bogcha/shared';
import { useAppData, useViewer } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import {
  buildQuery,
  formatDate,
  formatNumber,
  formatPercent,
  formatTime,
  todayIso,
} from '../../../lib/utils';
import type {
  AttendanceBoard as BoardData,
  AttendanceMissing,
  AttendanceSummary,
  AttendanceTrendPoint,
} from '../../../lib/types';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { EmptyState, FilterBar, MiniStat, Progress } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { DateField, FilterSelect } from '../../../components/ui/filters';
import { AttendanceTrendChart } from '../../../components/charts/charts';
import { AttendanceBoard } from './attendance-board';

export function AttendanceView() {
  const t = useT();
  const viewer = useViewer();
  const { data } = useAppData();
  const searchParams = useSearchParams();

  const date = searchParams.get('date') ?? todayIso();
  const groupId = searchParams.get('groupId') ?? '';
  const canMark = viewer.can(Permission.ATTENDANCE_MARK);
  const canManage = viewer.can(Permission.ATTENDANCE_MANAGE);
  const isToday = date === todayIso();
  const useStoreMetrics = isToday && !groupId;

  const [summary, setSummary] = useState<AttendanceSummary | null>(
    useStoreMetrics ? data.attendanceSummary : null,
  );
  const [trend, setTrend] = useState<AttendanceTrendPoint[]>(
    useStoreMetrics ? data.attendanceTrend : [],
  );
  const [missing, setMissing] = useState<AttendanceMissing>(
    isToday ? data.attendanceMissing : { date, groups: [] },
  );
  const [board, setBoard] = useState<BoardData | null>(null);

  const groups = data.groups;

  // Bugun + guruhsiz: bootstrap ma'lumotlaridan foydalanamiz.
  useEffect(() => {
    if (!useStoreMetrics) return;
    setSummary(data.attendanceSummary);
    setTrend(data.attendanceTrend);
  }, [useStoreMetrics, data.attendanceSummary, data.attendanceTrend]);

  useEffect(() => {
    if (!isToday) return;
    setMissing(canManage ? data.attendanceMissing : { date, groups: [] });
  }, [isToday, date, canManage, data.attendanceMissing]);

  // Sana yoki guruh filtri: summary + trend on-demand.
  useEffect(() => {
    if (useStoreMetrics) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/attendance/summary${buildQuery({ date, groupId: groupId || undefined })}`,
          { cache: 'no-store' },
        );
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as {
          summary: AttendanceSummary | null;
          trend: AttendanceTrendPoint[];
        };
        if (cancelled) return;
        setSummary(payload.summary);
        setTrend(payload.trend ?? []);
      } catch {
        if (!cancelled) {
          setSummary(null);
          setTrend([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useStoreMetrics, date, groupId]);

  // Bugundan boshqa sana: missing on-demand.
  useEffect(() => {
    if (!canManage) {
      setMissing({ date, groups: [] });
      return;
    }
    if (isToday) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/attendance/missing${buildQuery({ date })}`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as AttendanceMissing;
        if (!cancelled) setMissing(payload);
      } catch {
        if (!cancelled) setMissing({ date, groups: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isToday, date, canManage]);

  // Guruh tanlanganda board.
  useEffect(() => {
    if (!groupId) {
      setBoard(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/attendance/board${buildQuery({ groupId, date })}`,
          { cache: 'no-store' },
        );
        if (!res.ok || cancelled) {
          if (!cancelled) setBoard(null);
          return;
        }
        const payload = (await res.json()) as BoardData | null;
        if (!cancelled) setBoard(payload);
      } catch {
        if (!cancelled) setBoard(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, date]);

  const activeGroup = groups.find((group) => group.id === groupId);

  return (
    <>
      <PageHeader
        title={t.attendance.title}
        subtitle={t.attendance.subtitle}
        actions={<span className="text-sm text-content-secondary">{formatDate(date)}</span>}
      >
        <FilterBar>
          <DateField defaultValue={date} max={todayIso()} />
          <FilterSelect
            paramName="groupId"
            placeholder={t.common.allGroups}
            options={groups.map((group) => ({ value: group.id, label: group.name }))}
          />
        </FilterBar>
      </PageHeader>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat label={t.common.total} value={formatNumber(summary.total)} />
          <MiniStat
            label={t.dashboard.present}
            value={formatNumber(summary.present)}
            hint={`${t.common.of} ${formatNumber(summary.expected)}`}
            tone="success"
          />
          <MiniStat
            label={t.attendance.statuses.ABSENT_EXCUSED}
            value={formatNumber(summary.excused)}
            tone="warning"
          />
          <MiniStat
            label={t.attendance.statuses.ABSENT_UNEXCUSED}
            value={formatNumber(summary.unexcused)}
            tone="danger"
          />
          <MiniStat
            label={t.attendance.statuses.ON_VACATION}
            value={formatNumber(summary.onVacation)}
            tone="info"
          />
          <MiniStat
            label={t.dashboard.attendanceRate}
            value={formatPercent(summary.attendanceRate)}
            tone={summary.attendanceRate >= 85 ? 'success' : 'warning'}
          />
        </div>
      ) : null}

      {board && activeGroup ? (
        <Card>
          <CardHeader
            title={`${board.group.name} · ${t.attendance.markToday}`}
            subtitle={`${activeGroup.branchName} · ${formatDate(board.date)}`}
            action={
              board.isSubmitted ? (
                <Badge tone="success" dot>
                  {t.attendance.submitted}
                  {board.submittedAt ? ` · ${formatTime(board.submittedAt)}` : ''}
                </Badge>
              ) : (
                <Badge tone="warning" dot>
                  {t.attendance.notSubmitted}
                </Badge>
              )
            }
          />
          <CardBody>
            {board.children.length === 0 ? (
              <EmptyState title={t.common.empty} hint={t.children.noGroup} />
            ) : (
              <AttendanceBoard board={board} canMark={canMark} />
            )}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader title={t.attendance.trend} subtitle={`30 ${t.inventory.days}`} />
          <CardBody className="pb-3 pl-1 pr-3">
            {trend.length > 0 ? (
              <AttendanceTrendChart
                data={trend.map((point) => ({
                  date: point.date,
                  present: point.present,
                  total: point.total,
                  rate: point.attendanceRate,
                }))}
                labels={{ present: t.dashboard.present, rate: t.dashboard.attendanceRate }}
              />
            ) : (
              <EmptyState title={t.common.empty} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t.attendance.byGroup}
            subtitle={
              missing.groups.length === 0
                ? t.attendance.allSubmitted
                : `${missing.groups.length} ${t.attendance.notSubmitted.toLowerCase()}`
            }
            action={
              missing.groups.length > 0 ? (
                <Badge tone="warning" dot>
                  <TriangleAlert className="size-3.5" />
                  {formatNumber(missing.groups.length)}
                </Badge>
              ) : (
                <Badge tone="success" dot>
                  <CalendarCheck className="size-3.5" />
                  {t.attendance.allSubmitted}
                </Badge>
              )
            }
          />
          {groups.length === 0 ? (
            <EmptyState title={t.common.empty} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t.common.group}</Th>
                  <Th align="right">{t.dashboard.present}</Th>
                  <Th align="right">{t.dashboard.absent}</Th>
                  <Th align="right">{t.dashboard.attendanceRate}</Th>
                  <Th align="right">{t.common.actions}</Th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const notSubmitted = missing.groups.some((item) => item.id === group.id);
                  const groupRate =
                    group.todayPresent + group.todayAbsent > 0
                      ? (group.todayPresent / (group.todayPresent + group.todayAbsent)) * 100
                      : 0;
                  return (
                    <Tr key={group.id}>
                      <Td>
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-content">{group.name}</span>
                          {notSubmitted ? (
                            <Badge tone="warning">{t.attendance.notSubmitted}</Badge>
                          ) : null}
                        </span>
                        <span className="block text-xs text-content-muted">
                          {group.branchName} · {formatNumber(group.activeChildrenCount)}/
                          {formatNumber(group.capacity)}
                        </span>
                      </Td>
                      <Td align="right" className="tabular text-success">
                        {formatNumber(group.todayPresent)}
                      </Td>
                      <Td align="right" className="tabular text-danger">
                        {formatNumber(group.todayAbsent)}
                      </Td>
                      <Td align="right">
                        <span className="tabular block text-sm font-medium text-content">
                          {formatPercent(groupRate, 0)}
                        </span>
                        <Progress
                          value={groupRate}
                          size="sm"
                          tone={groupRate >= 85 ? 'success' : 'warning'}
                          className="mt-1 w-16"
                        />
                      </Td>
                      <Td align="right">
                        <Link
                          href={`/attendance?groupId=${group.id}&date=${date}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-brand-soft hover:text-brand-strong"
                        >
                          <Clock className="size-3.5" />
                          {canMark ? t.attendance.markToday : t.common.details}
                        </Link>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>
    </>
  );
}

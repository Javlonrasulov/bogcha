'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { Permission } from '@bogcha/shared';
import { useAppData, useViewer } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { formatNumber, formatPercent } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody } from '../../../components/ui/card';
import { EmptyState, MiniStat, Progress } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';

export function GroupsView() {
  const t = useT();
  const viewer = useViewer();
  const { data } = useAppData();
  const searchParams = useSearchParams();
  const search = (searchParams.get('search') ?? '').toLowerCase();

  const groups = useMemo(
    () =>
      search
        ? data.groups.filter((group) => group.name.toLowerCase().includes(search))
        : data.groups,
    [data.groups, search],
  );

  const totals = groups.reduce(
    (acc, group) => ({
      capacity: acc.capacity + group.capacity,
      children: acc.children + group.activeChildrenCount,
      present: acc.present + group.todayPresent,
    }),
    { capacity: 0, children: 0, present: 0 },
  );

  return (
    <>
      <PageHeader title={t.groups.title} subtitle={t.groups.subtitle} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label={t.groups.title} value={formatNumber(groups.length)} />
        <MiniStat
          label={t.groups.activeChildren}
          value={`${formatNumber(totals.children)} / ${formatNumber(totals.capacity)}`}
          hint={`${t.groups.occupancy}: ${formatPercent(
            totals.capacity > 0 ? (totals.children / totals.capacity) * 100 : 0,
            0,
          )}`}
        />
        <MiniStat label={t.dashboard.present} value={formatNumber(totals.present)} tone="success" />
        <MiniStat
          label={t.groups.freeSeats}
          value={formatNumber(Math.max(0, totals.capacity - totals.children))}
          tone="info"
        />
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            title={t.common.empty}
            hint={t.common.emptyHint}
            icon={<Users className="size-5" />}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const full = group.occupancyPercent >= 100;
            return (
              <Card key={group.id}>
                <CardBody className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-content">{group.name}</h2>
                      <p className="text-xs text-content-muted">
                        {group.branchName} · {group.ageFrom}–{group.ageTo} {t.children.years}
                      </p>
                    </div>
                    <Badge
                      tone={full ? 'danger' : group.occupancyPercent >= 85 ? 'warning' : 'success'}
                    >
                      {formatPercent(group.occupancyPercent, 0)}
                    </Badge>
                  </div>

                  <div>
                    <p className="tabular text-2xl font-semibold text-content">
                      {formatNumber(group.activeChildrenCount)}
                      <span className="text-base font-normal text-content-muted">
                        {' / '}
                        {formatNumber(group.capacity)}
                      </span>
                      <span className="ml-1.5 text-xs font-normal text-content-muted">
                        {t.groups.childrenCount.toLowerCase()}
                      </span>
                    </p>
                    <Progress
                      value={group.occupancyPercent}
                      tone={full ? 'danger' : group.occupancyPercent >= 85 ? 'warning' : 'brand'}
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Tile label={t.dashboard.present} value={group.todayPresent} tone="success" />
                    <Tile label={t.dashboard.absent} value={group.todayAbsent} tone="danger" />
                    <Tile
                      label={`30 ${t.inventory.days}`}
                      value={`${formatPercent(group.attendanceRate30d, 0)}`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <div className="min-w-0">
                      <p className="text-[0.7rem] uppercase tracking-wide text-content-muted">
                        {t.groups.teachers}
                      </p>
                      <p className="truncate text-sm text-content-secondary">
                        {group.teachers.length > 0
                          ? group.teachers.map((teacher) => teacher.fullName).join(', ')
                          : t.groups.noTeacher}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/children?groupId=${group.id}`}
                        className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-brand-soft hover:text-brand-strong"
                      >
                        {t.nav.children}
                      </Link>
                      {viewer.can(Permission.ATTENDANCE_MARK, Permission.ATTENDANCE_VIEW) ? (
                        <Link
                          href={`/attendance?groupId=${group.id}`}
                          className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-brand-soft hover:text-brand-strong"
                        >
                          {t.nav.attendance}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: 'success' | 'danger';
}) {
  const color =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-content';
  return (
    <div className="rounded-xl bg-surface-muted px-2 py-2">
      <p className={`tabular text-base font-semibold ${color}`}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      <p className="truncate text-[0.65rem] text-content-muted">{label}</p>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Baby, Users } from 'lucide-react';
import { ChildStatus, Permission } from '@bogcha/shared';
import { useAppData, useViewer } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { formatDate, formatMoney, formatNumber, formatPercent } from '../../../lib/utils';
import { CHILD_STATUS_TONE } from '../../../lib/tones';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { ButtonLink } from '../../../components/ui/button';
import {
  Avatar,
  EmptyState,
  FilterBar,
  MiniStat,
  Pagination,
} from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { FilterSelect, SearchField, ToggleFilter } from '../../../components/ui/filters';
import { ExportButton } from '../../../components/ui/export-button';

const PAGE_SIZE = 25;

export function ChildrenView() {
  const t = useT();
  const viewer = useViewer();
  const { data } = useAppData();
  const searchParams = useSearchParams();

  const search = (searchParams.get('search') ?? '').trim().toLowerCase();
  const status = searchParams.get('status') ?? '';
  const groupId = searchParams.get('groupId') ?? '';
  const hasDebt = searchParams.get('hasDebt') === 'true';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const filtered = useMemo(() => {
    return data.children.filter((child) => {
      if (status && child.status !== status) return false;
      if (groupId && child.groupId !== groupId) return false;
      if (hasDebt && child.outstandingDebt <= 0) return false;
      if (search) {
        const hay = [
          child.fullName,
          child.primaryGuardian?.phone ?? '',
          child.primaryGuardian?.fullName ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [data.children, search, status, groupId, hasDebt]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const debtors = filtered.filter((child) => child.outstandingDebt > 0).length;

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const q = params.toString();
    return q ? `?${q}` : '';
  }, [searchParams]);

  return (
    <>
      <PageHeader
        title={t.children.title}
        subtitle={t.children.subtitle}
        actions={
          <>
            <ExportButton
              size="md"
              label={t.common.exportExcel}
              table={{
                filename: 'bolalar',
                columns: [
                  t.common.fullName,
                  t.common.group,
                  t.children.gender,
                  t.children.birthDate,
                  t.children.enrolledAt,
                  t.common.status,
                  t.children.monthlyFee,
                  t.children.debt,
                ],
                rows: filtered.map((child) => [
                  child.fullName,
                  child.group?.name ?? '',
                  child.gender,
                  child.birthDate,
                  child.enrolledAt,
                  child.status,
                  child.monthlyFee,
                  child.outstandingDebt,
                ]),
              }}
            />
            {viewer.can(Permission.CHILD_MANAGE) ? (
              <ButtonLink href="/children/new" variant="primary" size="md">
                <Baby className="size-4" />
                {t.children.addChild}
              </ButtonLink>
            ) : null}
          </>
        }
      >
        <FilterBar>
          <SearchField placeholder={t.children.searchPlaceholder} />
          <FilterSelect
            paramName="groupId"
            placeholder={t.common.allGroups}
            options={data.groups.map((group) => ({ value: group.id, label: group.name }))}
          />
          <FilterSelect
            paramName="status"
            placeholder={t.common.status}
            options={Object.values(ChildStatus).map((value) => ({
              value,
              label: t.children.statuses[value],
            }))}
          />
          <ToggleFilter paramName="hasDebt" label={t.children.debt} />
        </FilterBar>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label={t.common.total} value={formatNumber(filtered.length)} />
        <MiniStat label={t.groups.title} value={formatNumber(data.groups.length)} />
        <MiniStat
          label={t.debts.debtorCount}
          value={formatNumber(debtors)}
          tone={debtors > 0 ? 'warning' : 'success'}
        />
        <MiniStat
          label={t.common.page}
          value={`${safePage} ${t.common.of} ${totalPages}`}
        />
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            title={t.common.empty}
            hint={t.common.emptyHint}
            icon={<Users className="size-5" />}
          />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t.common.fullName}</Th>
                  <Th>{t.common.group}</Th>
                  <Th align="center">{t.children.age}</Th>
                  <Th>{t.children.guardian}</Th>
                  <Th align="right">{t.children.netFee}</Th>
                  <Th align="right">{t.children.debt}</Th>
                  <Th>{t.common.status}</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((child) => (
                  <Tr key={child.id}>
                    <Td>
                      <Link
                        href={`/children/${child.id}`}
                        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                      >
                        <Avatar name={child.fullName} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-content">
                            {child.fullName}
                          </span>
                          <span className="block truncate text-xs text-content-muted">
                            {formatDate(child.birthDate)}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      {child.group ? (
                        child.group.name
                      ) : (
                        <span className="text-content-muted">{t.children.noGroup}</span>
                      )}
                    </Td>
                    <Td align="center" className="tabular">
                      {child.age}
                    </Td>
                    <Td>
                      {child.primaryGuardian ? (
                        <span className="block">
                          <span className="block truncate text-sm">
                            {child.primaryGuardian.fullName}
                          </span>
                          <span className="tabular block text-xs text-content-muted">
                            {child.primaryGuardian.phone}
                          </span>
                        </span>
                      ) : (
                        <span className="text-content-muted">—</span>
                      )}
                    </Td>
                    <Td align="right" className="tabular">
                      {formatMoney(child.netMonthlyFee)}
                      {child.discountPercent > 0 || child.discountAmount > 0 ? (
                        <span className="block text-xs text-info">
                          {t.children.discount}:{' '}
                          {child.discountPercent > 0
                            ? formatPercent(child.discountPercent, 0)
                            : formatMoney(child.discountAmount)}
                        </span>
                      ) : null}
                    </Td>
                    <Td align="right" className="tabular">
                      {child.outstandingDebt > 0 ? (
                        <span className="font-medium text-danger">
                          {formatMoney(child.outstandingDebt)}
                        </span>
                      ) : (
                        <span className="text-content-muted">—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={CHILD_STATUS_TONE[child.status] ?? 'neutral'} dot>
                        {t.children.statuses[child.status]}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              baseQuery={baseQuery}
              labels={t.common}
            />
          </>
        )}
      </Card>
    </>
  );
}

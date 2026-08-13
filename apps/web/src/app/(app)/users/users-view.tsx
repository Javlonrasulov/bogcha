'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Role } from '@bogcha/shared';
import { UserCog } from 'lucide-react';
import { useAppData, useViewer } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { formatDateTime, formatNumber } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { Avatar, EmptyState, FilterBar, MiniStat, Pagination } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { FilterSelect, SearchField } from '../../../components/ui/filters';
import { CreateUser, UserRowActions } from './user-form';

const PAGE_SIZE = 20;

/** Tashkilot ichida beriladigan rollar (SUPER_ADMIN platforma darajasida). */
const ASSIGNABLE_ROLES: Role[] = [
  Role.OWNER,
  Role.ADMINISTRATOR,
  Role.TEACHER,
  Role.COOK,
  Role.STOREKEEPER,
  Role.ACCOUNTANT,
];

export function UsersView() {
  const t = useT();
  const viewer = useViewer();
  const { data } = useAppData();
  const searchParams = useSearchParams();

  const search = (searchParams.get('search') ?? '').trim().toLowerCase();
  const role = searchParams.get('role') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const filtered = useMemo(() => {
    return data.users.filter((user) => {
      if (role && !user.roles.includes(role as Role)) return false;
      if (search) {
        const hay = [user.fullName, user.phone, user.email ?? ''].join(' ').toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [data.users, search, role]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeCount = filtered.filter((user) => user.isActive).length;
  const teacherCount = filtered.filter((user) => user.roles.includes(Role.TEACHER)).length;

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const q = params.toString();
    return q ? `?${q}` : '';
  }, [searchParams]);

  return (
    <>
      <PageHeader
        title={t.users.title}
        subtitle={t.users.subtitle}
        actions={
          <CreateUser
            roles={ASSIGNABLE_ROLES.map((value) => ({ value, label: t.roles[value] }))}
            branches={viewer.branches}
            groups={data.groups.map((group) => ({ id: group.id, name: group.name }))}
          />
        }
      >
        <FilterBar>
          <SearchField placeholder={t.common.searchPlaceholder} />
          <FilterSelect
            paramName="role"
            placeholder={t.users.roles}
            options={ASSIGNABLE_ROLES.map((value) => ({ value, label: t.roles[value] }))}
          />
        </FilterBar>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label={t.common.total} value={formatNumber(filtered.length)} />
        <MiniStat label={t.users.active} value={formatNumber(activeCount)} tone="success" />
        <MiniStat label={t.roles.TEACHER} value={formatNumber(teacherCount)} tone="brand" />
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            title={t.common.empty}
            hint={t.common.emptyHint}
            icon={<UserCog className="size-5" />}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{t.common.fullName}</Th>
                <Th>{t.users.roles}</Th>
                <Th>{t.users.assignedBranches}</Th>
                <Th>{t.users.lastLogin}</Th>
                <Th>{t.common.status}</Th>
                <Th align="right">{t.common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
                <Tr key={user.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={user.fullName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-content">{user.fullName}</p>
                        <p className="tabular truncate text-xs text-content-muted">
                          {user.phone}
                          {user.email ? ` · ${user.email}` : ''}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((item) => (
                        <Badge key={item} tone={item === Role.OWNER ? 'brand' : 'neutral'}>
                          {t.roles[item]}
                        </Badge>
                      ))}
                    </div>
                  </Td>
                  <Td className="text-xs text-content-muted">
                    {user.branches.length === 0
                      ? t.common.allBranches
                      : user.branches.map((item) => item.branch.name).join(', ')}
                    {user.groups.length > 0 ? (
                      <span className="block text-content-secondary">
                        {user.groups.map((item) => item.group.name).join(', ')}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="tabular text-xs text-content-muted">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : t.users.neverLoggedIn}
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Badge tone={user.isActive ? 'success' : 'danger'} dot>
                        {user.isActive ? t.users.active : t.users.inactive}
                      </Badge>
                      {user.mustChangePassword ? (
                        <span className="text-[0.7rem] text-warning">
                          {t.users.mustChangePassword}
                        </span>
                      ) : null}
                    </div>
                  </Td>
                  <Td align="right">
                    {user.id === viewer.userId ? (
                      <span className="text-xs text-content-muted">—</span>
                    ) : (
                      <UserRowActions id={user.id} isActive={user.isActive} />
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={filtered.length}
          baseQuery={baseQuery}
          labels={{
            showing: t.common.showing,
            rows: t.common.rows,
            page: t.common.page,
            of: t.common.of,
          }}
        />
      </Card>
    </>
  );
}

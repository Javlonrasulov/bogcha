import { Suspense } from 'react';
import { hasAnyPermission, Permission } from '@bogcha/shared';
import { apiSafe } from '../../lib/api';
import { getViewer } from '../../lib/auth';
import { visibleNav } from '../../lib/nav';
import type { NotificationList } from '../../lib/types';
import { getT } from '../../i18n/server';
import { AppDataProvider, RefreshDataButton, ViewerProvider } from '../../lib/app-data';
import { AppShell } from '../../components/shell/app-shell';
import { GlobalSearch } from '../../components/shell/global-search';
import { NotificationBell } from '../../components/shell/notification-bell';
import { LocaleSwitcher } from '../../components/shell/switchers';
import { TopbarBranchOrCalendar } from '../../components/shell/topbar-branch-or-calendar';
import { TopbarSearchSlot } from '../../components/shell/topbar-search-slot';
import { ThemeToggle } from '../../components/shell/theme-toggle';
import { UserMenu } from '../../components/shell/user-menu';

const emptyNotifications: NotificationList = {
  items: [],
  total: 0,
  page: 1,
  limit: 8,
  totalPages: 0,
  unreadCount: 0,
};

async function NotificationBellSlot() {
  const notifications = await apiSafe<NotificationList>(
    '/notifications?limit=8',
    emptyNotifications,
  );
  return (
    <NotificationBell
      initialUnread={notifications.unreadCount}
      initialItems={notifications.items}
    />
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [viewer, t] = await Promise.all([getViewer(), getT()]);

  const sections = visibleNav(viewer.user.permissions, hasAnyPermission);
  const showNotifications = viewer.can(Permission.NOTIFICATION_VIEW);
  const allowAllBranches = viewer.user.branchIds.length === 0 && viewer.branches.length > 1;
  const tenantName = viewer.branches[0]?.name ?? t.app.tagline;

  return (
    <AppDataProvider initialBranchId={viewer.branchId}>
      <ViewerProvider
        value={{
          branchId: viewer.branchId,
          requiredBranchId: viewer.requiredBranchId,
          permissions: viewer.user.permissions,
          roles: viewer.user.roles,
          fullName: viewer.user.fullName,
          userId: viewer.user.id,
          branches: viewer.branches.map((branch) => ({ id: branch.id, name: branch.name })),
        }}
      >
        <AppShell
          sections={sections}
          tenantName={tenantName}
          topbar={
            <>
              {viewer.can(Permission.DASHBOARD_VIEW) ? (
                <TopbarSearchSlot>
                  <GlobalSearch />
                </TopbarSearchSlot>
              ) : (
                <div className="flex-1" />
              )}
              <div className="ml-auto flex min-w-0 shrink items-center gap-1 sm:gap-2">
                <div className="hidden sm:block">
                  <RefreshDataButton />
                </div>
                <Suspense fallback={null}>
                  <TopbarBranchOrCalendar
                    branches={viewer.branches.map((branch) => ({
                      id: branch.id,
                      name: branch.name,
                      childrenCount: branch.childrenCount,
                    }))}
                    activeBranchId={viewer.branchId}
                    allowAll={allowAllBranches}
                  />
                </Suspense>
                <div className="hidden sm:block">
                  <ThemeToggle />
                </div>
                <LocaleSwitcher />
                {showNotifications ? (
                  <Suspense fallback={<NotificationBell initialUnread={0} initialItems={[]} />}>
                    <NotificationBellSlot />
                  </Suspense>
                ) : null}
                <UserMenu
                  fullName={viewer.user.fullName}
                  phone={viewer.user.phone}
                  roles={viewer.user.roles}
                />
              </div>
            </>
          }
        >
          {children}
        </AppShell>
      </ViewerProvider>
    </AppDataProvider>
  );
}

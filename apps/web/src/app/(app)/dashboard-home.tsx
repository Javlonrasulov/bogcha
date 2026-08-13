'use client';

import { Permission } from '@bogcha/shared';
import { useViewer } from '../../lib/app-data';
import { DashboardView } from './dashboard-view';
import { TeacherDashboardClient } from './teacher-dashboard-client';

/** Admin → DashboardView (store); tarbiyachi → alohida client yuklash. */
export function DashboardHome() {
  const viewer = useViewer();
  if (!viewer.can(Permission.DASHBOARD_VIEW)) {
    return <TeacherDashboardClient />;
  }
  return <DashboardView />;
}

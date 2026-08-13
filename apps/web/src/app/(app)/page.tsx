import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardHome } from './dashboard-home';
import { Skeleton } from '../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Dashboard' };

/** Server await yo'q — sahifa o'tishlari store orqali instant. */
export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <DashboardHome />
    </Suspense>
  );
}

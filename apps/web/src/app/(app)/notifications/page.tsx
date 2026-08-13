import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NotificationsView } from './notifications-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Bildirishnomalar' };

export default function NotificationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <NotificationsView />
    </Suspense>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GroupsView } from './groups-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Guruhlar' };

export default function GroupsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <GroupsView />
    </Suspense>
  );
}

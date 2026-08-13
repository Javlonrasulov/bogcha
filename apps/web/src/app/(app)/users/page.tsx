import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UsersView } from './users-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Foydalanuvchilar' };

export default function UsersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <UsersView />
    </Suspense>
  );
}

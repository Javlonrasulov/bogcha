import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DebtsView } from './debts-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Qarzdorlik' };

export default function DebtsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <DebtsView />
    </Suspense>
  );
}

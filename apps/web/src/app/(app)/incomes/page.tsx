import type { Metadata } from 'next';
import { Suspense } from 'react';
import { IncomesView } from './incomes-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Daromadlar' };

export default function IncomesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <IncomesView />
    </Suspense>
  );
}

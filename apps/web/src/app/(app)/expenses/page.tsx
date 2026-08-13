import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ExpensesView } from './expenses-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Xarajatlar' };

export default function ExpensesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <ExpensesView />
    </Suspense>
  );
}

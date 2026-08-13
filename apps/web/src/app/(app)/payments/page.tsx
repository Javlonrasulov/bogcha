import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentsView } from './payments-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: "To'lovlar" };

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <PaymentsView />
    </Suspense>
  );
}

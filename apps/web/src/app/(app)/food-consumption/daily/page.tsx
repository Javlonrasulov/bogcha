import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '../../../../components/ui/skeleton';
import { FoodDailyView } from './daily-view';

export const metadata: Metadata = { title: 'Kunlik jadval' };

export default function FoodDailyPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <FoodDailyView />
    </Suspense>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '../../../components/ui/skeleton';
import { FoodConsumptionView } from './food-consumption-view';

export const metadata: Metadata = { title: 'Mahsulotlar sarfi' };

export default function FoodConsumptionPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <FoodConsumptionView />
    </Suspense>
  );
}

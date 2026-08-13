import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InventoryView } from './inventory-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Ombor' };

export default function InventoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <InventoryView />
    </Suspense>
  );
}

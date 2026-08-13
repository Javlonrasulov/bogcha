import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SuppliersView } from './suppliers-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Yetkazib beruvchilar' };

export default function SuppliersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <SuppliersView />
    </Suspense>
  );
}

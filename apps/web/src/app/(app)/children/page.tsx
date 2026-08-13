import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChildrenView } from './children-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Bolalar' };

export default function ChildrenPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <ChildrenView />
    </Suspense>
  );
}

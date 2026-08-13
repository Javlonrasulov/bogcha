import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RecipesView } from './recipes-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Retseptlar' };

export default function RecipesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <RecipesView />
    </Suspense>
  );
}

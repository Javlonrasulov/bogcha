import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AttendanceView } from './attendance-view';
import { Skeleton } from '../../../components/ui/skeleton';

export const metadata: Metadata = { title: 'Davomat' };

export default function AttendancePage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <AttendanceView />
    </Suspense>
  );
}

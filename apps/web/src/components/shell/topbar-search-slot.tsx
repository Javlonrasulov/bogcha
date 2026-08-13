'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** Mahsulotlar sarfi sahifasida mobil qidiruvni yashirib, kalendarga joy ochadi. */
export function TopbarSearchSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const foodPage = pathname.startsWith('/food-consumption');

  return (
    <div className={foodPage ? 'hidden min-w-0 flex-1 sm:block' : 'min-w-0 flex-1'}>
      {children}
    </div>
  );
}

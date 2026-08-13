import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        '-mx-3 overflow-x-auto overscroll-x-contain px-3 sm:mx-0 sm:px-0',
        className,
      )}
    >
      <table className="w-full min-w-[36rem] border-collapse text-sm sm:min-w-[42rem]">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  align = 'left',
  className,
  width,
}: {
  children?: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  width?: string;
}) {
  return (
    <th
      style={width ? { width } : undefined}
      className={cn(
        'sticky top-0 z-10 border-b border-line bg-surface-muted/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-content-muted backdrop-blur',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  className,
  colSpan,
}: {
  children?: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'border-b border-line/70 px-4 py-3 text-content-secondary',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  interactive = true,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <tr
      className={cn(
        'group',
        interactive && 'transition-colors hover:bg-surface-muted/60',
        className,
      )}
    >
      {children}
    </tr>
  );
}

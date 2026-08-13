'use client';

import { RefreshCw } from 'lucide-react';
import { useAppDataOptional } from './provider';
import { useT } from '../../i18n/client';
import { cn } from '../utils';

/** Topbar: qo'lda ma'lumotlarni qayta yuklash (F5 o'rniga). */
export function RefreshDataButton() {
  const t = useT();
  const appData = useAppDataOptional();
  if (!appData) return null;

  return (
    <button
      type="button"
      onClick={() => void appData.refresh()}
      disabled={appData.refreshing || appData.status === 'loading'}
      title={t.common.refresh}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-surface text-sm text-content-secondary ring-1 ring-inset ring-line transition-colors hover:bg-surface-muted hover:text-content sm:h-9 sm:w-auto sm:px-2.5',
        (appData.refreshing || appData.status === 'loading') && 'opacity-60',
      )}
    >
      <RefreshCw className={cn('size-4', appData.refreshing && 'animate-spin')} />
      <span className="hidden sm:inline">{t.common.refresh}</span>
    </button>
  );
}

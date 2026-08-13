'use client';

import { CheckCheck, Check } from 'lucide-react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '../../actions/notifications';
import { useAppDataOptional } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { Button } from '../../../components/ui/button';

export function MarkAllRead({ disabled }: { disabled: boolean }) {
  const t = useT();
  const router = useRouter();
  const appData = useAppDataOptional();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="md"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsReadAction();
          await appData?.refresh();
          router.refresh();
        })
      }
    >
      <CheckCheck className="size-4" aria-hidden />
      {t.notifications.markAllRead}
    </Button>
  );
}

export function MarkOneRead({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const appData = useAppDataOptional();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title={t.notifications.markAllRead}
      onClick={() =>
        startTransition(async () => {
          await markNotificationReadAction(id);
          await appData?.refresh();
          router.refresh();
        })
      }
      className="grid size-8 shrink-0 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-muted hover:text-success disabled:opacity-50"
    >
      {pending ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
      ) : (
        <Check className="size-4" aria-hidden />
      )}
    </button>
  );
}

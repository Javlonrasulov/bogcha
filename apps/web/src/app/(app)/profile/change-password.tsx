'use client';

import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState, useTransition } from 'react';
import { changePasswordAction } from '../../actions/profile';
import { useT } from '../../../i18n/client';
import { cn } from '../../../lib/utils';
import { inputClass } from '../../../components/ui/filters';
import { Button } from '../../../components/ui/button';

/** Parolni o'zgartirish (TZ §40). */
export function ChangePasswordForm() {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = current.length >= 8 && next.length >= 8 && next === confirm;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.auth.currentPassword}
          </span>
          <input
            type={visible ? 'text' : 'password'}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className={inputClass}
            autoComplete="current-password"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.auth.newPassword}
          </span>
          <input
            type={visible ? 'text' : 'password'}
            value={next}
            onChange={(event) => setNext(event.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-content-secondary">
            {t.profile.confirmPassword}
          </span>
          <input
            type={visible ? 'text' : 'password'}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={cn(inputClass, mismatch && 'border-danger focus:border-danger')}
            autoComplete="new-password"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="md"
          disabled={!valid || pending}
          onClick={() =>
            startTransition(async () => {
              const result = await changePasswordAction({
                currentPassword: current,
                newPassword: next,
                confirmPassword: confirm,
              });
              if (result.ok) {
                setMessage({ ok: true, text: t.profile.passwordChanged });
                setCurrent('');
                setNext('');
                setConfirm('');
              } else {
                setMessage({ ok: false, text: result.error ?? t.common.error });
              }
            })
          }
        >
          {pending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <ShieldCheck className="size-4" aria-hidden />
          )}
          {t.profile.changePassword}
        </Button>
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-content-muted transition-colors hover:text-content"
        >
          {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {t.auth.password}
        </button>
        {mismatch ? <span className="text-xs text-danger">{t.profile.passwordMismatch}</span> : null}
        {message ? (
          <span className={cn('text-xs', message.ok ? 'text-success' : 'text-danger')}>
            {message.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

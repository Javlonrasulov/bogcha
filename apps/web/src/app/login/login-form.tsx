'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight, Eye, EyeOff, Lock, Phone } from 'lucide-react';
import { loginAction, type LoginState } from '../actions/auth';
import { useT } from '../../i18n/client';
import { cn } from '../../lib/utils';

export interface DemoAccount {
  label: string;
  identifier: string;
  password: string;
}

export function LoginForm({
  next,
  reason,
  demoAccounts,
}: {
  next?: string;
  reason?: string;
  demoAccounts: DemoAccount[];
}) {
  const t = useT();
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);

  const error = state.error ?? (reason === 'expired' ? t.auth.expired : undefined);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-content">{t.auth.welcome}</h1>
      <p className="mt-1.5 text-sm text-content-secondary">{t.auth.subtitle}</p>

      <form action={formAction} className="mt-7 space-y-4">
        <input type="hidden" name="next" value={next ?? '/'} />

        <Field
          label={t.auth.login}
          error={state.fieldErrors?.identifier}
          icon={<Phone className="size-4" />}
        >
          <input
            name="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            inputMode="text"
            required
            placeholder={t.auth.loginPlaceholder}
            className="h-12 w-full bg-transparent pl-10 pr-3 text-sm outline-none placeholder:text-content-muted"
          />
        </Field>

        <Field
          label={t.auth.password}
          error={state.fieldErrors?.password}
          icon={<Lock className="size-4" />}
        >
          <input
            name="password"
            type={visible ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            placeholder={t.auth.passwordPlaceholder}
            className="h-12 w-full bg-transparent pl-10 pr-11 text-sm outline-none placeholder:text-content-muted"
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
            aria-label={t.auth.password}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </Field>

        {error ? (
          <p className="animate-[rise_0.3s_both] rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <SubmitButton idle={t.auth.signIn} busy={t.auth.signingIn} />
      </form>

      {demoAccounts.length > 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface-muted/50 p-4">
          <p className="text-xs font-semibold text-content">{t.auth.demoTitle}</p>
          <p className="mt-0.5 text-[0.7rem] text-content-muted">{t.auth.demoHint}</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {demoAccounts.map((account) => (
              <button
                key={account.identifier}
                type="button"
                onClick={() => {
                  setIdentifier(account.identifier);
                  setPassword(account.password);
                }}
                className={cn(
                  'rounded-xl bg-surface px-2.5 py-2 text-left text-xs ring-1 ring-inset ring-line transition-all hover:-translate-y-0.5 hover:ring-brand/40',
                  identifier === account.identifier && 'ring-brand/60',
                )}
              >
                <span className="block font-medium text-content">{account.label}</span>
                <span className="tabular block text-[0.65rem] text-content-muted">
                  {account.identifier}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  error,
  icon,
  children,
}: {
  label: string;
  error?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-content-secondary">{label}</span>
      <span
        className={cn(
          'relative block overflow-hidden rounded-xl border bg-surface shadow-xs transition-all focus-within:ring-2',
          error
            ? 'border-danger/50 focus-within:ring-danger/15'
            : 'border-line focus-within:border-brand/60 focus-within:ring-brand/15',
        )}
      >
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted">
          {icon}
        </span>
        {children}
      </span>
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
    </label>
  );
}

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-all hover:brightness-105 disabled:opacity-70"
    >
      {pending ? busy : idle}
      {pending ? (
        <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}

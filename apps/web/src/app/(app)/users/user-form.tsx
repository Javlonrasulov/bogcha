'use client';

import { KeyRound, Power, UserPlus, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@bogcha/shared';
import {
  createUserAction,
  resetUserPasswordAction,
  updateUserAction,
} from '../../actions/users';
import { useAppDataOptional } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { cn } from '../../../lib/utils';
import { inputClass } from '../../../components/ui/filters';
import { Button } from '../../../components/ui/button';

interface Option {
  id: string;
  name: string;
}

/** Yangi foydalanuvchi qo'shish paneli — rollar, filiallar va guruhlar bilan. */
export function CreateUser({
  roles,
  branches,
  groups,
}: {
  roles: Array<{ value: Role; label: string }>;
  branches: Option[];
  groups: Option[];
}) {
  const t = useT();
  const router = useRouter();
  const appData = useAppDataOptional();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const needsGroups = selectedRoles.includes('TEACHER' as Role);
  const valid = fullName.trim().length >= 3 && phone.length >= 9 && password.length >= 8 && selectedRoles.length > 0;

  if (!open) {
    return (
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden />
        {t.users.title}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-soft lg:w-[34rem]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-content">{t.common.create}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid size-8 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
          aria-label={t.common.cancel}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.common.fullName}>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
            autoComplete="off"
          />
        </Field>
        <Field label={t.common.phone}>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
            autoComplete="off"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            autoComplete="off"
          />
        </Field>
        <Field label={t.auth.password}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>
      </div>

      <Field label={t.users.roles}>
        <div className="flex flex-wrap gap-1.5">
          {roles.map((role) => (
            <Chip
              key={role.value}
              active={selectedRoles.includes(role.value)}
              onClick={() => setSelectedRoles((current) => toggle(current, role.value))}
            >
              {role.label}
            </Chip>
          ))}
        </div>
      </Field>

      {branches.length > 1 ? (
        <Field label={t.common.branch}>
          <div className="flex flex-wrap gap-1.5">
            {branches.map((branch) => (
              <Chip
                key={branch.id}
                active={branchIds.includes(branch.id)}
                onClick={() => setBranchIds((current) => toggle(current, branch.id))}
              >
                {branch.name}
              </Chip>
            ))}
          </div>
        </Field>
      ) : null}

      {needsGroups && groups.length > 0 ? (
        <Field label={t.groups.title}>
          <div className="flex flex-wrap gap-1.5">
            {groups.map((group) => (
              <Chip
                key={group.id}
                active={groupIds.includes(group.id)}
                onClick={() => setGroupIds((current) => toggle(current, group.id))}
              >
                {group.name}
              </Chip>
            ))}
          </div>
        </Field>
      ) : null}

      {message ? (
        <p className={cn('text-xs', message.ok ? 'text-success' : 'text-danger')}>{message.text}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="md"
          disabled={!valid || pending}
          onClick={() =>
            startTransition(async () => {
              const result = await createUserAction({
                fullName: fullName.trim(),
                phone: phone.trim(),
                ...(email.trim() ? { email: email.trim() } : {}),
                password,
                roles: selectedRoles,
                branchIds,
                groupIds,
              });
              if (result.ok) {
                setMessage({ ok: true, text: t.common.saved });
                setFullName('');
                setPassword('');
                setEmail('');
                setSelectedRoles([]);
                await appData?.refresh();
                router.refresh();
              } else {
                setMessage({ ok: false, text: result.error ?? t.common.error });
              }
            })
          }
        >
          {pending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : null}
          {t.common.save}
        </Button>
        <Button variant="ghost" size="md" onClick={() => setOpen(false)}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}

/** Foydalanuvchini faollashtirish/o'chirish va parolni tiklash. */
export function UserRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const t = useT();
  const router = useRouter();
  const appData = useAppDataOptional();
  const [pending, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [note, setNote] = useState<string | null>(null);

  if (resetting) {
    return (
      <span className="flex items-center justify-end gap-1.5">
        <input
          type="text"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t.auth.password}
          className={cn(inputClass, 'h-8 w-32 text-xs')}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={password.length < 8 || pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resetUserPasswordAction(id, password);
              setNote(result.ok ? t.common.saved : (result.error ?? t.common.error));
              if (result.ok) {
                setResetting(false);
                setPassword('');
                await appData?.refresh();
                router.refresh();
              }
            })
          }
        >
          {t.common.confirm}
        </Button>
        <button
          type="button"
          onClick={() => setResetting(false)}
          className="grid size-8 place-items-center rounded-lg text-content-muted hover:bg-surface-muted"
          aria-label={t.common.cancel}
        >
          <X className="size-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center justify-end gap-1.5">
      {note ? <span className="text-xs text-success">{note}</span> : null}
      <button
        type="button"
        onClick={() => setResetting(true)}
        title={t.users.resetPassword}
        className="grid size-8 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
      >
        <KeyRound className="size-4" />
      </button>
      <button
        type="button"
        disabled={pending}
        title={isActive ? t.users.deactivate : t.users.activate}
        onClick={() =>
          startTransition(async () => {
            await updateUserAction(id, { isActive: !isActive });
            await appData?.refresh();
            router.refresh();
          })
        }
        className={cn(
          'grid size-8 place-items-center rounded-lg transition-colors hover:bg-surface-muted disabled:opacity-50',
          isActive ? 'text-success' : 'text-content-muted',
        )}
      >
        <Power className="size-4" />
      </button>
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-content-secondary">{label}</span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium transition-all',
        active
          ? 'bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand/25'
          : 'bg-surface-muted text-content-secondary hover:text-content',
      )}
    >
      {children}
    </button>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  Globe,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';
import type { Role } from '@bogcha/shared';
import { logoutAction } from '../../app/actions/auth';
import { setLocaleAction, setThemeAction, type ThemePreference } from '../../app/actions/preferences';
import { LOCALE_OPTIONS } from '../../i18n';
import { useI18n, useT } from '../../i18n/client';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/misc';
import { Dropdown, DropdownItem, DropdownLabel } from '../ui/dropdown';

const THEME_OPTIONS: Array<{ value: ThemePreference; Icon: typeof Sun }> = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Monitor },
];

export function UserMenu({
  fullName,
  phone,
  roles,
}: {
  fullName: string;
  phone: string;
  roles: Role[];
}) {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [theme, setTheme] = useState<ThemePreference>('system');

  useEffect(() => {
    const current = document.documentElement.dataset.theme as ThemePreference | undefined;
    if (current) setTheme(current);
  }, []);

  const applyTheme = (next: ThemePreference) => {
    setTheme(next);
    const resolved =
      next === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : next;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.dataset.theme = next;
    void setThemeAction(next);
  };

  const themeLabels: Record<ThemePreference, string> = {
    light: t.settings.themeLight,
    dark: t.settings.themeDark,
    system: t.settings.themeSystem,
  };

  return (
    <Dropdown
      panelClassName="w-[min(18rem,calc(100vw-1.5rem))]"
      trigger={({ open }) => (
        <span
          className={cn(
            'flex items-center gap-2 rounded-xl bg-surface py-1 pl-1 pr-1.5 ring-1 ring-inset ring-line transition-colors hover:bg-surface-muted sm:pr-2',
            open && 'bg-surface-muted',
            pending && 'opacity-60',
          )}
        >
          <Avatar name={fullName} size="sm" />
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-32 truncate text-xs font-medium leading-tight text-content">
              {fullName}
            </span>
            <span className="block truncate text-[0.65rem] leading-tight text-content-muted">
              {roles.map((role) => t.roles[role]).join(', ')}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'hidden size-3.5 text-content-muted transition-transform sm:block',
              open && 'rotate-180',
            )}
          />
        </span>
      )}
    >
      {({ close }) => (
        <>
          <div className="flex items-center gap-3 px-3.5 py-3">
            <Avatar name={fullName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-content">{fullName}</p>
              <p className="tabular truncate text-xs text-content-muted">{phone}</p>
            </div>
          </div>
          <DropdownLabel>{roles.map((role) => t.roles[role]).join(' · ')}</DropdownLabel>
          <Link
            href="/profile"
            onClick={close}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-content-secondary transition-colors hover:bg-surface-muted hover:text-content"
          >
            <UserRound className="size-4" />
            {t.auth.profile}
          </Link>

          {/* Mobil: tema va til topbardan chiqarilgan — shu yerda. */}
          <div className="sm:hidden">
            <DropdownLabel>{t.settings.theme}</DropdownLabel>
            {THEME_OPTIONS.map(({ value, Icon }) => (
              <DropdownItem
                key={value}
                active={theme === value}
                onClick={() => {
                  applyTheme(value);
                  close();
                }}
              >
                <Icon className="size-4" />
                <span className="flex-1">{themeLabels[value]}</span>
                {theme === value ? <Check className="size-4" /> : null}
              </DropdownItem>
            ))}
            <DropdownLabel>{t.settings.language}</DropdownLabel>
            {LOCALE_OPTIONS.map((option) => (
              <DropdownItem
                key={option.value}
                active={option.value === locale}
                onClick={() => {
                  close();
                  startTransition(async () => {
                    await setLocaleAction(option.value);
                    router.refresh();
                  });
                }}
              >
                <Globe className="size-4" />
                <span className="flex-1">{option.label}</span>
                {option.value === locale ? <Check className="size-4" /> : null}
              </DropdownItem>
            ))}
          </div>

          <div className="h-px bg-line/70" />
          <DropdownItem
            tone="danger"
            onClick={() => {
              close();
              startTransition(() => {
                void logoutAction();
              });
            }}
          >
            <LogOut className="size-4" />
            {t.auth.signOut}
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}

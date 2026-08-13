'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronDown, Globe } from 'lucide-react';
import { LOCALE_OPTIONS } from '../../i18n';
import { useI18n } from '../../i18n/client';
import { setBranchAction, setLocaleAction } from '../../app/actions/preferences';
import { useAppDataOptional } from '../../lib/app-data';
import { cn } from '../../lib/utils';
import { Dropdown, DropdownItem, DropdownLabel } from '../ui/dropdown';

const TRIGGER =
  'inline-flex h-9 items-center gap-1.5 rounded-xl bg-surface px-2 text-sm text-content-secondary ring-1 ring-inset ring-line transition-colors hover:bg-surface-muted hover:text-content sm:px-2.5';

export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = LOCALE_OPTIONS.find((option) => option.value === locale);

  return (
    <Dropdown
      trigger={({ open }) => (
        <span className={cn(TRIGGER, pending && 'opacity-60')}>
          <Globe className="size-4" />
          <span className="hidden sm:inline">{current?.shortLabel ?? locale}</span>
          <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        </span>
      )}
    >
      {({ close }) => (
        <>
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
              <span className="flex-1">{option.label}</span>
              {option.value === locale ? <Check className="size-4" /> : null}
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}

export function BranchSwitcher({
  branches,
  activeBranchId,
  allowAll,
}: {
  branches: Array<{ id: string; name: string; childrenCount: number }>;
  activeBranchId: string | null;
  allowAll: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const appData = useAppDataOptional();
  const [pending, startTransition] = useTransition();

  if (branches.length === 0) return null;

  const active = branches.find((branch) => branch.id === activeBranchId);
  const label = active?.name ?? t.common.allBranches;

  if (branches.length === 1 && !allowAll) {
    return (
      <span className="hidden items-center gap-1.5 rounded-xl bg-surface px-2.5 py-2 text-sm text-content-secondary ring-1 ring-inset ring-line sm:inline-flex">
        <Building2 className="size-4" />
        {branches[0]!.name}
      </span>
    );
  }

  const select = (branchId: string) =>
    startTransition(async () => {
      await setBranchAction(branchId);
      await appData?.refresh();
      router.refresh();
    });

  return (
    <Dropdown
      trigger={({ open }) => (
        <span className={cn(TRIGGER, 'max-w-[2.5rem] sm:max-w-[11rem]', pending && 'opacity-60')}>
          <Building2 className="size-4 shrink-0" />
          <span className="hidden truncate sm:inline">{label}</span>
          <ChevronDown
            className={cn(
              'hidden size-3.5 shrink-0 transition-transform sm:block',
              open && 'rotate-180',
            )}
          />
        </span>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>{t.common.branch}</DropdownLabel>
          {allowAll ? (
            <DropdownItem
              active={!activeBranchId}
              onClick={() => {
                close();
                select('all');
              }}
            >
              <span className="flex-1">{t.common.allBranches}</span>
              {!activeBranchId ? <Check className="size-4" /> : null}
            </DropdownItem>
          ) : null}
          {branches.map((branch) => (
            <DropdownItem
              key={branch.id}
              active={branch.id === activeBranchId}
              onClick={() => {
                close();
                select(branch.id);
              }}
            >
              <span className="flex-1 truncate">{branch.name}</span>
              <span className="tabular text-xs text-content-muted">{branch.childrenCount}</span>
              {branch.id === activeBranchId ? <Check className="size-4" /> : null}
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}

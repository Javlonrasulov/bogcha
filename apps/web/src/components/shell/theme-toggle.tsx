'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { setThemeAction, type ThemePreference } from '../../app/actions/preferences';
import { useT } from '../../i18n/client';
import { cn } from '../../lib/utils';

const OPTIONS: Array<{ value: ThemePreference; Icon: typeof Sun }> = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Monitor },
];

export function ThemeToggle() {
  const t = useT();
  const [theme, setTheme] = useState<ThemePreference>('system');

  useEffect(() => {
    const current = document.documentElement.dataset.theme as ThemePreference | undefined;
    if (current) setTheme(current);
  }, []);

  const apply = (next: ThemePreference) => {
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

  const labels: Record<ThemePreference, string> = {
    light: t.settings.themeLight,
    dark: t.settings.themeDark,
    system: t.settings.themeSystem,
  };

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl bg-surface-muted p-0.5 ring-1 ring-inset ring-line"
      role="group"
      aria-label={t.settings.theme}
    >
      {OPTIONS.map(({ value, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => apply(value)}
          title={labels[value]}
          aria-pressed={theme === value}
          className={cn(
            'grid size-7 place-items-center rounded-lg transition-all duration-200',
            theme === value
              ? 'bg-surface text-brand shadow-xs'
              : 'text-content-muted hover:text-content',
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

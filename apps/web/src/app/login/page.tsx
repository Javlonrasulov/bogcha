import type { Metadata } from 'next';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { getT } from '../../i18n/server';
import { ThemeToggle } from '../../components/shell/theme-toggle';
import { LocaleSwitcher } from '../../components/shell/switchers';
import { LoginForm, type DemoAccount } from './login-form';

export const metadata: Metadata = { title: 'Kirish' };

const DEMO_PASSWORD = 'Bogcha2026!';

const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: 'Owner', identifier: '+998901110001', password: DEMO_PASSWORD },
  { label: 'Administrator', identifier: '+998901110002', password: DEMO_PASSWORD },
  { label: 'Tarbiyachi', identifier: '+998901110011', password: DEMO_PASSWORD },
  { label: 'Oshpaz', identifier: '+998901110021', password: DEMO_PASSWORD },
  { label: 'Omborchi', identifier: '+998901110031', password: DEMO_PASSWORD },
  { label: 'Buxgalter', identifier: '+998901110041', password: DEMO_PASSWORD },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const [t, params] = await Promise.all([getT(), searchParams]);
  const showDemo = process.env.NODE_ENV !== 'production';

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Marketing paneli — faqat katta ekranlarda */}
      <aside className="relative hidden overflow-hidden bg-gradient-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(40rem 22rem at 12% 8%, rgba(255,255,255,0.22), transparent 65%), radial-gradient(34rem 20rem at 88% 92%, rgba(255,255,255,0.16), transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur">
            <Sparkles className="size-5" strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-base font-semibold leading-tight">{t.app.name}</p>
            <p className="text-xs text-white/70">{t.app.tagline}</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[2.1rem] font-semibold leading-[1.15] tracking-tight">
            {t.auth.marketingTitle}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/80">{t.auth.marketingBody}</p>
          <ul className="mt-8 space-y-3">
            {[t.auth.feature1, t.auth.feature2, t.auth.feature3].map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-white/90">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-white/70" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            { value: '3', label: t.branches.title },
            { value: '15+', label: t.navSections.operations },
            { value: '24/7', label: t.nav.notifications },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15 backdrop-blur"
            >
              <p className="text-xl font-semibold">{item.value}</p>
              <p className="text-[0.7rem] text-white/70">{item.label}</p>
            </div>
          ))}
        </div>
      </aside>

      <main className="relative flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>

        <div className="mb-8 flex items-center gap-2.5 pt-[env(safe-area-inset-top)] lg:hidden">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-brand text-white shadow-[var(--shadow-glow)]">
            <Sparkles className="size-4" strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-content">{t.app.name}</p>
            <p className="text-[0.7rem] text-content-muted">{t.app.tagline}</p>
          </div>
        </div>

        <LoginForm
          next={params.next}
          reason={params.reason}
          demoAccounts={showDemo ? DEMO_ACCOUNTS : []}
        />
      </main>
    </div>
  );
}

import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { getDictionary } from '../i18n';
import { I18nProvider } from '../i18n/client';
import { getLocale } from '../i18n/server';
import { THEME_COOKIE } from '../lib/session';

export const metadata: Metadata = {
  title: {
    default: "Bog'cha ERP",
    template: "%s · Bog'cha ERP",
  },
  description: "Bog'cha biznesini boshqarish va xarajatlarni optimallashtirish platformasi",
  applicationName: "Bog'cha ERP",
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f1a' },
  ],
};

/**
 * Tema cookie'da saqlanadi, shuning uchun server birinchi renderda to'g'ri
 * klassni beradi — "flash" bo'lmaydi. `system` holatida qisqa skript
 * qurilma sozlamasiga qaraydi.
 */
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )bogcha_theme=([^;]*)/);var t=m?decodeURIComponent(m[1]):'system';if(t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, store] = await Promise.all([getLocale(), cookies()]);
  const theme = store.get(THEME_COOKIE)?.value ?? 'system';
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={locale}
      className={theme === 'dark' ? 'dark' : undefined}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

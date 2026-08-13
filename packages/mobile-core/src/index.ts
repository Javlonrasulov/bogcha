/**
 * `@bogcha/mobile-core` — Admin va Tarbiyachi mobil ilovalari uchun umumiy qatlam:
 * tema, API mijozi, sessiya, offline navbat, i18n va UI kit.
 */

export * from './theme/tokens';
export * from './theme/provider';

export * from './api/session';
export * from './api/client';
export * from './api/auth-context';

export * from './offline/queue';
export * from './offline/cache';
export * from './offline/sync-context';

export * from './realtime/realtime-context';

export * from './hooks/use-resource';

export * from './i18n/dictionary';
export * from './i18n/provider';

export * from './ui/primitives';
export * from './ui/components';
export * from './ui/charts';
export * from './ui/status-meta';
export * from './ui/demo-banner';
export * from './ui/hero-banner';
export * from './ui/locale-switcher';
export * from './ui/notification-card';
export * from './ui/quick-actions';
export * from './ui/tab-bar-icon';
export * from './ui/toast';

export * from './utils/format';

export * from './screens/login-screen';
export * from './screens/child-profile-screen';

export { AppProviders } from './app-providers';

import { Permission } from '@bogcha/shared';
import type { Dictionary } from '../i18n';

export type NavSectionKey = keyof Dictionary['navSections'];
export type NavItemKey = keyof Dictionary['nav'];

export interface NavItem {
  key: NavItemKey;
  href: string;
  icon: IconName;
  /** Ushbu bo'limni ko'rish uchun kerakli huquqlardan kamida bittasi. */
  permissions: Permission[];
}

export interface NavSection {
  key: NavSectionKey;
  items: NavItem[];
}

export type IconName =
  | 'dashboard'
  | 'children'
  | 'groups'
  | 'attendance'
  | 'recipes'
  | 'foodConsumption'
  | 'inventory'
  | 'suppliers'
  | 'incomes'
  | 'expenses'
  | 'payments'
  | 'debts'
  | 'notifications'
  | 'users';

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'main',
    items: [
      {
        key: 'dashboard',
        href: '/',
        icon: 'dashboard',
        permissions: [Permission.DASHBOARD_VIEW],
      },
      {
        key: 'children',
        href: '/children',
        icon: 'children',
        permissions: [Permission.CHILD_VIEW, Permission.CHILD_VIEW_OWN_GROUP],
      },
      {
        key: 'groups',
        href: '/groups',
        icon: 'groups',
        permissions: [Permission.GROUP_VIEW],
      },
    ],
  },
  {
    key: 'operations',
    items: [
      {
        key: 'attendance',
        href: '/attendance',
        icon: 'attendance',
        permissions: [Permission.ATTENDANCE_VIEW, Permission.ATTENDANCE_MARK],
      },
      {
        key: 'recipes',
        href: '/recipes',
        icon: 'recipes',
        permissions: [Permission.RECIPE_VIEW],
      },
      {
        key: 'foodConsumption',
        href: '/food-consumption',
        icon: 'foodConsumption',
        permissions: [
          Permission.PRODUCT_VIEW,
          Permission.RECIPE_VIEW,
          Permission.STOCK_VIEW,
        ],
      },
    ],
  },
  {
    key: 'warehouse',
    items: [
      {
        key: 'inventory',
        href: '/inventory',
        icon: 'inventory',
        permissions: [Permission.STOCK_VIEW],
      },
      {
        key: 'suppliers',
        href: '/suppliers',
        icon: 'suppliers',
        permissions: [Permission.SUPPLIER_VIEW],
      },
    ],
  },
  {
    key: 'finance',
    items: [
      { key: 'incomes', href: '/incomes', icon: 'incomes', permissions: [Permission.INCOME_VIEW] },
      {
        key: 'expenses',
        href: '/expenses',
        icon: 'expenses',
        permissions: [Permission.EXPENSE_VIEW],
      },
      {
        key: 'payments',
        href: '/payments',
        icon: 'payments',
        permissions: [Permission.PAYMENT_VIEW],
      },
      { key: 'debts', href: '/debts', icon: 'debts', permissions: [Permission.DEBT_VIEW] },
    ],
  },
  {
    key: 'system',
    items: [
      {
        key: 'notifications',
        href: '/notifications',
        icon: 'notifications',
        permissions: [Permission.NOTIFICATION_VIEW],
      },
      { key: 'users', href: '/users', icon: 'users', permissions: [Permission.USER_MANAGE] },
    ],
  },
];

/** Foydalanuvchi huquqlariga mos menyu. */
export function visibleNav(
  granted: readonly Permission[],
  hasAny: (granted: readonly Permission[], required: readonly Permission[]) => boolean,
): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasAny(granted, item.permissions)),
  })).filter((section) => section.items.length > 0);
}

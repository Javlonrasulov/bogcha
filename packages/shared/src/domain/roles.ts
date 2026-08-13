import { ALL_PERMISSIONS, Permission } from './permissions';

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  ADMINISTRATOR: 'ADMINISTRATOR',
  TEACHER: 'TEACHER',
  COOK: 'COOK',
  STOREKEEPER: 'STOREKEEPER',
  ACCOUNTANT: 'ACCOUNTANT',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

const P = Permission;

/** Owner — bog'cha egasi: bitta tashkilot ichida to'liq biznes nazorati (TZ §3). */
const OWNER_PERMISSIONS: readonly Permission[] = [
  P.DASHBOARD_VIEW,
  P.BRANCH_VIEW,
  P.USER_VIEW,
  P.USER_MANAGE,
  P.CHILD_VIEW,
  P.CHILD_MANAGE,
  P.GROUP_VIEW,
  P.GROUP_MANAGE,
  P.ATTENDANCE_VIEW,
  P.ATTENDANCE_MANAGE,
  P.ATTENDANCE_MARK,
  P.RECIPE_VIEW,
  P.RECIPE_MANAGE,
  P.PRODUCT_VIEW,
  P.PRODUCT_MANAGE,
  P.STOCK_VIEW,
  P.STOCK_MANAGE,
  P.SUPPLIER_VIEW,
  P.SUPPLIER_MANAGE,
  P.INCOME_VIEW,
  P.INCOME_MANAGE,
  P.EXPENSE_VIEW,
  P.EXPENSE_MANAGE,
  P.PAYMENT_VIEW,
  P.PAYMENT_MANAGE,
  P.DEBT_VIEW,
  P.BUDGET_VIEW,
  P.BUDGET_MANAGE,
  P.NOTIFICATION_VIEW,
  P.FILE_VIEW,
  P.FILE_MANAGE,
];

/** Administrator — kundalik boshqaruv, lekin ish haqi va budjetga aralashmaydi. */
const ADMINISTRATOR_PERMISSIONS: readonly Permission[] = [
  P.DASHBOARD_VIEW,
  P.BRANCH_VIEW,
  P.USER_VIEW,
  P.CHILD_VIEW,
  P.CHILD_MANAGE,
  P.GROUP_VIEW,
  P.GROUP_MANAGE,
  P.ATTENDANCE_VIEW,
  P.ATTENDANCE_MARK,
  P.ATTENDANCE_MANAGE,
  P.RECIPE_VIEW,
  P.PRODUCT_VIEW,
  P.PRODUCT_MANAGE,
  P.STOCK_VIEW,
  P.STOCK_MANAGE,
  P.SUPPLIER_VIEW,
  P.SUPPLIER_MANAGE,
  P.INCOME_VIEW,
  P.EXPENSE_VIEW,
  P.EXPENSE_MANAGE,
  P.PAYMENT_VIEW,
  P.PAYMENT_MANAGE,
  P.DEBT_VIEW,
  P.NOTIFICATION_VIEW,
  P.FILE_VIEW,
  P.FILE_MANAGE,
];

/** Tarbiyachi — faqat o'z guruhi (TZ §3, §32). */
const TEACHER_PERMISSIONS: readonly Permission[] = [
  P.CHILD_VIEW_OWN_GROUP,
  P.GROUP_VIEW,
  P.ATTENDANCE_VIEW,
  P.ATTENDANCE_MARK,
  P.NOTIFICATION_VIEW,
];

const COOK_PERMISSIONS: readonly Permission[] = [
  P.RECIPE_VIEW,
  P.RECIPE_MANAGE,
  P.PRODUCT_VIEW,
  P.STOCK_VIEW,
  P.ATTENDANCE_VIEW,
  P.NOTIFICATION_VIEW,
];

const STOREKEEPER_PERMISSIONS: readonly Permission[] = [
  P.PRODUCT_VIEW,
  P.PRODUCT_MANAGE,
  P.STOCK_VIEW,
  P.STOCK_MANAGE,
  P.SUPPLIER_VIEW,
  P.SUPPLIER_MANAGE,
  P.NOTIFICATION_VIEW,
];

const ACCOUNTANT_PERMISSIONS: readonly Permission[] = [
  P.DASHBOARD_VIEW,
  P.INCOME_VIEW,
  P.INCOME_MANAGE,
  P.EXPENSE_VIEW,
  P.EXPENSE_MANAGE,
  P.PAYMENT_VIEW,
  P.PAYMENT_MANAGE,
  P.DEBT_VIEW,
  P.BUDGET_VIEW,
  P.CHILD_VIEW,
  P.NOTIFICATION_VIEW,
  P.PRODUCT_VIEW,
  P.STOCK_VIEW,
];

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [Role.SUPER_ADMIN]: ALL_PERMISSIONS,
  [Role.OWNER]: OWNER_PERMISSIONS,
  [Role.ADMINISTRATOR]: ADMINISTRATOR_PERMISSIONS,
  [Role.TEACHER]: TEACHER_PERMISSIONS,
  [Role.COOK]: COOK_PERMISSIONS,
  [Role.STOREKEEPER]: STOREKEEPER_PERMISSIONS,
  [Role.ACCOUNTANT]: ACCOUNTANT_PERMISSIONS,
};

export function permissionsForRoles(roles: readonly Role[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) set.add(permission);
  }
  return [...set];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

export function hasAnyPermission(
  granted: readonly Permission[],
  required: readonly Permission[],
): boolean {
  if (required.length === 0) return true;
  return required.some((permission) => granted.includes(permission));
}

/** Faqat SUPER_ADMIN tenant chegarasidan tashqariga chiqa oladi. */
export function isPlatformRole(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}

/** Tarbiyachi ilovasi faqat o'z guruhi bilan cheklanadi. */
export function isGroupScopedRole(role: Role): boolean {
  return role === Role.TEACHER;
}

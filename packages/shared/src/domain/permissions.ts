/**
 * Huquqlar `resource:action` shaklida. Guard'lar shu ro'yxatga tayanadi,
 * shuning uchun yangi endpoint qo'shilganda huquq ham shu yerda e'lon qilinadi.
 */
export const Permission = {
  DASHBOARD_VIEW: 'dashboard:view',

  TENANT_MANAGE: 'tenant:manage',
  TENANT_VIEW_ALL: 'tenant:view_all',
  BRANCH_VIEW: 'branch:view',

  USER_VIEW: 'user:view',
  USER_MANAGE: 'user:manage',

  CHILD_VIEW: 'child:view',
  CHILD_VIEW_OWN_GROUP: 'child:view_own_group',
  CHILD_MANAGE: 'child:manage',

  GROUP_VIEW: 'group:view',
  GROUP_MANAGE: 'group:manage',

  ATTENDANCE_VIEW: 'attendance:view',
  ATTENDANCE_MARK: 'attendance:mark',
  ATTENDANCE_MANAGE: 'attendance:manage',

  RECIPE_VIEW: 'recipe:view',
  RECIPE_MANAGE: 'recipe:manage',

  PRODUCT_VIEW: 'product:view',
  PRODUCT_MANAGE: 'product:manage',
  STOCK_VIEW: 'stock:view',
  STOCK_MANAGE: 'stock:manage',

  SUPPLIER_VIEW: 'supplier:view',
  SUPPLIER_MANAGE: 'supplier:manage',

  INCOME_VIEW: 'income:view',
  INCOME_MANAGE: 'income:manage',
  EXPENSE_VIEW: 'expense:view',
  EXPENSE_MANAGE: 'expense:manage',
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_MANAGE: 'payment:manage',
  DEBT_VIEW: 'debt:view',
  BUDGET_VIEW: 'budget:view',
  BUDGET_MANAGE: 'budget:manage',

  NOTIFICATION_VIEW: 'notification:view',

  FILE_VIEW: 'file:view',
  FILE_MANAGE: 'file:manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(Permission);

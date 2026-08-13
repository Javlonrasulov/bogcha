/**
 * Domen enumlari. Prisma sxemasidagi enumlar bilan bir xil qiymatlarda saqlanadi,
 * shuning uchun API va Web bitta manbadan foydalanadi.
 */

export const ChildStatus = {
  ACTIVE: 'ACTIVE',
  ON_VACATION: 'ON_VACATION',
  TEMPORARILY_ABSENT: 'TEMPORARILY_ABSENT',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ChildStatus = (typeof ChildStatus)[keyof typeof ChildStatus];

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT_EXCUSED: 'ABSENT_EXCUSED',
  ABSENT_UNEXCUSED: 'ABSENT_UNEXCUSED',
  ON_VACATION: 'ON_VACATION',
  SICK: 'SICK',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

/** Davomat statusi bolani "kelgan" deb hisoblaydimi — oziq-ovqat normasi shunga bog'liq. */
export const PRESENT_STATUSES: readonly AttendanceStatus[] = [AttendanceStatus.PRESENT];

export const MealType = {
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  SNACK: 'SNACK',
} as const;
export type MealType = (typeof MealType)[keyof typeof MealType];

export const Weekday = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
} as const;
export type Weekday = (typeof Weekday)[keyof typeof Weekday];

export const StockMovementType = {
  IN: 'IN',
  OUT: 'OUT',
  RETURN: 'RETURN',
  ADJUSTMENT: 'ADJUSTMENT',
  WRITE_OFF: 'WRITE_OFF',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

/** Ombor harakati manbasi — avtomatik sarfni qo'lda kiritilgandan ajratish uchun. */
export const StockMovementSource = {
  MANUAL: 'MANUAL',
  PURCHASE: 'PURCHASE',
  NUTRITION_CONSUMPTION: 'NUTRITION_CONSUMPTION',
  INVENTORY_COUNT: 'INVENTORY_COUNT',
  TRANSFER: 'TRANSFER',
} as const;
export type StockMovementSource = (typeof StockMovementSource)[keyof typeof StockMovementSource];

export const PurchaseRequestStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ORDERED: 'ORDERED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type PurchaseRequestStatus =
  (typeof PurchaseRequestStatus)[keyof typeof PurchaseRequestStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  ONLINE: 'ONLINE',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

/** Xarajat kategoriyalari (TZ §17). FOOD avtomatik oziq-ovqat sarfidan yoziladi. */
export const ExpenseCategoryKind = {
  FOOD: 'FOOD',
  PAYROLL: 'PAYROLL',
  RENT: 'RENT',
  UTILITIES: 'UTILITIES',
  TRANSPORT: 'TRANSPORT',
  STATIONERY: 'STATIONERY',
  REPAIR: 'REPAIR',
  MEDICINE: 'MEDICINE',
  TAX: 'TAX',
  MARKETING: 'MARKETING',
  OTHER: 'OTHER',
} as const;
export type ExpenseCategoryKind =
  (typeof ExpenseCategoryKind)[keyof typeof ExpenseCategoryKind];

export const IncomeCategoryKind = {
  TUITION: 'TUITION',
  EXTRA_SERVICE: 'EXTRA_SERVICE',
  ENROLLMENT_FEE: 'ENROLLMENT_FEE',
  OTHER: 'OTHER',
} as const;
export type IncomeCategoryKind = (typeof IncomeCategoryKind)[keyof typeof IncomeCategoryKind];

export const StaffPosition = {
  TEACHER: 'TEACHER',
  COOK: 'COOK',
  ASSISTANT: 'ASSISTANT',
  ADMINISTRATOR: 'ADMINISTRATOR',
  STOREKEEPER: 'STOREKEEPER',
  ACCOUNTANT: 'ACCOUNTANT',
  MANAGER: 'MANAGER',
  NURSE: 'NURSE',
  SECURITY: 'SECURITY',
  CLEANER: 'CLEANER',
} as const;
export type StaffPosition = (typeof StaffPosition)[keyof typeof StaffPosition];

export const EmploymentStatus = {
  ACTIVE: 'ACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED',
} as const;
export type EmploymentStatus = (typeof EmploymentStatus)[keyof typeof EmploymentStatus];

export const PayrollStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
} as const;
export type PayrollStatus = (typeof PayrollStatus)[keyof typeof PayrollStatus];

export const NotificationSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type NotificationSeverity =
  (typeof NotificationSeverity)[keyof typeof NotificationSeverity];

export const NotificationKind = {
  LOW_STOCK: 'LOW_STOCK',
  EXPENSE_SPIKE: 'EXPENSE_SPIKE',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  DEBT_ALERT: 'DEBT_ALERT',
  PAYMENT_DUE: 'PAYMENT_DUE',
  STAFF_LATE: 'STAFF_LATE',
  ABNORMAL_CONSUMPTION: 'ABNORMAL_CONSUMPTION',
  ATTENDANCE_DROP: 'ATTENDANCE_DROP',
  PRICE_SPIKE: 'PRICE_SPIKE',
  PURCHASE_APPROVAL: 'PURCHASE_APPROVAL',
  NEW_PURCHASE: 'NEW_PURCHASE',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  EXPORT: 'EXPORT',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const StaffAttendanceEvent = {
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
} as const;
export type StaffAttendanceEvent =
  (typeof StaffAttendanceEvent)[keyof typeof StaffAttendanceEvent];

/** Vizual status indikatori (TZ §34). */
export const HealthLevel = {
  GOOD: 'GOOD',
  WARNING: 'WARNING',
  BAD: 'BAD',
} as const;
export type HealthLevel = (typeof HealthLevel)[keyof typeof HealthLevel];

export const Locale = {
  UZ_LATN: 'uz',
  UZ_CYRL: 'uz-Cyrl',
  RU: 'ru',
  EN: 'en',
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

export const SUPPORTED_LOCALES: readonly Locale[] = [
  Locale.UZ_LATN,
  Locale.UZ_CYRL,
  Locale.RU,
];

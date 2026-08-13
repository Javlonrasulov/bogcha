/**
 * API javob tiplari — Web va mobil ilovalar uchun yagona shartnoma.
 *
 * Backend `DecimalSerializerInterceptor` orqali barcha Decimal qiymatlarni
 * `number`, Date'larni ISO stringga aylantiradi.
 */
import type { AttendanceDaySummary, TeacherDailyBoard } from '../dto/attendance.dto';
import type {
  AttendanceStatus,
  AuditAction,
  ChildStatus,
  EmploymentStatus,
  ExpenseCategoryKind,
  Gender,
  HealthLevel,
  IncomeCategoryKind,
  InvoiceStatus,
  Locale,
  MealType,
  NotificationKind,
  NotificationSeverity,
  PaymentMethod,
  PayrollStatus,
  PurchaseRequestStatus,
  StaffPosition,
  StockMovementSource,
  StockMovementType,
  Weekday,
} from '../domain/enums';
import type { Permission } from '../domain/permissions';
import type { Role } from '../domain/roles';
import type { Unit } from '../domain/units';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  tenantId: string | null;
  fullName: string;
  email: string | null;
  phone: string;
  roles: Role[];
  permissions: Permission[];
  branchIds: string[];
  groupIds: string[];
  locale: Locale;
  avatarUrl: string | null;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  managerName: string | null;
  capacity: number;
  isActive: boolean;
  groupCount: number;
  staffCount: number;
  childrenCount: number;
  occupancyPercent: number;
}

// ── Dashboard ────────────────────────────────────────────────

export interface DashboardOverview {
  period: string;
  date: string;
  today: {
    totalChildren: number;
    expected: number;
    present: number;
    absent: number;
    onVacation: number;
    marked: number;
    attendanceRate: number;
    /** Bugungi faol xodimlar soni (ixtiyoriy). */
    staffCount?: number;
    income: number;
    expense: number;
    foodCost: number;
    foodSaved: number;
    profit: number;
  };
  finance: {
    revenue: number;
    expense: number;
    netProfit: number;
    profitMargin: number;
    revenueGrowth: number;
    expenseGrowth: number;
    expectedPayments: number;
    collectedPayments: number;
    outstandingDebt: number;
    debtorCount: number;
    collectionRate: number;
  };
  inventory: {
    totalValue: number;
    lowStockCount: number;
    lowStockItems: Array<{
      productName: string;
      quantity: number;
      minQuantity: number;
      unit: Unit;
    }>;
    todayConsumption: number;
    weekConsumption: number;
  };
  /** KPI bloklari — mobil dashboard uchun. */
  kpi: {
    costPerChild: number;
    foodCostPerChild: number;
    profitPerChild: number;
    foodSavingsRate: number;
    staffCostRatio: number;
  };
  health: {
    attendance: HealthLevel;
    collection: HealthLevel;
    debt: HealthLevel;
    profitMargin: HealthLevel;
    staffCostRatio?: HealthLevel;
  };
}

export interface DashboardCharts {
  attendance: Array<{ date: string; present: number; total: number; rate: number }>;
  cashflow: Array<{ date: string; income: number; expense: number; profit: number }>;
}

export interface GlobalSearchResult {
  children: Array<{
    id: string;
    firstName: string;
    lastName: string;
    status: ChildStatus;
    group: { name: string } | null;
  }>;
  products: Array<{ id: string; name: string; unit: Unit }>;
  suppliers: Array<{ id: string; name: string; phone: string | null }>;
  groups: Array<{ id: string; name: string; branch: { name: string } }>;
}

// ── Bolalar ──────────────────────────────────────────────────

export interface Guardian {
  id: string;
  fullName: string;
  relation: string;
  phone: string;
  secondaryPhone: string | null;
  workplace: string | null;
  isPrimary: boolean;
}

export interface ChildListItem {
  id: string;
  branchId: string;
  groupId: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  fullName: string;
  birthDate: string;
  gender: Gender;
  avatarUrl: string | null;
  enrolledAt: string;
  withdrawnAt: string | null;
  status: ChildStatus;
  monthlyFee: number;
  discountPercent: number;
  discountAmount: number;
  netMonthlyFee: number;
  outstandingDebt: number;
  age: number;
  address: string | null;
  group: { id: string; name: string } | null;
  branch: { id: string; name: string };
  primaryGuardian: { fullName: string; phone: string; relation: string } | null;
}

export interface ChildProfile extends Omit<ChildListItem, 'primaryGuardian' | 'group'> {
  group: { id: string; name: string; capacity: number } | null;
  guardians: Guardian[];
  medicalNotes: string | null;
  note: string | null;
  discountReason: string | null;
  statistics: {
    attendanceRate90d: number;
    presentDays: number;
    absentDays: number;
    byStatus: Array<{ status: AttendanceStatus; count: number }>;
    outstandingDebt: number;
    totalPaid: number;
    daysEnrolled: number;
  };
  attendanceHistory: Array<{
    date: string;
    status: AttendanceStatus;
    arrivedAt: string | null;
    leftAt: string | null;
    note: string | null;
  }>;
  invoices: Invoice[];
  payments: Array<{
    id: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    receiptNumber: string;
    note: string | null;
  }>;
}

export interface Invoice {
  id: string;
  childId: string;
  period: string;
  dueDate: string;
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
}

// ── Guruhlar ─────────────────────────────────────────────────

export interface GroupListItem {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  ageFrom: number;
  ageTo: number;
  capacity: number;
  childrenCount: number;
  activeChildrenCount: number;
  occupancyPercent: number;
  teachers: Array<{ id: string; fullName: string }>;
  todayPresent: number;
  todayAbsent: number;
  attendanceRate30d: number;
}

export interface GroupDetail {
  id: string;
  name: string;
  branchId: string;
  ageFrom: number;
  ageTo: number;
  capacity: number;
  colorToken: string | null;
  isActive: boolean;
  branch: { id: string; name: string };
  teachers: Array<{
    userId: string;
    isPrimary: boolean;
    user: { id: string; fullName: string; phone: string };
  }>;
  children: Array<{
    id: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
    birthDate: string;
    gender: Gender;
    status: ChildStatus;
    avatarUrl: string | null;
  }>;
}

/** Tarbiyachining o'z guruhlari (`GET /groups/my`). */
export interface MyGroup {
  id: string;
  name: string;
  branchId: string;
  capacity: number;
  ageFrom: number;
  ageTo: number;
  isActive: boolean;
  branch: { id: string; name: string };
  _count: { children: number };
}

// ── Davomat ──────────────────────────────────────────────────

/** `GET /attendance/summary` — hisoblash logikasi bilan bir xil shakl. */
export type AttendanceSummary = AttendanceDaySummary;

/** `GET /attendance/board` — tarbiyachi ekrani. */
export type AttendanceBoard = TeacherDailyBoard;

export interface AttendanceRecord {
  id: string;
  childId: string;
  groupId: string;
  date: string;
  status: AttendanceStatus;
  arrivedAt: string | null;
  leftAt: string | null;
  note: string | null;
  child: { id: string; firstName: string; lastName: string; middleName: string | null };
  group: { id: string; name: string };
}

export interface AttendanceMissing {
  date: string;
  groups: Array<{
    id: string;
    name: string;
    branchName: string;
    childrenCount: number;
    teachers: string[];
  }>;
}

// ── Oziqlanish ───────────────────────────────────────────────

export interface NutritionDayRow {
  id: string;
  branchId: string;
  date: string;
  plannedHeadcount: number;
  actualHeadcount: number;
  totalPlannedCost: number;
  totalActualCost: number;
  totalSavedCost: number;
  costPerChild: number;
  isClosed: boolean;
  closedAt: string | null;
  branch: { id: string; name: string };
}

export interface NutritionCostPoint {
  date: string;
  headcount: number;
  plannedCost: number;
  actualCost: number;
  savedCost: number;
  costPerChild: number;
}

export interface Recipe {
  id: string;
  name: string;
  mealType: MealType;
  baseHeadcount: number;
  wastePercent: number;
  caloriesPerPortion: number | null;
  instructions: string | null;
  isActive: boolean;
  totalCost: number;
  costPerChild: number;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unit: Unit;
    product: { id: string; name: string; unit: Unit; unitCost: number };
  }>;
}

export interface Menu {
  id: string;
  branchId: string;
  name: string;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  branch: { id: string; name: string };
  slots: MenuSlot[];
  todayWeekday?: Weekday;
  todaySlots?: MenuSlot[];
}

export interface MenuSlot {
  id: string;
  weekday: Weekday;
  mealType: MealType;
  recipes: Array<{
    recipeId: string;
    portionFactor: number;
    recipe: { id: string; name: string; mealType: MealType; caloriesPerPortion: number | null };
  }>;
}

// ── Ombor ────────────────────────────────────────────────────

export interface StockOverview {
  items: StockRow[];
  totalValue: number;
  lowStockCount: number;
}

export interface StockRow {
  productId: string;
  productName: string;
  categoryName: string;
  unit: Unit;
  quantity: number;
  unitCost: number;
  totalValue: number;
  minQuantity: number;
  maxQuantity: number;
  averageDailyUsage: number;
  daysRemaining: number;
  isLow: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  source: StockMovementSource;
  quantity: number;
  unitCost: number;
  totalCost: number;
  balanceAfter: number;
  date: string;
  reason: string | null;
  documentNumber: string | null;
  product: { id: string; name: string; unit: Unit };
  supplier: { id: string; name: string } | null;
  branch: { id: string; name: string };
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  unit: Unit;
  unitCost: number;
  minQuantity: number;
  maxQuantity: number;
  shelfLifeDays: number | null;
  barcode: string | null;
  isActive: boolean;
  category: { id: string; name: string };
  defaultSupplier: { id: string; name: string } | null;
  totalQuantity: number;
  totalValue: number;
  isLow: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  _count: { products: number };
}

// ── Xaridlar ─────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  contactPerson: string | null;
  address: string | null;
  inn: string | null;
  note: string | null;
  isActive: boolean;
  balance: number;
  _count: { products: number };
}

export interface PurchaseOrder {
  id: string;
  branchId: string;
  number: string;
  status: PurchaseRequestStatus;
  neededBy: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  totalAmount: number;
  isPaid: boolean;
  generatedFromPlan: boolean;
  approvedAt: string | null;
  approvalComment: string | null;
  documentNumber: string | null;
  note: string | null;
  createdAt: string;
  supplier: { id: string; name: string; phone: string | null } | null;
  branch: { id: string; name: string };
  createdBy: { id: string; fullName: string } | null;
  approvedBy: { id: string; fullName: string } | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    receivedQuantity: number;
    product: { id: string; name: string; unit: Unit };
  }>;
}

// ── Moliya ───────────────────────────────────────────────────

export interface Expense {
  id: string;
  branchId: string;
  categoryId: string;
  amount: number;
  date: string;
  description: string | null;
  paymentMethod: PaymentMethod;
  isAutoGenerated: boolean;
  category: { id: string; name: string; kind: ExpenseCategoryKind };
  branch: { id: string; name: string };
  supplier: { id: string; name: string } | null;
}

export interface Income {
  id: string;
  branchId: string;
  categoryId: string;
  amount: number;
  date: string;
  description: string | null;
  paymentMethod: PaymentMethod;
  isAutoGenerated: boolean;
  category: { id: string; name: string; kind: IncomeCategoryKind };
  branch: { id: string; name: string };
}

export interface ExpenseCategory {
  id: string;
  name: string;
  kind: ExpenseCategoryKind;
  isSystem: boolean;
  isActive: boolean;
  currentMonthSpent: number;
}

export interface IncomeCategory {
  id: string;
  name: string;
  kind: IncomeCategoryKind;
  isSystem: boolean;
  isActive: boolean;
}

export interface FinanceSummary {
  period: string;
  revenue: number;
  expense: number;
  netProfit: number;
  profitMargin: number;
  expenseByCategory: Array<{
    categoryId: string;
    categoryName: string;
    kind: ExpenseCategoryKind;
    amount: number;
    share: number;
  }>;
  revenueByCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    share: number;
  }>;
  previousPeriod: { revenue: number; expense: number; netProfit: number };
  revenueGrowth: number;
  expenseGrowth: number;
  profitGrowth: number;
}

export interface PlanFactLine {
  label: string;
  plan: number;
  fact: number;
  variance: number;
  variancePercent: number;
  health: HealthLevel;
}

export interface PlanVsFact {
  period: string;
  hasBudget: boolean;
  revenue: PlanFactLine;
  expenseLines: PlanFactLine[];
  totalPlan: number;
  totalFact: number;
}

export interface Payment {
  id: string;
  branchId: string;
  childId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  receiptNumber: string;
  note: string | null;
  childFullName: string;
  child: {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
    group: { id: string; name: string } | null;
  };
  branch: { id: string; name: string };
}

export interface PaymentsSummary {
  period: string;
  expected: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
  invoiceCount: number;
  totalDebt: number;
  overdueInvoiceCount: number;
  debtorCount: number;
}

export interface DebtRow {
  childId: string;
  childFullName: string;
  groupName: string | null;
  branchName: string;
  guardianPhone: string | null;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  oldestDueDate: string | null;
  daysOverdue: number;
}

// ── Xodimlar ─────────────────────────────────────────────────

export interface Staff {
  id: string;
  branchId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  fullName: string;
  position: StaffPosition;
  phone: string;
  birthDate: string | null;
  hiredAt: string;
  firedAt: string | null;
  baseSalary: number;
  monthlyBonus: number;
  status: EmploymentStatus;
  address: string | null;
  note: string | null;
  avatarUrl: string | null;
  branch: { id: string; name: string };
  user: { id: string; roles: Role[]; isActive: boolean; lastLoginAt: string | null } | null;
}

export interface StaffAttendanceToday {
  date: string;
  totalStaff: number;
  checkedIn: number;
  lateCount: number;
  records: Array<{
    id: string;
    staffId: string;
    date: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    workedHours: number;
    lateMinutes: number;
    staff: { id: string; firstName: string; lastName: string; position: StaffPosition };
  }>;
}

/** `GET /staff/attendance/me` — mobil ilovadagi "Ishga keldim" holati (TZ §24). */
export interface MyStaffDay {
  staffId: string;
  position: StaffPosition;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedHours: number;
  lateMinutes: number;
}

export interface StaffAttendanceSummaryRow {
  staffId: string;
  fullName: string;
  position: StaffPosition;
  workedDays: number;
  expectedDays: number;
  totalHours: number;
  lateCount: number;
  totalLateMinutes: number;
  attendanceRate: number;
}

export interface Payroll {
  id: string;
  branchId: string;
  period: string;
  status: PayrollStatus;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  approvedAt: string | null;
  paidAt: string | null;
  branch: { id: string; name: string };
  items: Array<{
    id: string;
    staffId: string;
    baseSalary: number;
    workedDays: number;
    expectedDays: number;
    proratedBase: number;
    bonusAmount: number;
    allowanceAmount: number;
    deductionAmount: number;
    taxAmount: number;
    grossAmount: number;
    netAmount: number;
    note: string | null;
    staff: { id: string; firstName: string; lastName: string; position: StaffPosition };
  }>;
}

// ── Tizim ────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  branchId: string | null;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  metric: Record<string, number> | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationList extends Paginated<AppNotification> {
  unreadCount: number;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  summary: string;
  reason: string | null;
  oldValue: unknown;
  newValue: unknown;
  changedFields: string[];
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; fullName: string; roles: Role[] } | null;
}

export interface TenantSettings {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl: string | null;
    timezone: string;
    currency: string;
    locale: Locale;
    contactPhone: string | null;
    contactEmail: string | null;
    plan: { tier: string; name: string; maxBranches: number; maxChildren: number } | null;
  };
  settings: {
    normConfig: {
      baseHeadcount: number;
      wastePercent: number;
      roundingStep: number;
      roundingMode: string;
      staffMealFactor: number;
    };
    anomalyThresholds: Record<string, number>;
    payrollTaxPercent: number;
    invoiceDueDay: number;
    workdays: number[];
    shiftStart: string;
    shiftEnd: string;
    lateGraceMinutes: number;
  };
}

/* ── Hisobotlar (TZ §28) ───────────────────────────────────── */

export interface ReportRow {
  key: string;
  label: string;
  from: string;
  to: string;
  presentMarks: number;
  totalMarks: number;
  attendanceRate: number;
  averageHeadcount: number;
  revenue: number;
  expense: number;
  foodCost: number;
  netProfit: number;
  profitMargin: number;
  costPerChild: number;
  foodCostPerChild: number;
}

export interface ReportTotals {
  presentMarks: number;
  totalMarks: number;
  revenue: number;
  expense: number;
  foodCost: number;
  attendanceRate: number;
  netProfit: number;
  profitMargin: number;
}

export interface RangeReport {
  from: string;
  to: string;
  granularity: 'DAY' | 'WEEK' | 'MONTH';
  rows: ReportRow[];
  totals: ReportTotals;
}

export interface DailyReport {
  date: string;
  attendance: {
    enrolled: number;
    expected: number;
    marked: number;
    present: number;
    absentExcused: number;
    absentUnexcused: number;
    sick: number;
    onVacation: number;
    attendanceRate: number;
    groups: Array<{
      groupId: string;
      groupName: string;
      branchName: string;
      capacity: number;
      children: number;
      marked: number;
      present: number;
      attendanceRate: number;
    }>;
  };
  nutrition: {
    closed: boolean;
    headcount: number;
    plannedCost: number;
    actualCost: number;
    savedCost: number;
    costPerChild: number;
    savingRate: number;
    products: Array<{
      productName: string;
      unit: Unit;
      planned: number;
      actual: number;
      saved: number;
      cost: number;
    }>;
  };
  finance: {
    revenue: number;
    expense: number;
    netProfit: number;
    profitMargin: number;
    paymentCount: number;
    paymentAmount: number;
    incomeByCategory: Array<{
      categoryId: string;
      categoryName: string;
      kind: IncomeCategoryKind | null;
      count: number;
      amount: number;
    }>;
    expenseByCategory: Array<{
      categoryId: string;
      categoryName: string;
      kind: ExpenseCategoryKind | null;
      count: number;
      amount: number;
    }>;
  };
  inventory: {
    inValue: number;
    outValue: number;
    adjustmentValue: number;
    returnValue: number;
    movementCount: number;
  };
  purchases: Array<{
    id: string;
    number: string;
    status: PurchaseRequestStatus;
    supplierName: string | null;
    totalAmount: number;
  }>;
  staff: { active: number; checkedIn: number; late: number };
}

export interface MonthlyReport {
  period: string;
  from: string;
  to: string;
  children: number;
  staffCount: number;
  finance: ReportTotals;
  days: ReportRow[];
  payroll: { gross: number; net: number; tax: number };
  payments: {
    invoiceCount: number;
    expectedPayments: number;
    collectedPayments: number;
    collectionRate: number;
    outstandingDebt: number;
    debtorCount: number;
  };
  purchases: { count: number; amount: number };
}

export interface UserRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  roles: Role[];
  avatarUrl: string | null;
  locale: Locale;
  isActive: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  branches: Array<{ branchId: string; branch: { id: string; name: string } }>;
  groups: Array<{ groupId: string; group: { id: string; name: string } }>;
  permissions: Permission[];
}

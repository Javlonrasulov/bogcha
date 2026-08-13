import type {
  AttendanceMissing,
  AttendanceSummary,
  AttendanceTrendPoint,
  ChildListItem,
  DashboardCharts,
  DashboardOverview,
  DebtRow,
  Expense,
  ExpenseCategory,
  FinanceSummary,
  GroupListItem,
  Income,
  IncomeCategory,
  NotificationList,
  Paginated,
  Payment,
  PaymentsSummary,
  Product,
  Recipe,
  StockMovement,
  StockOverview,
  Supplier,
  UserRow,
} from '../types';

/** Kirishda bir marta yuklanadigan asosiy ro'yxatlar (Lider Navoiy usuli). */
export interface BootstrapPayload {
  loadedAt: string;
  branchId: string | null;
  period: string;
  children: ChildListItem[];
  groups: GroupListItem[];
  debts: DebtRow[];
  payments: Payment[];
  paymentsSummary: PaymentsSummary | null;
  suppliers: Supplier[];
  stock: StockOverview;
  stockMovements: StockMovement[];
  products: Product[];
  attendanceSummary: AttendanceSummary | null;
  attendanceTrend: AttendanceTrendPoint[];
  attendanceMissing: AttendanceMissing;
  incomes: Income[];
  incomeCategories: IncomeCategory[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  financeSummary: FinanceSummary | null;
  recipes: Recipe[];
  users: UserRow[];
  notifications: NotificationList;
  dashboard: {
    overview: DashboardOverview | null;
    charts: DashboardCharts;
  };
}

export type BootstrapStatus = 'idle' | 'loading' | 'ready' | 'error';

export const emptyBootstrap = (period: string, branchId: string | null = null): BootstrapPayload => ({
  loadedAt: new Date(0).toISOString(),
  branchId,
  period,
  children: [],
  groups: [],
  debts: [],
  payments: [],
  paymentsSummary: null,
  suppliers: [],
  stock: { items: [], totalValue: 0, lowStockCount: 0 },
  stockMovements: [],
  products: [],
  attendanceSummary: null,
  attendanceTrend: [],
  attendanceMissing: { date: '', groups: [] },
  incomes: [],
  incomeCategories: [],
  expenses: [],
  expenseCategories: [],
  financeSummary: null,
  recipes: [],
  users: [],
  notifications: {
    items: [],
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 0,
    unreadCount: 0,
  },
  dashboard: {
    overview: null,
    charts: { attendance: [], cashflow: [] },
  },
});

export function emptyPage<T>(): Paginated<T> {
  return { items: [], total: 0, page: 1, limit: 200, totalPages: 0 };
}

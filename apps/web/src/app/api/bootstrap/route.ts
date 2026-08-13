import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, apiFetch } from '../../../lib/api';
import { getActiveBranchId } from '../../../lib/session';
import { buildQuery, currentPeriod, monthRange, todayIso } from '../../../lib/utils';
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
} from '../../../lib/types';
import { emptyBootstrap, type BootstrapPayload } from '../../../lib/app-data/types';

const PAGE_LIMIT = 200;

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`[bootstrap] ${error.status} ${error.message}`);
      return fallback;
    }
    console.error('[bootstrap]', error);
    return fallback;
  }
}

/** Barcha sahifalarni limit=200 bilan yig'adi. */
async function fetchAllPages<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined | null>,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 50) {
    const result = await apiFetch<Paginated<T>>(
      `${path}${buildQuery({ ...query, page, limit: PAGE_LIMIT })}`,
    );
    items.push(...result.items);
    totalPages = Math.max(1, result.totalPages);
    if (result.items.length === 0) break;
    page += 1;
  }

  return items;
}

/**
 * Lider Navoiy usuli: asosiy ro'yxatlarni bir so'rovda yuklash.
 * Token cookie orqali apiFetch ichida olinadi — brauzerga chiqmaydi.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const period = url.searchParams.get('period')?.trim() || currentPeriod();
  const branchParam = url.searchParams.get('branchId');
  const cookieBranch = await getActiveBranchId();
  const branchId =
    branchParam === 'all' || branchParam === ''
      ? null
      : (branchParam ?? cookieBranch);

  const { from, to } = monthRange(period);
  const date = todayIso();
  const branchQ = { branchId: branchId ?? undefined };

  const [
    children,
    groups,
    debts,
    payments,
    paymentsSummary,
    suppliers,
    stock,
    stockMovements,
    products,
    attendanceSummary,
    attendanceTrend,
    attendanceMissing,
    incomes,
    incomeCategories,
    expenses,
    expenseCategories,
    financeSummary,
    recipes,
    users,
    notifications,
    overview,
    charts,
  ] = await Promise.all([
    safe(fetchAllPages<ChildListItem>('/children', { ...branchQ, sortBy: 'lastName', sortDir: 'asc' }), []),
    safe(apiFetch<GroupListItem[]>(`/groups${buildQuery(branchQ)}`), []),
    safe(fetchAllPages<DebtRow>('/debts', branchQ), []),
    safe(fetchAllPages<Payment>('/payments', { ...branchQ, from, to }), []),
    safe(
      apiFetch<PaymentsSummary | null>(`/payments/summary${buildQuery({ period, ...branchQ })}`),
      null,
    ),
    safe(fetchAllPages<Supplier>('/suppliers', {}), []),
    safe(
      apiFetch<StockOverview>(`/stock${buildQuery(branchQ)}`),
      { items: [], totalValue: 0, lowStockCount: 0 } satisfies StockOverview,
    ),
    safe(apiFetch<StockMovement[]>(`/stock/movements${buildQuery({ ...branchQ, limit: 40 })}`), []),
    safe(fetchAllPages<Product>('/products', { isActive: true }), []),
    safe(
      apiFetch<AttendanceSummary | null>(
        `/attendance/summary${buildQuery({ date, ...branchQ })}`,
      ),
      null,
    ),
    safe(
      apiFetch<AttendanceTrendPoint[]>(
        `/attendance/trend${buildQuery({ days: 30, ...branchQ })}`,
      ),
      [],
    ),
    safe(
      apiFetch<AttendanceMissing>(`/attendance/missing${buildQuery({ date })}`),
      { date, groups: [] } satisfies AttendanceMissing,
    ),
    safe(fetchAllPages<Income>('/incomes', { ...branchQ, from, to }), []),
    safe(apiFetch<IncomeCategory[]>('/income-categories'), []),
    safe(fetchAllPages<Expense>('/expenses', { ...branchQ, from, to }), []),
    safe(apiFetch<ExpenseCategory[]>('/expense-categories'), []),
    safe(
      apiFetch<FinanceSummary | null>(`/finance/summary${buildQuery({ period, ...branchQ })}`),
      null,
    ),
    safe(fetchAllPages<Recipe>('/nutrition/recipes', {}), []),
    safe(fetchAllPages<UserRow>('/users', {}), []),
    safe(
      apiFetch<NotificationList>('/notifications?limit=50'),
      {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        unreadCount: 0,
      } satisfies NotificationList,
    ),
    safe(
      apiFetch<DashboardOverview | null>(
        `/dashboard/overview${buildQuery({ ...branchQ, period })}`,
      ),
      null,
    ),
    safe(
      apiFetch<DashboardCharts>(
        `/dashboard/charts${buildQuery({ ...branchQ, days: 30 })}`,
      ),
      { attendance: [], cashflow: [] } satisfies DashboardCharts,
    ),
  ]);

  const payload: BootstrapPayload = {
    ...emptyBootstrap(period, branchId),
    loadedAt: new Date().toISOString(),
    branchId,
    period,
    children,
    groups,
    debts,
    payments,
    paymentsSummary,
    suppliers,
    stock,
    stockMovements,
    products,
    attendanceSummary,
    attendanceTrend,
    attendanceMissing,
    incomes,
    incomeCategories,
    expenses,
    expenseCategories,
    financeSummary,
    recipes,
    users,
    notifications,
    dashboard: { overview, charts },
  };

  return NextResponse.json(payload);
}

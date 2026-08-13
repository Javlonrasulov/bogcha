import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_ANOMALY_THRESHOLDS,
  HealthLevel,
  detectAttendanceDrop,
  detectDebtAlert,
  growthPercent,
  healthFromThresholds,
  percentage,
  roundMoney,
} from '@bogcha/shared';
import { ILike, IsNull, Not, type FindOptionsWhere, Repository } from 'typeorm';
import { applyBranchWhere } from '../common/scope/branch-qb.util';
import {
  branchFilter,
  requireTenant,
  type RequestScope,
  resolveBranchFilter,
} from '../common/scope/request-scope';
import {
  addDays,
  currentPeriod,
  formatDateOnly,
  periodRange,
  previousPeriod,
  todayDateOnly,
} from '../common/utils/date.util';
import { toNumber } from '../common/utils/decimal.util';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Branch } from '../entities/branch.entity';
import { Child } from '../entities/child.entity';
import { Expense } from '../entities/expense.entity';
import { Group } from '../entities/group.entity';
import { Income } from '../entities/income.entity';
import { Invoice } from '../entities/invoice.entity';
import { Product } from '../entities/product.entity';
import { StockItem } from '../entities/stock-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { AttendanceStatus, ChildStatus, InvoiceStatus } from '../entities/enums';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Child) private readonly children: Repository<Child>,
    @InjectRepository(AttendanceRecord)
    private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(Income) private readonly incomes: Repository<Income>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(StockItem) private readonly stockItems: Repository<StockItem>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Dashboardning birinchi ekrani: bugungi holat, moliya va ombor
   * (TZ §5, §46). Barcha so'rovlar parallel bajariladi.
   */
  async overview(scope: RequestScope, params: { branchId?: string; period?: string }) {
    const tenantId = requireTenant(scope);
    const period = params.period ?? currentPeriod();
    const today = todayDateOnly();
    const { start, end } = periodRange(period);
    const previous = periodRange(previousPeriod(period));
    const branchWhere = await resolveBranchFilter(this.branches, scope, params.branchId);

    const [
      enrolledChildren,
      todayAttendance,
      todayIncome,
      todayExpense,
      monthIncome,
      monthExpense,
      previousMonthIncome,
      previousMonthExpense,
      invoiceAggregate,
      debtAggregate,
      stockAggregate,
      lowStockItems,
    ] = await Promise.all([
      this.children.count({
        where: {
          tenantId,
          deletedAt: IsNull(),
          status: Not(ChildStatus.WITHDRAWN),
          ...branchWhere,
        },
      }),
      this.groupAttendanceByStatus(tenantId, today, today, branchWhere),
      this.sumIncome(tenantId, today, today, branchWhere),
      this.sumExpense(tenantId, today, today, branchWhere),
      this.sumIncome(tenantId, start, end, branchWhere),
      this.sumExpense(tenantId, start, end, branchWhere),
      this.sumIncome(tenantId, previous.start, previous.end, branchWhere),
      this.sumExpense(tenantId, previous.start, previous.end, branchWhere),
      this.aggInvoices(tenantId, period, branchWhere),
      this.aggDebts(tenantId, branchWhere),
      this.sumStockValue(tenantId, branchWhere),
      this.stockItems.find({
        where: {
          tenantId,
          ...branchWhere,
          product: { isActive: true, deletedAt: IsNull() },
        },
        relations: { product: true },
      }),
    ]);

    const presentToday =
      todayAttendance.find((row) => row.status === AttendanceStatus.PRESENT)?.count ?? 0;
    const markedToday = todayAttendance.reduce((acc, row) => acc + row.count, 0);
    const onVacationToday =
      todayAttendance.find((row) => row.status === AttendanceStatus.ON_VACATION)?.count ?? 0;
    const expectedToday = Math.max(0, enrolledChildren - onVacationToday);

    const revenue = toNumber(monthIncome);
    const expense = toNumber(monthExpense);
    const netProfit = roundMoney(revenue - expense);
    const perChildBasis = Math.max(1, enrolledChildren);
    const costPerChild = roundMoney(expense / perChildBasis);
    const profitPerChild = roundMoney(netProfit / perChildBasis);
    const foodCostPerChild = 0;
    const foodSavingsRate = 0;
    const staffCostRatio = 0;

    const previousRevenue = toNumber(previousMonthIncome);
    const previousExpense = toNumber(previousMonthExpense);

    const expectedPayments = toNumber(invoiceAggregate.totalAmount);
    const collectedPayments = toNumber(invoiceAggregate.paidAmount);
    const outstandingDebt = toNumber(debtAggregate.balance);
    const attendanceRate = percentage(presentToday, expectedToday);
    const collectionRate = percentage(collectedPayments, expectedPayments);

    const lowStock = lowStockItems.filter((item) => {
      const minQuantity = toNumber(item.product.minQuantity);
      return minQuantity > 0 && toNumber(item.quantity) <= minQuantity;
    });

    return {
      period,
      date: formatDateOnly(today),
      today: {
        totalChildren: enrolledChildren,
        expected: expectedToday,
        present: presentToday,
        absent: Math.max(0, expectedToday - presentToday),
        onVacation: onVacationToday,
        marked: markedToday,
        attendanceRate,
        staffCount: 0,
        income: toNumber(todayIncome),
        expense: toNumber(todayExpense),
        foodCost: 0,
        foodSaved: 0,
        profit: roundMoney(toNumber(todayIncome) - toNumber(todayExpense)),
      },
      finance: {
        revenue,
        expense,
        netProfit,
        profitMargin: percentage(netProfit, revenue),
        revenueGrowth: growthPercent(revenue, previousRevenue),
        expenseGrowth: growthPercent(expense, previousExpense),
        expectedPayments,
        collectedPayments,
        outstandingDebt,
        debtorCount: debtAggregate.count,
        collectionRate,
      },
      inventory: {
        totalValue: toNumber(stockAggregate),
        lowStockCount: lowStock.length,
        lowStockItems: lowStock.slice(0, 5).map((item) => ({
          productName: item.product.name,
          quantity: toNumber(item.quantity),
          minQuantity: toNumber(item.product.minQuantity),
          unit: item.product.unit,
        })),
        todayConsumption: 0,
        weekConsumption: 0,
      },
      kpi: {
        costPerChild,
        foodCostPerChild,
        profitPerChild,
        foodSavingsRate,
        staffCostRatio,
      },
      health: {
        attendance: healthFromThresholds({
          value: attendanceRate,
          warningAt: 85,
          criticalAt: 70,
          direction: 'HIGHER_IS_BETTER',
        }),
        collection: healthFromThresholds({
          value: collectionRate,
          warningAt: 85,
          criticalAt: 70,
          direction: 'HIGHER_IS_BETTER',
        }),
        debt: healthFromThresholds({
          value: percentage(outstandingDebt, expectedPayments),
          warningAt: 10,
          criticalAt: 20,
          direction: 'LOWER_IS_BETTER',
        }),
        profitMargin: netProfit >= 0 ? HealthLevel.GOOD : HealthLevel.BAD,
        staffCostRatio: HealthLevel.GOOD,
      },
    };
  }

  /** Dashboard grafiklari: davomat va daromad/xarajat trendlari. */
  async charts(scope: RequestScope, params: { branchId?: string; days?: number }) {
    const tenantId = requireTenant(scope);
    const days = Math.min(180, Math.max(7, params.days ?? 30));
    const to = todayDateOnly();
    const from = addDays(to, -days);
    const branchWhere = await resolveBranchFilter(this.branches, scope, params.branchId);

    const [attendance, incomes, expenses] = await Promise.all([
      this.groupAttendanceByDateStatus(tenantId, from, to, branchWhere),
      this.groupAmountByDate(this.incomes, 'income', tenantId, from, to, branchWhere, 'incDateBranchIds'),
      this.groupAmountByDate(this.expenses, 'expense', tenantId, from, to, branchWhere, 'expDateBranchIds'),
    ]);

    const attendanceByDate = new Map<string, { present: number; total: number }>();
    for (const row of attendance) {
      const key = formatDateOnly(row.date);
      const entry = attendanceByDate.get(key) ?? { present: 0, total: 0 };
      entry.total += row.count;
      if (row.status === AttendanceStatus.PRESENT) entry.present += row.count;
      attendanceByDate.set(key, entry);
    }

    const incomeByDate = new Map(incomes.map((row) => [formatDateOnly(row.date), toNumber(row.sum)]));
    const expenseByDate = new Map(
      expenses.map((row) => [formatDateOnly(row.date), toNumber(row.sum)]),
    );

    return {
      attendance: [...attendanceByDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({
          date,
          present: value.present,
          total: value.total,
          rate: percentage(value.present, value.total),
        })),
      cashflow: [...new Set([...incomeByDate.keys(), ...expenseByDate.keys()])]
        .sort()
        .map((date) => {
          const income = incomeByDate.get(date) ?? 0;
          const expense = expenseByDate.get(date) ?? 0;
          return { date, income, expense, profit: roundMoney(income - expense) };
        }),
    };
  }

  /** Kunlik anomaliya tekshiruvi — davomat pasayishi va qarzdorlik o'sishi. */
  async runAnomalyChecks(scope: RequestScope, params: { branchId: string }) {
    return this.checkBranchAnomalies(requireTenant(scope), params.branchId);
  }

  /**
   * Bitta filial uchun kunlik anomaliya tekshiruvi. So'rov konteksti talab
   * qilinmaydi — rejalashtiruvchi ham shu metodni chaqiradi (TZ §22).
   */
  async checkBranchAnomalies(tenantId: string, branchId: string) {
    const params = { branchId };
    const today = todayDateOnly();
    const branchWhere: FindOptionsWhere<{ branchId: string }> = { branchId: params.branchId };

    const [todayRows, historyRows, invoiceAgg] = await Promise.all([
      this.groupAttendanceByStatus(tenantId, today, today, branchWhere),
      this.groupAttendanceByStatus(tenantId, addDays(today, -30), addDays(today, -1), branchWhere),
      this.invoices
        .createQueryBuilder('inv')
        .select('COALESCE(SUM(inv.totalAmount), 0)', 'totalAmount')
        .addSelect('COALESCE(SUM(inv.balance), 0)', 'balance')
        .where('inv.tenantId = :tenantId', { tenantId })
        .andWhere('inv.branchId = :branchId', { branchId: params.branchId })
        .andWhere('inv.period = :period', { period: currentPeriod() })
        .andWhere('inv.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED })
        .getRawOne<{ totalAmount: string; balance: string }>(),
    ]);

    const rate = (rows: { status: AttendanceStatus; count: number }[]) => {
      const total = rows.reduce((acc, row) => acc + row.count, 0);
      const present = rows.find((row) => row.status === AttendanceStatus.PRESENT)?.count ?? 0;
      return percentage(present, total);
    };

    const anomalies = [
      detectAttendanceDrop({
        date: formatDateOnly(today),
        todayRate: rate(todayRows),
        averageRate: rate(historyRows),
        thresholds: DEFAULT_ANOMALY_THRESHOLDS,
      }),
      detectDebtAlert({
        period: currentPeriod(),
        outstandingDebt: toNumber(invoiceAgg?.balance),
        expectedPayments: toNumber(invoiceAgg?.totalAmount),
        thresholds: DEFAULT_ANOMALY_THRESHOLDS,
      }),
    ].filter((anomaly): anomaly is NonNullable<typeof anomaly> => anomaly !== null);

    const created = await this.notifications.publishAnomalies(tenantId, params.branchId, anomalies);
    return { checked: 2, detected: anomalies.length, created };
  }

  /** Global qidiruv (TZ §44) — bolalar, mahsulotlar, yetkazib beruvchilar, guruhlar. */
  async globalSearch(scope: RequestScope, term: string) {
    const tenantId = requireTenant(scope);
    const branchWhere = branchFilter(scope);
    const search = term.trim();
    if (search.length < 2) return { children: [], products: [], suppliers: [], groups: [] };

    const [children, products, suppliers, groups] = await Promise.all([
      this.children.find({
        where: [
          {
            tenantId,
            deletedAt: IsNull(),
            ...branchWhere,
            firstName: ILike(`%${search}%`),
          },
          {
            tenantId,
            deletedAt: IsNull(),
            ...branchWhere,
            lastName: ILike(`%${search}%`),
          },
        ],
        take: 8,
        relations: { group: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          group: { name: true },
        },
      }),
      this.products.find({
        where: { tenantId, deletedAt: IsNull(), name: ILike(`%${search}%`) },
        take: 8,
        select: { id: true, name: true, unit: true },
      }),
      this.suppliers.find({
        where: { tenantId, deletedAt: IsNull(), name: ILike(`%${search}%`) },
        take: 8,
        select: { id: true, name: true, phone: true },
      }),
      this.groups.find({
        where: {
          tenantId,
          deletedAt: IsNull(),
          ...branchWhere,
          name: ILike(`%${search}%`),
        },
        take: 8,
        relations: { branch: true },
        select: {
          id: true,
          name: true,
          branch: { name: true },
        },
      }),
    ]);

    return {
      children: children.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        status: c.status,
        group: c.group ? { name: c.group.name } : null,
      })),
      products,
      suppliers,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        branch: { name: g.branch.name },
      })),
    };
  }

  private async groupAttendanceByStatus(
    tenantId: string,
    from: Date,
    to: Date,
    branchWhere: FindOptionsWhere<{ branchId: string }>,
  ): Promise<{ status: AttendanceStatus; count: number }[]> {
    const qb = this.attendance
      .createQueryBuilder('ar')
      .innerJoin('ar.child', 'child')
      .select('ar.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ar.tenantId = :tenantId', { tenantId })
      .andWhere('ar.date >= :from AND ar.date <= :to', { from, to })
      .andWhere('child.deletedAt IS NULL')
      .groupBy('ar.status');
    applyBranchWhere(qb, 'child.branchId', branchWhere, 'attBranchIds');
    const rows = await qb.getRawMany<{ status: AttendanceStatus; count: string }>();
    return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
  }

  private async groupAttendanceByDateStatus(
    tenantId: string,
    from: Date,
    to: Date,
    branchWhere: FindOptionsWhere<{ branchId: string }>,
  ): Promise<{ date: Date; status: AttendanceStatus; count: number }[]> {
    const qb = this.attendance
      .createQueryBuilder('ar')
      .innerJoin('ar.child', 'child')
      .select('ar.date', 'date')
      .addSelect('ar.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ar.tenantId = :tenantId', { tenantId })
      .andWhere('ar.date >= :from AND ar.date <= :to', { from, to })
      .andWhere('child.deletedAt IS NULL')
      .groupBy('ar.date')
      .addGroupBy('ar.status');
    applyBranchWhere(qb, 'child.branchId', branchWhere, 'attDateBranchIds');
    const rows = await qb.getRawMany<{ date: Date; status: AttendanceStatus; count: string }>();
    return rows.map((row) => ({
      date: row.date instanceof Date ? row.date : new Date(row.date),
      status: row.status,
      count: Number(row.count),
    }));
  }

  private async sumIncome(
    tenantId: string,
    from: Date,
    to: Date,
    branchWhere: FindOptionsWhere<{ branchId: string }>,
  ): Promise<number> {
    const qb = this.incomes
      .createQueryBuilder('income')
      .select('COALESCE(SUM(income.amount), 0)', 'sum')
      .where('income.tenantId = :tenantId', { tenantId })
      .andWhere('income.deletedAt IS NULL')
      .andWhere('income.date >= :from AND income.date <= :to', { from, to });
    applyBranchWhere(qb, 'income.branchId', branchWhere, 'incBranchIds');
    const row = await qb.getRawOne<{ sum: string }>();
    return toNumber(row?.sum);
  }

  private async sumExpense(
    tenantId: string,
    from: Date,
    to: Date,
    branchWhere: FindOptionsWhere<{ branchId: string }>,
  ): Promise<number> {
    const qb = this.expenses
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'sum')
      .where('expense.tenantId = :tenantId', { tenantId })
      .andWhere('expense.deletedAt IS NULL')
      .andWhere('expense.date >= :from AND expense.date <= :to', { from, to });
    applyBranchWhere(qb, 'expense.branchId', branchWhere, 'expBranchIds');
    const row = await qb.getRawOne<{ sum: string }>();
    return toNumber(row?.sum);
  }

  private async aggInvoices(
    tenantId: string,
    period: string,
    branchWhere: FindOptionsWhere<{ branchId: string }>,
  ): Promise<{ totalAmount: number; paidAmount: number }> {
    const qb = this.invoices
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.totalAmount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(inv.paidAmount), 0)', 'paidAmount')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.period = :period', { period })
      .andWhere('inv.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED });
    applyBranchWhere(qb, 'inv.branchId', branchWhere, 'invBranchIds');
    const row = await qb.getRawOne<{ totalAmount: string; paidAmount: string }>();
    return {
      totalAmount: toNumber(row?.totalAmount),
      paidAmount: toNumber(row?.paidAmount),
    };
  }

  private async aggDebts(
    tenantId: string,
    branchWhere: FindOptionsWhere<{ branchId: string }>,
  ): Promise<{ balance: number; count: number }> {
    const qb = this.invoices
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.balance), 0)', 'balance')
      .addSelect('COUNT(*)', 'count')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.balance > 0')
      .andWhere('inv.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED });
    applyBranchWhere(qb, 'inv.branchId', branchWhere, 'debtBranchIds');
    const row = await qb.getRawOne<{ balance: string; count: string }>();
    return { balance: toNumber(row?.balance), count: Number(row?.count ?? 0) };
  }

  private async sumStockValue(
    tenantId: string,
    branchWhere: FindOptionsWhere<{ branchId: string }>,
  ): Promise<number> {
    const qb = this.stockItems
      .createQueryBuilder('stock')
      .select('COALESCE(SUM(stock.totalValue), 0)', 'sum')
      .where('stock.tenantId = :tenantId', { tenantId });
    applyBranchWhere(qb, 'stock.branchId', branchWhere, 'stockBranchIds');
    const row = await qb.getRawOne<{ sum: string }>();
    return toNumber(row?.sum);
  }

  private async groupAmountByDate(
    repo: Repository<Income> | Repository<Expense>,
    alias: string,
    tenantId: string,
    from: Date,
    to: Date,
    branchWhere: FindOptionsWhere<{ branchId: string }>,
    paramKey: string,
  ): Promise<{ date: Date; sum: number }[]> {
    const qb = repo
      .createQueryBuilder(alias)
      .select(`${alias}.date`, 'date')
      .addSelect(`COALESCE(SUM(${alias}.amount), 0)`, 'sum')
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.deletedAt IS NULL`)
      .andWhere(`${alias}.date >= :from AND ${alias}.date <= :to`, { from, to })
      .groupBy(`${alias}.date`);
    applyBranchWhere(qb, `${alias}.branchId`, branchWhere, paramKey);
    const rows = await qb.getRawMany<{ date: Date; sum: string }>();
    return rows.map((row) => ({
      date: row.date instanceof Date ? row.date : new Date(row.date),
      sum: toNumber(row.sum),
    }));
  }
}

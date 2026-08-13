import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_ANOMALY_THRESHOLDS,
  comparePlanFact,
  detectBudgetOverrun,
  growthPercent,
  percentage,
  roundMoney,
  type CreateExpenseInput,
  type CreateIncomeInput,
  type FinanceQuery,
  type FinancialSummary,
  type SetBudgetInput,
  type UpdateExpenseInput,
} from '@bogcha/shared';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  ILike,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import {
  assertBranchAllowed,
  branchFilter,
  requireTenant,
  type RequestScope,
  assertBranchInTenant,
  resolveBranchFilter,
} from '../common/scope/request-scope';
import { toNumber } from '../common/utils/decimal.util';
import { currentPeriod, periodRange, previousPeriod, toDateOnly } from '../common/utils/date.util';
import { paginate, paginated } from '../common/utils/pagination.util';
import { Branch } from '../entities/branch.entity';
import { BudgetLine } from '../entities/budget-line.entity';
import { Budget } from '../entities/budget.entity';
import { AuditAction, ExpenseCategoryKind, IncomeCategoryKind, PaymentMethod } from '../entities/enums';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { Expense } from '../entities/expense.entity';
import { IncomeCategory } from '../entities/income-category.entity';
import { Income } from '../entities/income.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeEvent, RealtimeGateway } from '../realtime/realtime.gateway';

type WhereExpense = FindOptionsWhere<Expense>;
type WhereIncome = FindOptionsWhere<Income>;

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Income) private readonly incomes: Repository<Income>,
    @InjectRepository(ExpenseCategory) private readonly expenseCategories: Repository<ExpenseCategory>,
    @InjectRepository(IncomeCategory) private readonly incomeCategories: Repository<IncomeCategory>,
    @InjectRepository(Budget) private readonly budgets: Repository<Budget>,
    @InjectRepository(BudgetLine) private readonly budgetLines: Repository<BudgetLine>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // ── Xarajatlar ────────────────────────────────────────────────

  async listExpenses(scope: RequestScope, query: FinanceQuery) {
    const tenantId = requireTenant(scope);
    const { skip, take } = paginate(query);
    const where = await this.buildExpenseWhere(scope, tenantId, query);

    const [items, total] = await this.expenses.findAndCount({
      where,
      skip,
      take,
      order: { date: 'DESC', createdAt: 'DESC' },
      relations: { category: true, branch: true, supplier: true },
    });

    const aggregate = await this.expenses
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'sum')
      .where(where)
      .getRawOne<{ sum: string }>();

    return {
      ...paginated(
        items.map((item) => ({
          ...item,
          category: item.category
            ? { id: item.category.id, name: item.category.name, kind: item.category.kind }
            : undefined,
          branch: item.branch ? { id: item.branch.id, name: item.branch.name } : undefined,
          supplier: item.supplier ? { id: item.supplier.id, name: item.supplier.name } : null,
        })),
        total,
        query,
      ),
      totalAmount: toNumber(aggregate?.sum),
    };
  }

  async createExpense(scope: RequestScope, input: CreateExpenseInput) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, input.branchId);

    const expense = await this.expenses.save(
      this.expenses.create({
        branchId: input.branchId,
        categoryId: input.categoryId,
        amount: input.amount,
        description: input.description ?? null,
        supplierId: input.supplierId ?? null,
        paymentMethod: (input.paymentMethod ?? PaymentMethod.CASH) as PaymentMethod,
        attachmentUrl: input.attachmentUrl ?? null,
        tenantId,
        date: toDateOnly(input.date),
        createdById: scope.userId || null,
      }),
    );

    const withCategory = await this.expenses.findOneOrFail({
      where: { id: expense.id },
      relations: { category: true },
    });

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Expense',
      entityId: withCategory.id,
      summary: `Xarajat: ${withCategory.category.name} — ${toNumber(withCategory.amount).toLocaleString('uz-UZ')} so'm`,
      newValue: withCategory,
    });

    await this.checkBudget(tenantId, input.branchId, input.categoryId, input.date);
    this.realtime.emitToBranch(input.branchId, RealtimeEvent.EXPENSE_CREATED, {
      amount: toNumber(withCategory.amount),
      categoryName: withCategory.category.name,
    });

    return withCategory;
  }

  async updateExpense(scope: RequestScope, id: string, input: UpdateExpenseInput) {
    const tenantId = requireTenant(scope);

    const before = await this.expenses.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('Xarajat topilmadi');
    assertBranchAllowed(scope, before.branchId);

    if (before.isAutoGenerated) {
      throw new NotFoundException(
        "Bu xarajat tizim tomonidan avtomatik yaratilgan. Manba hujjatni o'zgartiring.",
      );
    }

    const previousAmount = toNumber(before.amount);
    const oldValue = { ...before };

    Object.assign(before, {
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
      ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.attachmentUrl !== undefined ? { attachmentUrl: input.attachmentUrl } : {}),
      ...(input.date ? { date: toDateOnly(input.date) } : {}),
    });

    const expense = await this.expenses.save(before);

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'Expense',
      entityId: id,
      summary: `Xarajat o'zgartirildi: ${previousAmount.toLocaleString('uz-UZ')} → ${toNumber(expense.amount).toLocaleString('uz-UZ')} so'm`,
      oldValue,
      newValue: expense,
    });

    return expense;
  }

  async removeExpense(scope: RequestScope, id: string, reason?: string) {
    const tenantId = requireTenant(scope);

    const before = await this.expenses.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('Xarajat topilmadi');
    assertBranchAllowed(scope, before.branchId);

    before.deletedAt = new Date();
    await this.expenses.save(before);

    await this.auditService.record(scope, {
      action: AuditAction.DELETE,
      entityType: 'Expense',
      entityId: id,
      summary: `Xarajat o'chirildi: ${toNumber(before.amount).toLocaleString('uz-UZ')} so'm`,
      reason,
      oldValue: before,
    });

    return { success: true };
  }

  // ── Daromadlar ────────────────────────────────────────────────

  async listIncomes(scope: RequestScope, query: FinanceQuery) {
    const tenantId = requireTenant(scope);
    const { skip, take } = paginate(query);
    const where = await this.buildIncomeWhere(scope, tenantId, query);

    const [items, total] = await this.incomes.findAndCount({
      where,
      skip,
      take,
      order: { date: 'DESC', createdAt: 'DESC' },
      relations: { category: true, branch: true },
    });

    const aggregate = await this.incomes
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.amount), 0)', 'sum')
      .where(where)
      .getRawOne<{ sum: string }>();

    return {
      ...paginated(
        items.map((item) => ({
          ...item,
          category: item.category
            ? { id: item.category.id, name: item.category.name, kind: item.category.kind }
            : undefined,
          branch: item.branch ? { id: item.branch.id, name: item.branch.name } : undefined,
        })),
        total,
        query,
      ),
      totalAmount: toNumber(aggregate?.sum),
    };
  }

  async createIncome(scope: RequestScope, input: CreateIncomeInput) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, input.branchId);

    const income = await this.incomes.save(
      this.incomes.create({
        branchId: input.branchId,
        categoryId: input.categoryId,
        amount: input.amount,
        description: input.description ?? null,
        paymentMethod: (input.paymentMethod ?? PaymentMethod.CASH) as PaymentMethod,
        tenantId,
        date: toDateOnly(input.date),
        createdById: scope.userId || null,
      }),
    );

    const withCategory = await this.incomes.findOneOrFail({
      where: { id: income.id },
      relations: { category: true },
    });

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Income',
      entityId: withCategory.id,
      summary: `Daromad: ${withCategory.category.name} — ${toNumber(withCategory.amount).toLocaleString('uz-UZ')} so'm`,
      newValue: withCategory,
    });

    return withCategory;
  }

  // ── Kategoriyalar ─────────────────────────────────────────────

  async listExpenseCategories(scope: RequestScope) {
    const tenantId = requireTenant(scope);
    const { start, end } = periodRange(currentPeriod());

    const categories = await this.expenseCategories.find({
      where: { tenantId },
      order: { kind: 'ASC', name: 'ASC' },
    });

    const spent = await this.expenses
      .createQueryBuilder('e')
      .select('e.categoryId', 'categoryId')
      .addSelect('COALESCE(SUM(e.amount), 0)', 'sum')
      .where({
        tenantId,
        deletedAt: IsNull(),
        date: Between(start, end),
        ...branchFilter(scope),
      })
      .groupBy('e.categoryId')
      .getRawMany<{ categoryId: string; sum: string }>();

    const spentMap = new Map(spent.map((row) => [row.categoryId, toNumber(row.sum)]));

    return categories.map((category) => ({
      ...category,
      currentMonthSpent: spentMap.get(category.id) ?? 0,
    }));
  }

  async createExpenseCategory(
    scope: RequestScope,
    input: { name: string; kind: ExpenseCategoryKind },
  ) {
    const tenantId = requireTenant(scope);
    return this.expenseCategories.save(
      this.expenseCategories.create({ ...input, tenantId }),
    );
  }

  async listIncomeCategories(scope: RequestScope) {
    const tenantId = requireTenant(scope);
    return this.incomeCategories.find({
      where: { tenantId },
      order: { kind: 'ASC', name: 'ASC' },
    });
  }

  async createIncomeCategory(
    scope: RequestScope,
    input: { name: string; kind: IncomeCategoryKind },
  ) {
    const tenantId = requireTenant(scope);
    return this.incomeCategories.save(
      this.incomeCategories.create({ ...input, tenantId }),
    );
  }

  // ── Moliyaviy hisobot ─────────────────────────────────────────

  async summary(
    scope: RequestScope,
    params: { period?: string; branchId?: string },
  ): Promise<FinancialSummary> {
    const tenantId = requireTenant(scope);
    const period = params.period ?? currentPeriod();
    const { start, end } = periodRange(period);
    const previous = periodRange(previousPeriod(period));
    const branchWhere = await resolveBranchFilter(this.branches, scope, params.branchId);

    const [
      revenue,
      expense,
      expenseByCategory,
      revenueByCategory,
      previousRevenueValue,
      previousExpenseValue,
      categories,
      incomeCategories,
    ] = await Promise.all([
      this.sumAmount(this.incomes, {
        tenantId,
        deletedAt: IsNull(),
        date: Between(start, end),
        ...branchWhere,
      }),
      this.sumAmount(this.expenses, {
        tenantId,
        deletedAt: IsNull(),
        date: Between(start, end),
        ...branchWhere,
      }),
      this.sumByCategory(this.expenses, {
        tenantId,
        deletedAt: IsNull(),
        date: Between(start, end),
        ...branchWhere,
      }),
      this.sumByCategory(this.incomes, {
        tenantId,
        deletedAt: IsNull(),
        date: Between(start, end),
        ...branchWhere,
      }),
      this.sumAmount(this.incomes, {
        tenantId,
        deletedAt: IsNull(),
        date: Between(previous.start, previous.end),
        ...branchWhere,
      }),
      this.sumAmount(this.expenses, {
        tenantId,
        deletedAt: IsNull(),
        date: Between(previous.start, previous.end),
        ...branchWhere,
      }),
      this.expenseCategories.find({
        where: { tenantId },
        select: { id: true, name: true, kind: true },
      }),
      this.incomeCategories.find({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    const netProfit = roundMoney(revenue - expense);
    const previousProfit = roundMoney(previousRevenueValue - previousExpenseValue);

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const incomeCategoryMap = new Map(incomeCategories.map((category) => [category.id, category]));

    return {
      period,
      revenue,
      expense,
      netProfit,
      profitMargin: percentage(netProfit, revenue),
      expenseByCategory: expenseByCategory
        .map((row) => {
          const amount = row.amount;
          const category = categoryMap.get(row.categoryId);
          return {
            categoryId: row.categoryId,
            categoryName: category?.name ?? 'Boshqa',
            kind: category?.kind ?? 'OTHER',
            amount,
            share: percentage(amount, expense),
          };
        })
        .sort((a, b) => b.amount - a.amount),
      revenueByCategory: revenueByCategory
        .map((row) => {
          const amount = row.amount;
          return {
            categoryId: row.categoryId,
            categoryName: incomeCategoryMap.get(row.categoryId)?.name ?? 'Boshqa',
            amount,
            share: percentage(amount, revenue),
          };
        })
        .sort((a, b) => b.amount - a.amount),
      previousPeriod: {
        revenue: previousRevenueValue,
        expense: previousExpenseValue,
        netProfit: previousProfit,
      },
      revenueGrowth: growthPercent(revenue, previousRevenueValue),
      expenseGrowth: growthPercent(expense, previousExpenseValue),
      profitGrowth: growthPercent(netProfit, previousProfit),
    };
  }

  // ── Budjet: reja vs fakt ──────────────────────────────────────

  async setBudget(scope: RequestScope, input: SetBudgetInput) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, input.branchId);

    const budget = await this.dataSource.transaction(async (manager) => {
      let saved = await manager.findOne(Budget, {
        where: { branchId: input.branchId, period: input.period },
      });

      if (!saved) {
        saved = manager.create(Budget, {
          tenantId,
          branchId: input.branchId,
          period: input.period,
          plannedRevenue: input.plannedRevenue ?? null,
          plannedChildren: input.plannedChildren ?? null,
        });
      } else {
        saved.plannedRevenue = input.plannedRevenue ?? null;
        saved.plannedChildren = input.plannedChildren ?? null;
      }
      saved = await manager.save(saved);

      await manager.delete(BudgetLine, { budgetId: saved.id });
      await manager.save(
        input.lines.map((line) =>
          manager.create(BudgetLine, {
            budgetId: saved!.id,
            categoryId: line.categoryId,
            plannedAmount: line.plannedAmount,
          }),
        ),
      );

      return saved;
    });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'Budget',
      entityId: budget.id,
      summary: `${input.period} davri uchun budjet belgilandi`,
      newValue: input,
    });

    return this.planVsFact(scope, { period: input.period, branchId: input.branchId });
  }

  async planVsFact(scope: RequestScope, params: { period?: string; branchId?: string }) {
    const tenantId = requireTenant(scope);
    const period = params.period ?? currentPeriod();
    const { start, end } = periodRange(period);
    const branchWhere = await resolveBranchFilter(this.branches, scope, params.branchId);

    const [budget, actuals, revenue, categories] = await Promise.all([
      params.branchId
        ? this.budgets.findOne({
            where: { branchId: params.branchId, period },
            relations: { lines: true },
          })
        : this.budgets.findOne({
            where: { tenantId, period, ...branchWhere },
            relations: { lines: true },
          }),
      this.sumByCategory(this.expenses, {
        tenantId,
        deletedAt: IsNull(),
        date: Between(start, end),
        ...branchWhere,
      }),
      this.sumAmount(this.incomes, {
        tenantId,
        deletedAt: IsNull(),
        date: Between(start, end),
        ...branchWhere,
      }),
      this.expenseCategories.find({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    const nameMap = new Map(categories.map((category) => [category.id, category.name]));
    const actualMap = new Map(actuals.map((row) => [row.categoryId, row.amount]));

    const lines = (budget?.lines ?? []).map((line) =>
      comparePlanFact({
        label: nameMap.get(line.categoryId) ?? 'Boshqa',
        plan: toNumber(line.plannedAmount),
        fact: actualMap.get(line.categoryId) ?? 0,
        kind: 'COST',
      }),
    );

    const budgetedIds = new Set((budget?.lines ?? []).map((line) => line.categoryId));
    for (const [categoryId, amount] of actualMap) {
      if (budgetedIds.has(categoryId) || amount === 0) continue;
      lines.push(
        comparePlanFact({
          label: nameMap.get(categoryId) ?? 'Boshqa',
          plan: 0,
          fact: amount,
          kind: 'COST',
        }),
      );
    }

    const plannedRevenue = budget?.plannedRevenue ? toNumber(budget.plannedRevenue) : 0;

    return {
      period,
      hasBudget: Boolean(budget),
      revenue: comparePlanFact({
        label: 'Daromad',
        plan: plannedRevenue,
        fact: revenue,
        kind: 'REVENUE',
      }),
      expenseLines: lines.sort((a, b) => b.fact - a.fact),
      totalPlan: roundMoney(lines.reduce((acc, line) => acc + line.plan, 0)),
      totalFact: roundMoney(lines.reduce((acc, line) => acc + line.fact, 0)),
    };
  }

  private async checkBudget(
    tenantId: string,
    branchId: string,
    categoryId: string,
    date: string,
  ): Promise<void> {
    const period = date.slice(0, 7);
    const { start, end } = periodRange(period);

    const [budgetLine, actual, category] = await Promise.all([
      this.budgetLines
        .createQueryBuilder('line')
        .innerJoin('line.budget', 'budget')
        .where('line.categoryId = :categoryId', { categoryId })
        .andWhere('budget.branchId = :branchId', { branchId })
        .andWhere('budget.period = :period', { period })
        .getOne(),
      this.sumAmount(this.expenses, {
        tenantId,
        branchId,
        categoryId,
        deletedAt: IsNull(),
        date: Between(start, end),
      }),
      this.expenseCategories.findOne({
        where: { id: categoryId },
        select: { id: true, name: true },
      }),
    ]);

    if (!budgetLine || !category) return;

    const anomaly = detectBudgetOverrun({
      period,
      categoryId,
      categoryName: category.name,
      budget: toNumber(budgetLine.plannedAmount),
      actual,
      thresholds: DEFAULT_ANOMALY_THRESHOLDS,
    });

    if (anomaly) await this.notifications.publishAnomalies(tenantId, branchId, [anomaly]);
  }

  private async buildExpenseWhere(
    scope: RequestScope,
    tenantId: string,
    query: FinanceQuery,
  ): Promise<WhereExpense> {
    const where: WhereExpense = {
      tenantId,
      deletedAt: IsNull(),
      ...(await resolveBranchFilter(this.branches, scope, query.branchId)),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.paymentMethod
        ? { paymentMethod: query.paymentMethod as PaymentMethod }
        : {}),
      ...this.dateRangeWhere(query.from, query.to),
      ...(query.search ? { description: ILike(`%${query.search}%`) } : {}),
    };
    return where;
  }

  private async buildIncomeWhere(
    scope: RequestScope,
    tenantId: string,
    query: FinanceQuery,
  ): Promise<WhereIncome> {
    const where: WhereIncome = {
      tenantId,
      deletedAt: IsNull(),
      ...(await resolveBranchFilter(this.branches, scope, query.branchId)),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...this.dateRangeWhere(query.from, query.to),
    };
    return where;
  }

  private dateRangeWhere(
    from?: string,
    to?: string,
  ): FindOptionsWhere<{ date: Date }> {
    if (from && to) return { date: Between(toDateOnly(from), toDateOnly(to)) };
    if (from) return { date: MoreThanOrEqual(toDateOnly(from)) };
    if (to) return { date: LessThanOrEqual(toDateOnly(to)) };
    return {};
  }

  private async sumAmount(
    repo: Repository<Expense> | Repository<Income>,
    where: FindOptionsWhere<Expense> | FindOptionsWhere<Income>,
  ): Promise<number> {
    const row = await repo
      .createQueryBuilder('row')
      .select('COALESCE(SUM(row.amount), 0)', 'sum')
      .where(where)
      .getRawOne<{ sum: string }>();
    return toNumber(row?.sum);
  }

  private async sumByCategory(
    repo: Repository<Expense> | Repository<Income>,
    where: FindOptionsWhere<Expense> | FindOptionsWhere<Income>,
  ): Promise<{ categoryId: string; amount: number }[]> {
    const rows = await repo
      .createQueryBuilder('row')
      .select('row.categoryId', 'categoryId')
      .addSelect('COALESCE(SUM(row.amount), 0)', 'sum')
      .where(where)
      .groupBy('row.categoryId')
      .getRawMany<{ categoryId: string; sum: string }>();
    return rows.map((row) => ({ categoryId: row.categoryId, amount: toNumber(row.sum) }));
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  applyDiscount,
  percentage,
  roundMoney,
  safeDivide,
  type DebtQuery,
  type DebtorRow,
  type GenerateInvoicesInput,
  type PaymentQuery,
  type RecordPaymentInput,
} from '@bogcha/shared';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  ILike,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  QueryFailedError,
  Repository,
} from 'typeorm';
import {
  assertBranchAllowed,
  requireTenant,
  type RequestScope,
  assertBranchInTenant,
  resolveBranchFilter,
} from '../common/scope/request-scope';
import { toNumber } from '../common/utils/decimal.util';
import {
  countWorkdays,
  currentPeriod,
  daysBetween,
  formatDateOnly,
  periodRange,
  toDateOnly,
  todayDateOnly,
} from '../common/utils/date.util';
import { paginate, paginated } from '../common/utils/pagination.util';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Branch } from '../entities/branch.entity';
import { Child } from '../entities/child.entity';
import {
  AttendanceStatus,
  AuditAction,
  ChildStatus,
  IncomeCategoryKind,
  InvoiceStatus,
  PaymentMethod,
} from '../entities/enums';
import { IncomeCategory } from '../entities/income-category.entity';
import { Income } from '../entities/income.entity';
import { Invoice } from '../entities/invoice.entity';
import { PaymentAllocation } from '../entities/payment-allocation.entity';
import { Payment } from '../entities/payment.entity';
import { AuditService } from '../audit/audit.service';
import { fullName } from '../children/children.service';
import { RealtimeEvent, RealtimeGateway } from '../realtime/realtime.gateway';

const DEFAULT_INVOICE_DUE_DAY = 10;
const DEFAULT_WORKDAYS = [1, 2, 3, 4, 5, 6];

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(PaymentAllocation)
    private readonly allocations: Repository<PaymentAllocation>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Child) private readonly children: Repository<Child>,
    @InjectRepository(Income) private readonly incomes: Repository<Income>,
    @InjectRepository(IncomeCategory)
    private readonly incomeCategories: Repository<IncomeCategory>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRecords: Repository<AttendanceRecord>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Oylik hisob-fakturalarni yaratadi. Mavjud hisob-fakturalar qayta yaratilmaydi,
   * shuning uchun amalni takroriy bajarish xavfsiz (TZ §18).
   */
  async generateInvoices(scope: RequestScope, input: GenerateInvoicesInput) {
    const tenantId = requireTenant(scope);
    if (input.branchId) await assertBranchInTenant(this.branches, scope, input.branchId);

    const { start, end } = periodRange(input.period);
    const dueDate = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), input.dueDay ?? DEFAULT_INVOICE_DUE_DAY),
    );

    const candidates = await this.children.find({
      where: {
        tenantId,
        deletedAt: IsNull(),
        status: In([ChildStatus.ACTIVE, ChildStatus.TEMPORARILY_ABSENT]),
        ...(await resolveBranchFilter(this.branches, scope, input.branchId)),
        enrolledAt: LessThanOrEqual(end),
      },
      select: {
        id: true,
        branchId: true,
        firstName: true,
        lastName: true,
        middleName: true,
        monthlyFee: true,
        discountPercent: true,
        discountAmount: true,
      },
    });

    const existing = candidates.length
      ? await this.invoices.find({
          where: {
            period: input.period,
            childId: In(candidates.map((child) => child.id)),
          },
          select: { childId: true },
        })
      : [];
    const existingIds = new Set(existing.map((invoice) => invoice.childId));
    const children = candidates.filter((child) => !existingIds.has(child.id));

    if (children.length === 0) {
      return {
        created: 0,
        period: input.period,
        totalAmount: 0,
        message: 'Yangi hisob-faktura yaratilmadi',
      };
    }

    const workdays = countWorkdays(start, end, DEFAULT_WORKDAYS);

    const attendanceMap = new Map<string, number>();
    if (input.prorateByAttendance) {
      const rows = await this.attendanceRecords
        .createQueryBuilder('ar')
        .select('ar.childId', 'childId')
        .addSelect('COUNT(*)', 'count')
        .where('ar.tenantId = :tenantId', { tenantId })
        .andWhere('ar.date BETWEEN :start AND :end', { start, end })
        .andWhere('ar.status = :status', { status: AttendanceStatus.PRESENT })
        .andWhere('ar.childId IN (:...ids)', { ids: children.map((child) => child.id) })
        .groupBy('ar.childId')
        .getRawMany<{ childId: string; count: string }>();
      for (const row of rows) attendanceMap.set(row.childId, Number(row.count));
    }

    const created = await this.dataSource.transaction(async (manager) => {
      const invoices: Invoice[] = [];
      for (const child of children) {
        const baseFee = toNumber(child.monthlyFee);
        const discountPercent = toNumber(child.discountPercent);
        const discountAmount = toNumber(child.discountAmount);

        const afterDiscount = applyDiscount(baseFee, discountPercent, discountAmount);
        const attendanceFactor =
          input.prorateByAttendance && workdays > 0
            ? Math.min(1, safeDivide(attendanceMap.get(child.id) ?? 0, workdays))
            : 1;
        const totalAmount = roundMoney(afterDiscount * attendanceFactor);

        const invoice = await manager.save(
          manager.create(Invoice, {
            tenantId,
            branchId: child.branchId,
            childId: child.id,
            period: input.period,
            dueDate,
            baseAmount: baseFee,
            discountPercent,
            discountAmount,
            totalAmount,
            paidAmount: 0,
            balance: totalAmount,
            status: InvoiceStatus.ISSUED,
            ...(input.prorateByAttendance
              ? { note: `Davomat bo'yicha: ${attendanceMap.get(child.id) ?? 0}/${workdays} kun` }
              : {}),
          }),
        );
        invoices.push(invoice);
      }
      return invoices;
    });

    const totalAmount = roundMoney(
      created.reduce((acc, invoice) => acc + toNumber(invoice.totalAmount), 0),
    );

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Invoice',
      summary: `${input.period} uchun ${created.length} hisob-faktura yaratildi (${totalAmount.toLocaleString('uz-UZ')} so'm)`,
      newValue: { period: input.period, count: created.length, totalAmount },
    });

    return { created: created.length, period: input.period, totalAmount };
  }

  /**
   * To'lovni qabul qiladi va hisob-fakturalarga taqsimlaydi. Aniq faktura
   * ko'rsatilmasa — eng qadimgi qarzdan boshlab yopiladi.
   */
  async recordPayment(scope: RequestScope, input: RecordPaymentInput) {
    const tenantId = requireTenant(scope);

    if (input.idempotencyKey) {
      const existing = await this.findPaymentByIdempotencyKey(tenantId, input.idempotencyKey);
      if (existing) {
        return { payment: existing, advanceAmount: 0 };
      }
    }

    const child = await this.children.findOne({
      where: { id: input.childId, tenantId, deletedAt: IsNull() },
      select: {
        id: true,
        branchId: true,
        firstName: true,
        lastName: true,
        middleName: true,
      },
    });
    if (!child) throw new NotFoundException('Bola topilmadi');
    assertBranchAllowed(scope, child.branchId);

    const invoices = input.invoiceId
      ? await this.invoices.find({
          where: { id: input.invoiceId, childId: child.id, balance: MoreThan(0) },
        })
      : await this.invoices.find({
          where: { childId: child.id, balance: MoreThan(0) },
          order: { period: 'ASC' },
        });

    if (input.invoiceId && invoices.length === 0) {
      throw new BadRequestException("Ko'rsatilgan hisob-faktura topilmadi yoki allaqachon to'langan");
    }

    const incomeCategory = await this.ensureTuitionCategory(tenantId);
    const method = (input.method ?? PaymentMethod.CASH) as PaymentMethod;

    let result: { payment: Payment; unallocated: number };
    try {
      result = await this.dataSource.transaction(async (manager) => {
        const payment = await manager.save(
          manager.create(Payment, {
            tenantId,
            branchId: child.branchId,
            childId: child.id,
            amount: input.amount,
            date: toDateOnly(input.date),
            method,
            receiptNumber: input.receiptNumber ?? null,
            note: input.note ?? null,
            createdById: scope.userId || null,
            ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
          }),
        );

        let remaining = input.amount;

        for (const invoice of invoices) {
          if (remaining <= 0) break;

          const balance = toNumber(invoice.balance);
          const applied = Math.min(balance, remaining);
          const paidAmount = roundMoney(toNumber(invoice.paidAmount) + applied);
          const nextBalance = roundMoney(toNumber(invoice.totalAmount) - paidAmount);

          await manager.save(
            manager.create(PaymentAllocation, {
              paymentId: payment.id,
              invoiceId: invoice.id,
              amount: applied,
            }),
          );

          invoice.paidAmount = paidAmount;
          invoice.balance = nextBalance;
          invoice.status = nextBalance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
          await manager.save(invoice);

          remaining = roundMoney(remaining - applied);
        }

        await manager.save(
          manager.create(Income, {
            tenantId,
            branchId: child.branchId,
            categoryId: incomeCategory.id,
            amount: input.amount,
            date: toDateOnly(input.date),
            description: `${fullName(child)} — to'lov`,
            paymentMethod: method,
            paymentId: payment.id,
            isAutoGenerated: true,
            createdById: scope.userId || null,
          }),
        );

        return { payment, unallocated: remaining };
      });
    } catch (error) {
      if (input.idempotencyKey && isUniqueViolation(error)) {
        const existing = await this.findPaymentByIdempotencyKey(tenantId, input.idempotencyKey);
        if (existing) {
          return { payment: existing, advanceAmount: 0 };
        }
      }
      throw error;
    }

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Payment',
      entityId: result.payment.id,
      summary: `To'lov qabul qilindi: ${fullName(child)} — ${input.amount.toLocaleString('uz-UZ')} so'm`,
      newValue: { amount: input.amount, method, date: input.date },
    });

    this.realtime.emitToBranch(child.branchId, RealtimeEvent.PAYMENT_CREATED, {
      childId: child.id,
      amount: input.amount,
    });

    return {
      payment: result.payment,
      advanceAmount: result.unallocated,
    };
  }

  private findPaymentByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    return this.payments.findOne({
      where: { tenantId, idempotencyKey, deletedAt: IsNull() },
    });
  }

  async listPayments(scope: RequestScope, query: PaymentQuery) {
    const tenantId = requireTenant(scope);
    const { skip, take } = paginate(query);

    const qb = this.payments
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.child', 'child')
      .leftJoinAndSelect('child.group', 'group')
      .leftJoinAndSelect('payment.branch', 'branch')
      .leftJoinAndSelect('payment.allocations', 'allocations')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.deletedAt IS NULL');

    const branchWhere = await resolveBranchFilter(this.branches, scope, query.branchId);
    if (branchWhere.branchId !== undefined) {
      qb.andWhere({ branchId: branchWhere.branchId });
    }

    if (query.childId) qb.andWhere('payment.childId = :childId', { childId: query.childId });
    if (query.groupId) qb.andWhere('child.groupId = :groupId', { groupId: query.groupId });
    if (query.method) qb.andWhere('payment.method = :method', { method: query.method });
    if (query.from) qb.andWhere('payment.date >= :from', { from: toDateOnly(query.from) });
    if (query.to) qb.andWhere('payment.date <= :to', { to: toDateOnly(query.to) });
    if (query.search) {
      qb.andWhere(
        '(child.firstName ILIKE :search OR child.lastName ILIKE :search OR payment.receiptNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('payment.date', 'DESC').addOrderBy('payment.createdAt', 'DESC');

    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();

    const aggregateWhere = {
      tenantId,
      deletedAt: IsNull(),
      ...branchWhere,
      ...(query.childId ? { childId: query.childId } : {}),
      ...(query.method ? { method: query.method as PaymentMethod } : {}),
      ...this.dateRangeWhere(query.from, query.to),
    } as FindOptionsWhere<Payment>;

    const aggregateQb = this.payments
      .createQueryBuilder('payment')
      .leftJoin('payment.child', 'child')
      .select('COALESCE(SUM(payment.amount), 0)', 'sum')
      .where(aggregateWhere);
    if (query.groupId) {
      aggregateQb.andWhere('child.groupId = :groupId', { groupId: query.groupId });
    }
    if (query.search) {
      aggregateQb.andWhere(
        '(child.firstName ILIKE :search OR child.lastName ILIKE :search OR payment.receiptNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    const aggregate = await aggregateQb.getRawOne<{ sum: string }>();

    return {
      ...paginated(
        items.map((payment) => ({
          ...payment,
          child: payment.child
            ? {
                id: payment.child.id,
                firstName: payment.child.firstName,
                lastName: payment.child.lastName,
                middleName: payment.child.middleName,
                group: payment.child.group
                  ? { id: payment.child.group.id, name: payment.child.group.name }
                  : null,
              }
            : undefined,
          branch: payment.branch
            ? { id: payment.branch.id, name: payment.branch.name }
            : undefined,
          allocations: (payment.allocations ?? []).map((allocation) => ({
            invoiceId: allocation.invoiceId,
            amount: allocation.amount,
          })),
          childFullName: payment.child ? fullName(payment.child) : '',
        })),
        total,
        query,
      ),
      totalAmount: toNumber(aggregate?.sum),
    };
  }

  /** To'lov holati jamlanmasi: kutilayotgan / to'langan / qarz (TZ §18). */
  async collectionSummary(scope: RequestScope, params: { period?: string; branchId?: string }) {
    const tenantId = requireTenant(scope);
    const period = params.period ?? currentPeriod();
    const branchWhere = await resolveBranchFilter(this.branches, scope, params.branchId);

    const aggregate = await this.invoices
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.totalAmount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(invoice.paidAmount), 0)', 'paidAmount')
      .addSelect('COALESCE(SUM(invoice.balance), 0)', 'balance')
      .addSelect('COUNT(*)', 'count')
      .where({
        tenantId,
        period,
        status: Not(InvoiceStatus.CANCELLED),
        ...branchWhere,
      })
      .getRawOne<{ totalAmount: string; paidAmount: string; balance: string; count: string }>();

    const expected = toNumber(aggregate?.totalAmount);
    const collected = toNumber(aggregate?.paidAmount);
    const outstanding = toNumber(aggregate?.balance);

    const totalDebt = await this.invoices
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.balance), 0)', 'balance')
      .addSelect('COUNT(*)', 'count')
      .where({
        tenantId,
        balance: MoreThan(0),
        status: Not(InvoiceStatus.CANCELLED),
        ...branchWhere,
      })
      .getRawOne<{ balance: string; count: string }>();

    const debtorCount = await this.children.count({
      where: {
        tenantId,
        deletedAt: IsNull(),
        ...branchWhere,
        invoices: { balance: MoreThan(0), status: Not(InvoiceStatus.CANCELLED) },
      },
    });

    return {
      period,
      expected,
      collected,
      outstanding,
      collectionRate: percentage(collected, expected),
      invoiceCount: Number(aggregate?.count ?? 0),
      totalDebt: toNumber(totalDebt?.balance),
      overdueInvoiceCount: Number(totalDebt?.count ?? 0),
      debtorCount,
    };
  }

  /** Qarzdorlar ro'yxati (TZ §18). */
  async debtors(scope: RequestScope, query: DebtQuery) {
    const tenantId = requireTenant(scope);
    const today = todayDateOnly();
    const branchWhere = await resolveBranchFilter(this.branches, scope, query.branchId);

    const where: FindOptionsWhere<Child>[] | FindOptionsWhere<Child> = query.search
      ? [
          {
            tenantId,
            deletedAt: IsNull(),
            ...branchWhere,
            ...(query.groupId ? { groupId: query.groupId } : {}),
            firstName: ILike(`%${query.search}%`),
            invoices: { balance: MoreThan(0), status: Not(InvoiceStatus.CANCELLED) },
          },
          {
            tenantId,
            deletedAt: IsNull(),
            ...branchWhere,
            ...(query.groupId ? { groupId: query.groupId } : {}),
            lastName: ILike(`%${query.search}%`),
            invoices: { balance: MoreThan(0), status: Not(InvoiceStatus.CANCELLED) },
          },
        ]
      : {
          tenantId,
          deletedAt: IsNull(),
          ...branchWhere,
          ...(query.groupId ? { groupId: query.groupId } : {}),
          invoices: { balance: MoreThan(0), status: Not(InvoiceStatus.CANCELLED) },
        };

    const children = await this.children.find({
      where,
      relations: { group: true, branch: true, guardians: true, invoices: true },
    });

    const rows: DebtorRow[] = children.map((child) => {
      const openInvoices = (child.invoices ?? [])
        .filter(
          (invoice) =>
            toNumber(invoice.balance) > 0 && invoice.status !== InvoiceStatus.CANCELLED,
        )
        .sort(
          (a, b) => toDateOnly(a.dueDate).getTime() - toDateOnly(b.dueDate).getTime(),
        );

      const outstanding = roundMoney(
        openInvoices.reduce((acc, invoice) => acc + toNumber(invoice.balance), 0),
      );
      const totalDue = roundMoney(
        openInvoices.reduce((acc, invoice) => acc + toNumber(invoice.totalAmount), 0),
      );
      const oldest = openInvoices[0];
      const primaryGuardian = (child.guardians ?? []).find((guardian) => guardian.isPrimary);

      return {
        childId: child.id,
        childFullName: fullName(child),
        groupName: child.group?.name ?? null,
        branchName: child.branch.name,
        guardianPhone: primaryGuardian?.phone ?? null,
        totalDue,
        totalPaid: roundMoney(totalDue - outstanding),
        outstanding,
        oldestDueDate: oldest ? formatDateOnly(oldest.dueDate) : null,
        daysOverdue: oldest ? Math.max(0, daysBetween(oldest.dueDate, today)) : 0,
      };
    });

    const filtered = rows
      .filter((row) => (query.minAmount ? row.outstanding >= query.minAmount : true))
      .filter((row) => (query.minDaysOverdue ? row.daysOverdue >= query.minDaysOverdue : true))
      .sort((a, b) => b.outstanding - a.outstanding);

    const { skip, take } = paginate(query);

    return {
      ...paginated(filtered.slice(skip, skip + take), filtered.length, query),
      totalOutstanding: roundMoney(filtered.reduce((acc, row) => acc + row.outstanding, 0)),
    };
  }

  async childInvoices(scope: RequestScope, childId: string) {
    const tenantId = requireTenant(scope);

    const child = await this.children.findOne({
      where: { id: childId, tenantId, deletedAt: IsNull() },
      select: { id: true, branchId: true },
    });
    if (!child) throw new NotFoundException('Bola topilmadi');
    assertBranchAllowed(scope, child.branchId);

    const invoices = await this.invoices.find({
      where: { childId },
      order: { period: 'DESC' },
      relations: { allocations: { payment: true } },
    });

    return invoices.map((invoice) => ({
      ...invoice,
      allocations: (invoice.allocations ?? []).map((allocation) => ({
        ...allocation,
        payment: allocation.payment
          ? {
              id: allocation.payment.id,
              date: allocation.payment.date,
              method: allocation.payment.method,
              amount: allocation.payment.amount,
            }
          : undefined,
      })),
    }));
  }

  /** Muddati o'tgan hisob-fakturalarni belgilaydi (rejalashtirilgan vazifa uchun). */
  async markOverdueInvoices(tenantId: string): Promise<number> {
    const result = await this.invoices.update(
      {
        tenantId,
        balance: MoreThan(0),
        dueDate: LessThan(todayDateOnly()),
        status: In([InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID]),
      },
      { status: InvoiceStatus.OVERDUE },
    );
    return result.affected ?? 0;
  }

  private async ensureTuitionCategory(tenantId: string) {
    const existing = await this.incomeCategories.findOne({
      where: { tenantId, kind: IncomeCategoryKind.TUITION },
    });
    if (existing) return existing;

    return this.incomeCategories.save(
      this.incomeCategories.create({
        tenantId,
        name: "Bolalar to'lovi",
        kind: IncomeCategoryKind.TUITION,
        isSystem: true,
      }),
    );
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
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverCode = (error as QueryFailedError & { driverError?: { code?: string } }).driverError
    ?.code;
  return String(driverCode ?? '') === '23505';
}

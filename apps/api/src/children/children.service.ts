import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  applyDiscount,
  percentage,
  type ChildQuery,
  type CreateChildInput,
  type UpdateChildInput,
} from '@bogcha/shared';
import {
  DataSource,
  FindOperator,
  IsNull,
  type SelectQueryBuilder,
  Repository,
} from 'typeorm';
import {
  assertBranchAllowed,
  assertBranchInTenant,
  assertGroupAllowed,
  groupFilter,
  requireTenant,
  resolveBranchFilter,
  type RequestScope,
} from '../common/scope/request-scope';
import { addDays, toDateOnly, todayDateOnly } from '../common/utils/date.util';
import { toNumber } from '../common/utils/decimal.util';
import { orderBy, paginate, paginated } from '../common/utils/pagination.util';
import {
  AttendanceStatus,
  AuditAction,
  ChildStatus,
  Gender,
  InvoiceStatus,
} from '../entities/enums';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Branch } from '../entities/branch.entity';
import { Child } from '../entities/child.entity';
import { Group } from '../entities/group.entity';
import { Guardian } from '../entities/guardian.entity';
import { Invoice } from '../entities/invoice.entity';
import { Payment } from '../entities/payment.entity';
import { AuditService } from '../audit/audit.service';

const SORTABLE = ['lastName', 'firstName', 'birthDate', 'enrolledAt', 'monthlyFee', 'createdAt'] as const;

@Injectable()
export class ChildrenService {
  constructor(
    @InjectRepository(Child) private readonly children: Repository<Child>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: RequestScope, query: ChildQuery) {
    const tenantId = requireTenant(scope);
    const { skip, take } = paginate(query);
    const branchWhere = await resolveBranchFilter(this.branches, scope, query.branchId);
    const groupWhere = groupFilter(scope, query.groupId);

    const qb = this.children
      .createQueryBuilder('child')
      .leftJoinAndSelect('child.group', 'grp')
      .leftJoinAndSelect('child.branch', 'br')
      .leftJoinAndSelect('child.guardians', 'g', 'g.isPrimary = true')
      .where('child.tenantId = :tenantId', { tenantId })
      .andWhere('child.deletedAt IS NULL');

    applyIdFilter(qb, 'child.branchId', 'bf', branchWhere.branchId);
    applyIdFilter(qb, 'child.groupId', 'gf', groupWhere.groupId);

    if (query.status) qb.andWhere('child.status = :status', { status: query.status });
    if (query.gender) qb.andWhere('child.gender = :gender', { gender: query.gender });

    if (query.search) {
      qb.andWhere(
        `(child.firstName ILIKE :search OR child.lastName ILIKE :search OR child.middleName ILIKE :search
          OR EXISTS (
            SELECT 1 FROM "Guardian" gu
            WHERE gu."childId" = child.id AND gu.phone ILIKE :search
          ))`,
        { search: `%${query.search}%` },
      );
    }

    if (query.hasDebt) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM "Invoice" inv
          WHERE inv."childId" = child.id
            AND inv.balance > 0
            AND inv.status IN (:...debtStatuses)
        )`,
        {
          debtStatuses: [
            InvoiceStatus.ISSUED,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE,
          ],
        },
      );
    }

    const sort = orderBy(query, SORTABLE, 'lastName');
    const sortEntry = Object.entries(sort)[0] ?? ['lastName', 'asc'];
    const [sortField, sortDir] = sortEntry;
    qb.orderBy(`child.${sortField}`, sortDir.toUpperCase() as 'ASC' | 'DESC');
    qb.skip(skip).take(take);

    const [items, total] = await qb.getManyAndCount();

    const childIds = items.map((child) => child.id);
    const debts = childIds.length
      ? await this.invoices
          .createQueryBuilder('inv')
          .select('inv.childId', 'childId')
          .addSelect('COALESCE(SUM(inv.balance), 0)', 'balance')
          .where('inv.childId IN (:...childIds)', { childIds })
          .andWhere('inv.balance > 0')
          .groupBy('inv.childId')
          .getRawMany<{ childId: string; balance: string }>()
      : [];
    const debtMap = new Map(debts.map((row) => [row.childId, toNumber(row.balance)]));

    return paginated(
      items.map((child) => {
        const primary = (child.guardians ?? [])[0];
        return {
          ...child,
          group: child.group ? { id: child.group.id, name: child.group.name } : null,
          branch: child.branch ? { id: child.branch.id, name: child.branch.name } : null,
          fullName: fullName(child),
          age: ageInYears(child.birthDate),
          netMonthlyFee: applyDiscount(
            toNumber(child.monthlyFee),
            toNumber(child.discountPercent),
            toNumber(child.discountAmount),
          ),
          outstandingDebt: debtMap.get(child.id) ?? 0,
          primaryGuardian: primary
            ? {
                fullName: primary.fullName,
                phone: primary.phone,
                relation: primary.relation,
              }
            : null,
        };
      }),
      total,
      query,
    );
  }

  /** Bola profili: davomat tarixi, to'lov tarixi, qarzdorlik, statistika (TZ §6). */
  async findOne(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);

    const child = await this.children.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: {
        group: true,
        branch: true,
        guardians: true,
      },
    });
    if (!child) throw new NotFoundException('Bola topilmadi');

    assertBranchAllowed(scope, child.branchId);
    if (child.groupId) assertGroupAllowed(scope, child.groupId);

    const today = todayDateOnly();
    const ninetyDaysAgo = addDays(today, -90);

    const [attendanceRows, attendanceStats, invoices, payments] = await Promise.all([
      this.attendance
        .createQueryBuilder('a')
        .where('a.childId = :id', { id })
        .andWhere('a.date >= :from', { from: ninetyDaysAgo })
        .orderBy('a.date', 'DESC')
        .take(90)
        .getMany(),
      this.attendance
        .createQueryBuilder('a')
        .select('a.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('a.childId = :id', { id })
        .andWhere('a.date >= :from', { from: ninetyDaysAgo })
        .groupBy('a.status')
        .getRawMany<{ status: AttendanceStatus; count: string }>(),
      this.invoices.find({
        where: { childId: id },
        order: { period: 'DESC' },
        take: 24,
      }),
      this.payments.find({
        where: { childId: id, deletedAt: IsNull() },
        order: { date: 'DESC' },
        take: 50,
        relations: { allocations: true },
      }),
    ]);

    const attendance = attendanceRows.map((row) => ({
      date: row.date,
      status: row.status,
      arrivedAt: row.arrivedAt,
      leftAt: row.leftAt,
      note: row.note,
    }));

    const totalMarks = attendanceStats.reduce((acc, row) => acc + Number(row.count), 0);
    const presentMarks = Number(
      attendanceStats.find((row) => row.status === AttendanceStatus.PRESENT)?.count ?? 0,
    );

    const outstandingDebt = invoices.reduce((acc, invoice) => acc + toNumber(invoice.balance), 0);
    const totalPaid = payments.reduce((acc, payment) => acc + toNumber(payment.amount), 0);

    const sortedGuardians = [...(child.guardians ?? [])].sort(
      (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
    );

    return {
      ...child,
      group: child.group
        ? { id: child.group.id, name: child.group.name, capacity: child.group.capacity }
        : null,
      branch: child.branch ? { id: child.branch.id, name: child.branch.name } : null,
      guardians: sortedGuardians,
      fullName: fullName(child),
      age: ageInYears(child.birthDate),
      netMonthlyFee: applyDiscount(
        toNumber(child.monthlyFee),
        toNumber(child.discountPercent),
        toNumber(child.discountAmount),
      ),
      statistics: {
        attendanceRate90d: percentage(presentMarks, totalMarks),
        presentDays: presentMarks,
        absentDays: totalMarks - presentMarks,
        byStatus: attendanceStats.map((row) => ({
          status: row.status,
          count: Number(row.count),
        })),
        outstandingDebt,
        totalPaid,
        daysEnrolled: Math.max(
          0,
          Math.floor((Date.now() - child.enrolledAt.getTime()) / 86_400_000),
        ),
      },
      attendanceHistory: attendance,
      invoices,
      payments: payments.map((p) => ({
        ...p,
        allocations: (p.allocations ?? []).map((a) => ({
          invoiceId: a.invoiceId,
          amount: a.amount,
        })),
      })),
    };
  }

  async create(scope: RequestScope, input: CreateChildInput) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, input.branchId);

    const { guardians, birthDate, enrolledAt, groupId, ...rest } = input;

    if (groupId) await this.assertGroupCapacity(tenantId, groupId);

    const child = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        Child,
        manager.create(Child, {
          firstName: rest.firstName,
          lastName: rest.lastName,
          middleName: rest.middleName ?? null,
          gender: rest.gender as Gender,
          branchId: rest.branchId,
          monthlyFee: rest.monthlyFee,
          discountPercent: rest.discountPercent,
          discountAmount: rest.discountAmount,
          discountReason: rest.discountReason ?? null,
          address: rest.address ?? null,
          medicalNotes: rest.medicalNotes ?? null,
          note: rest.note ?? null,
          status: (rest.status as ChildStatus) ?? ChildStatus.ACTIVE,
          tenantId,
          groupId: groupId ?? null,
          birthDate: toDateOnly(birthDate),
          enrolledAt: toDateOnly(enrolledAt),
        }),
      );

      await manager.save(
        Guardian,
        guardians.map((guardian, index) =>
          manager.create(Guardian, {
            ...guardian,
            secondaryPhone: guardian.secondaryPhone ?? null,
            workplace: guardian.workplace ?? null,
            childId: created.id,
            tenantId,
            isPrimary: guardian.isPrimary || index === 0,
          }),
        ),
      );

      return manager.findOneOrFail(Child, {
        where: { id: created.id },
        relations: { guardians: true, group: true },
      });
    });

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Child',
      entityId: child.id,
      summary: `Yangi bola qabul qilindi: ${fullName(child)}`,
      newValue: child,
    });

    return {
      ...child,
      group: child.group ? { name: child.group.name } : null,
    };
  }

  async update(scope: RequestScope, id: string, input: UpdateChildInput) {
    const tenantId = requireTenant(scope);

    const before = await this.children.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: { guardians: true },
    });
    if (!before) throw new NotFoundException('Bola topilmadi');
    assertBranchAllowed(scope, before.branchId);
    if (input.branchId) await assertBranchInTenant(this.branches, scope, input.branchId);

    const { guardians, birthDate, enrolledAt, ...rest } = input;

    if (input.groupId && input.groupId !== before.groupId) {
      await this.assertGroupCapacity(tenantId, input.groupId);
    }

    const child = await this.dataSource.transaction(async (manager) => {
      if (guardians) {
        await manager.delete(Guardian, { childId: id });
        await manager.save(
          Guardian,
          guardians.map((guardian, index) =>
            manager.create(Guardian, {
              ...guardian,
              secondaryPhone: guardian.secondaryPhone ?? null,
              workplace: guardian.workplace ?? null,
              childId: id,
              tenantId,
              isPrimary: guardian.isPrimary || index === 0,
            }),
          ),
        );
      }

      await manager.update(Child, { id }, {
        ...(rest.firstName !== undefined ? { firstName: rest.firstName } : {}),
        ...(rest.lastName !== undefined ? { lastName: rest.lastName } : {}),
        ...(rest.middleName !== undefined ? { middleName: rest.middleName ?? null } : {}),
        ...(rest.gender !== undefined ? { gender: rest.gender as Gender } : {}),
        ...(rest.branchId !== undefined ? { branchId: rest.branchId } : {}),
        ...(rest.groupId !== undefined ? { groupId: rest.groupId ?? null } : {}),
        ...(rest.status !== undefined ? { status: rest.status as ChildStatus } : {}),
        ...(rest.monthlyFee !== undefined ? { monthlyFee: rest.monthlyFee } : {}),
        ...(rest.discountPercent !== undefined ? { discountPercent: rest.discountPercent } : {}),
        ...(rest.discountAmount !== undefined ? { discountAmount: rest.discountAmount } : {}),
        ...(rest.discountReason !== undefined
          ? { discountReason: rest.discountReason ?? null }
          : {}),
        ...(rest.address !== undefined ? { address: rest.address ?? null } : {}),
        ...(rest.medicalNotes !== undefined ? { medicalNotes: rest.medicalNotes ?? null } : {}),
        ...(rest.note !== undefined ? { note: rest.note ?? null } : {}),
        ...(birthDate ? { birthDate: toDateOnly(birthDate) } : {}),
        ...(enrolledAt ? { enrolledAt: toDateOnly(enrolledAt) } : {}),
        ...(rest.status === ChildStatus.WITHDRAWN && !before.withdrawnAt
          ? { withdrawnAt: todayDateOnly() }
          : {}),
      });

      return manager.findOneOrFail(Child, {
        where: { id },
        relations: { guardians: true },
      });
    });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'Child',
      entityId: id,
      summary: `Bola ma'lumotlari o'zgartirildi: ${fullName(child)}`,
      oldValue: before,
      newValue: child,
    });

    return child;
  }

  async remove(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);

    const before = await this.children.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!before) throw new NotFoundException('Bola topilmadi');
    assertBranchAllowed(scope, before.branchId);

    await this.children.update(
      { id },
      {
        deletedAt: new Date(),
        status: ChildStatus.WITHDRAWN,
        withdrawnAt: todayDateOnly(),
      },
    );

    await this.auditService.record(scope, {
      action: AuditAction.DELETE,
      entityType: 'Child',
      entityId: id,
      summary: `Bola ro'yxatdan chiqarildi: ${fullName(before)}`,
      oldValue: before,
    });

    return { success: true };
  }

  /** Guruh sig'imi to'lganini tekshiradi (TZ §7). */
  private async assertGroupCapacity(tenantId: string, groupId: string): Promise<void> {
    const group = await this.groups.findOne({
      where: { id: groupId, tenantId, deletedAt: IsNull() },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const childrenCount = await this.children.count({
      where: { groupId, deletedAt: IsNull() },
    });

    if (childrenCount >= group.capacity) {
      throw new ConflictException(
        `"${group.name}" guruhi to'lgan (${childrenCount}/${group.capacity}).`,
      );
    }
  }
}

function applyIdFilter(
  qb: SelectQueryBuilder<Child>,
  column: string,
  param: string,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  if (typeof value === 'string') {
    qb.andWhere(`${column} = :${param}`, { [param]: value });
    return;
  }
  if (value instanceof FindOperator) {
    const ids = value.value as unknown as string[];
    qb.andWhere(`${column} IN (:...${param})`, { [param]: ids });
  }
}

export function fullName(child: {
  firstName: string;
  lastName: string;
  middleName?: string | null;
}): string {
  return [child.lastName, child.firstName, child.middleName].filter(Boolean).join(' ');
}

export function ageInYears(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' ? toDateOnly(birthDate) : birthDate;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return Math.max(0, age);
}

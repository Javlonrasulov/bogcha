import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  percentage,
  type AttendanceDaySummary,
  type AttendanceQuery,
  type AttendanceTrendPoint,
  type MarkAttendanceInput,
  type TeacherDailyBoard,
} from '@bogcha/shared';
import {
  DataSource,
  FindOperator,
  In,
  IsNull,
  Not,
  type ObjectLiteral,
  type SelectQueryBuilder,
  Repository,
} from 'typeorm';
import {
  assertBranchAllowed,
  assertGroupAllowed,
  branchFilter,
  groupFilter,
  requireTenant,
  resolveBranchFilter,
  type RequestScope,
} from '../common/scope/request-scope';
import {
  addDays,
  formatDateOnly,
  timeOnDate,
  toDateOnly,
  todayDateOnly,
} from '../common/utils/date.util';
import { AttendanceStatus, AuditAction, ChildStatus } from '../entities/enums';
import { AttendanceBatch } from '../entities/attendance-batch.entity';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Branch } from '../entities/branch.entity';
import { Child } from '../entities/child.entity';
import { Group } from '../entities/group.entity';
import { AuditService } from '../audit/audit.service';
import { RealtimeEvent, RealtimeGateway } from '../realtime/realtime.gateway';
import { fullName } from '../children/children.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceBatch) private readonly batches: Repository<AttendanceBatch>,
    @InjectRepository(AttendanceRecord) private readonly recordsRepo: Repository<AttendanceRecord>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(Child) private readonly children: Repository<Child>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Guruh davomatini saqlaydi (upsert). Offline navbatdan kelgan takroriy
   * so'rovlar `idempotencyKey` orqali bloklanadi (TZ §41).
   */
  async mark(scope: RequestScope, input: MarkAttendanceInput) {
    const tenantId = requireTenant(scope);
    assertGroupAllowed(scope, input.groupId);

    const group = await this.groups.findOne({
      where: { id: input.groupId, tenantId, deletedAt: IsNull() },
      select: { id: true, branchId: true, name: true },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    assertBranchAllowed(scope, group.branchId);

    const date = toDateOnly(input.date);
    if (date > todayDateOnly()) {
      throw new BadRequestException("Kelajak sanasi uchun davomat kiritib bo'lmaydi");
    }

    if (input.idempotencyKey) {
      const duplicate = await this.batches.findOne({
        where: { tenantId, idempotencyKey: input.idempotencyKey },
        relations: { records: true },
      });
      // Offline navbat bir xil so'rovni qayta yuborgan — mavjud natijani qaytaramiz.
      if (duplicate) return { batch: duplicate, duplicated: true };
    }

    // Guruhga tegishli bo'lmagan bola yuborilmaganini tekshiramiz.
    const childIds = input.entries.map((entry) => entry.childId);
    const children = await this.children.find({
      where: { id: In(childIds), tenantId, groupId: input.groupId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (children.length !== childIds.length) {
      throw new BadRequestException("Ba'zi bolalar bu guruhga tegishli emas");
    }

    const presentCount = input.entries.filter(
      (entry) => entry.status === AttendanceStatus.PRESENT,
    ).length;

    const previous = await this.batches.findOne({
      where: { groupId: input.groupId, date },
      relations: { records: true },
    });

    // Offline LWW: eski klient yozuvi yangiroq server yozuvini ustiga yozmasin.
    if (previous && input.clientRecordedAt) {
      const incomingAt = new Date(input.clientRecordedAt);
      if (
        previous.clientRecordedAt != null &&
        previous.clientRecordedAt.getTime() > incomingAt.getTime()
      ) {
        return { batch: previous, duplicated: false };
      }
    }

    const batch = await this.dataSource.transaction(async (manager) => {
      let savedBatch: AttendanceBatch;
      if (previous) {
        await manager.update(
          AttendanceBatch,
          { id: previous.id },
          {
            submittedById: scope.userId || null,
            submittedAt: new Date(),
            clientRecordedAt: input.clientRecordedAt ? new Date(input.clientRecordedAt) : null,
            idempotencyKey: input.idempotencyKey ?? null,
            totalCount: input.entries.length,
            presentCount,
            absentCount: input.entries.length - presentCount,
          },
        );
        savedBatch = await manager.findOneOrFail(AttendanceBatch, { where: { id: previous.id } });
      } else {
        savedBatch = await manager.save(
          AttendanceBatch,
          manager.create(AttendanceBatch, {
            tenantId,
            branchId: group.branchId,
            groupId: input.groupId,
            date,
            submittedById: scope.userId || null,
            submittedAt: new Date(),
            clientRecordedAt: input.clientRecordedAt ? new Date(input.clientRecordedAt) : null,
            idempotencyKey: input.idempotencyKey ?? null,
            syncedFromOffline: Boolean(input.clientRecordedAt),
            totalCount: input.entries.length,
            presentCount,
            absentCount: input.entries.length - presentCount,
          }),
        );
      }

      for (const entry of input.entries) {
        const arrivedAt = entry.arrivedAt ? timeOnDate(date, entry.arrivedAt) : null;
        const leftAt = entry.leftAt ? timeOnDate(date, entry.leftAt) : null;

        const existing = await manager.findOne(AttendanceRecord, {
          where: { childId: entry.childId, date },
        });

        if (existing) {
          await manager.update(
            AttendanceRecord,
            { id: existing.id },
            {
              groupId: input.groupId,
              batchId: savedBatch.id,
              status: entry.status as AttendanceStatus,
              arrivedAt,
              leftAt,
              note: entry.note ?? null,
            },
          );
        } else {
          await manager.save(
            AttendanceRecord,
            manager.create(AttendanceRecord, {
              tenantId,
              childId: entry.childId,
              groupId: input.groupId,
              batchId: savedBatch.id,
              date,
              status: entry.status as AttendanceStatus,
              arrivedAt,
              leftAt,
              note: entry.note ?? null,
            }),
          );
        }
      }

      return savedBatch;
    });

    await this.auditService.record(scope, {
      action: previous ? AuditAction.UPDATE : AuditAction.CREATE,
      entityType: 'AttendanceBatch',
      entityId: batch.id,
      summary: `${group.name} — ${input.date}: ${presentCount}/${input.entries.length} kelgan`,
      oldValue: previous
        ? { presentCount: previous.presentCount, totalCount: previous.totalCount }
        : undefined,
      newValue: { presentCount, totalCount: input.entries.length },
    });

    const payload = {
      groupId: input.groupId,
      branchId: group.branchId,
      date: input.date,
      presentCount,
      totalCount: input.entries.length,
    };
    this.realtime.emitToBranch(group.branchId, RealtimeEvent.ATTENDANCE_UPDATED, payload);
    this.realtime.emitToTenant(tenantId, RealtimeEvent.DASHBOARD_UPDATED, { reason: 'attendance' });

    return { batch, duplicated: false };
  }

  /** Kunlik davomat jamlanmasi (TZ §8). */
  async daySummary(
    scope: RequestScope,
    params: { date?: string; branchId?: string; groupId?: string },
  ): Promise<AttendanceDaySummary> {
    const tenantId = requireTenant(scope);
    const date = params.date ? toDateOnly(params.date) : todayDateOnly();

    const recordsQb = this.recordsRepo
      .createQueryBuilder('record')
      .where('record.tenantId = :tenantId', { tenantId })
      .andWhere('record.date = :date', { date });

    applyIdFilter(recordsQb, 'record.groupId', 'gf', groupFilter(scope, params.groupId).groupId);

    if (params.branchId) {
      recordsQb
        .innerJoin('record.child', 'child')
        .andWhere('child.branchId = :branchId', { branchId: params.branchId });
    }

    const byStatus = await recordsQb
      .clone()
      .select('record.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('record.status')
      .getRawMany<{ status: AttendanceStatus; count: string }>();

    const enrolledQb = this.children
      .createQueryBuilder('child')
      .where('child.tenantId = :tenantId', { tenantId })
      .andWhere('child.deletedAt IS NULL')
      .andWhere('child.status != :withdrawn', { withdrawn: ChildStatus.WITHDRAWN });

    const branchWhere = await resolveBranchFilter(this.branches, scope, params.branchId);
    applyIdFilter(enrolledQb, 'child.branchId', 'bf', branchWhere.branchId);
    applyIdFilter(enrolledQb, 'child.groupId', 'gf', groupFilter(scope, params.groupId).groupId);

    const enrolled = await enrolledQb.getCount();

    const counts = new Map(byStatus.map((row) => [row.status, Number(row.count)]));
    const present = counts.get(AttendanceStatus.PRESENT) ?? 0;
    const excused = counts.get(AttendanceStatus.ABSENT_EXCUSED) ?? 0;
    const unexcused = counts.get(AttendanceStatus.ABSENT_UNEXCUSED) ?? 0;
    const onVacation = counts.get(AttendanceStatus.ON_VACATION) ?? 0;
    const sick = counts.get(AttendanceStatus.SICK) ?? 0;

    // Ta'tildagi bolalar davomat foiziga ta'sir qilmaydi, lekin ro'yxatda qoladi.
    // Belgilanmagan bolalar esa "kelmagan" sifatida hisoblanadi.
    const expected = Math.max(0, enrolled - onVacation);

    return {
      date: formatDateOnly(date),
      total: enrolled,
      expected,
      present,
      absent: Math.max(0, expected - present),
      excused,
      unexcused,
      onVacation,
      sick,
      attendanceRate: percentage(present, expected),
    };
  }

  /** Haftalik/oylik trend (TZ §8). */
  async trend(
    scope: RequestScope,
    params: { from: string; to: string; branchId?: string; groupId?: string },
  ): Promise<AttendanceTrendPoint[]> {
    const tenantId = requireTenant(scope);
    const from = toDateOnly(params.from);
    const to = toDateOnly(params.to);

    const qb = this.recordsRepo
      .createQueryBuilder('record')
      .select('record.date', 'date')
      .addSelect('record.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('record.tenantId = :tenantId', { tenantId })
      .andWhere('record.date >= :from AND record.date <= :to', { from, to });

    applyIdFilter(qb, 'record.groupId', 'gf', groupFilter(scope, params.groupId).groupId);

    if (params.branchId) {
      qb.innerJoin('record.child', 'child').andWhere('child.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    const rows = await qb
      .groupBy('record.date')
      .addGroupBy('record.status')
      .orderBy('record.date', 'ASC')
      .getRawMany<{ date: Date | string; status: AttendanceStatus; count: string }>();

    const byDate = new Map<string, { present: number; total: number }>();
    for (const row of rows) {
      const key =
        typeof row.date === 'string' ? row.date.slice(0, 10) : formatDateOnly(new Date(row.date));
      const entry = byDate.get(key) ?? { present: 0, total: 0 };
      const count = Number(row.count);
      entry.total += count;
      if (row.status === AttendanceStatus.PRESENT) entry.present += count;
      byDate.set(key, entry);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        present: value.present,
        total: value.total,
        attendanceRate: percentage(value.present, value.total),
      }));
  }

  /** Tarbiyachi mobil ilovasining asosiy ekrani (TZ §32). */
  async teacherBoard(
    scope: RequestScope,
    params: { groupId: string; date?: string },
  ): Promise<TeacherDailyBoard> {
    const tenantId = requireTenant(scope);
    assertGroupAllowed(scope, params.groupId);

    const date = params.date ? toDateOnly(params.date) : todayDateOnly();

    const group = await this.groups.findOne({
      where: { id: params.groupId, tenantId, deletedAt: IsNull() },
      select: { id: true, name: true, capacity: true, branchId: true },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    assertBranchAllowed(scope, group.branchId);

    const [children, records, batch] = await Promise.all([
      this.children.find({
        where: {
          groupId: params.groupId,
          deletedAt: IsNull(),
          status: Not(ChildStatus.WITHDRAWN),
        },
        order: { lastName: 'ASC', firstName: 'ASC' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          avatarUrl: true,
        },
      }),
      this.recordsRepo.find({
        where: { groupId: params.groupId, date },
        select: {
          childId: true,
          status: true,
          arrivedAt: true,
          leftAt: true,
          note: true,
        },
      }),
      this.batches.findOne({
        where: { groupId: params.groupId, date },
        select: { submittedAt: true },
      }),
    ]);

    const recordMap = new Map(records.map((record) => [record.childId, record]));
    const present = records.filter((record) => record.status === AttendanceStatus.PRESENT).length;
    const onVacation = records.filter((r) => r.status === AttendanceStatus.ON_VACATION).length;
    const expected = Math.max(0, children.length - onVacation);

    return {
      date: formatDateOnly(date),
      group: { id: group.id, name: group.name, capacity: group.capacity },
      summary: {
        date: formatDateOnly(date),
        total: children.length,
        expected,
        present,
        absent: Math.max(0, expected - present),
        excused: records.filter((r) => r.status === AttendanceStatus.ABSENT_EXCUSED).length,
        unexcused: records.filter((r) => r.status === AttendanceStatus.ABSENT_UNEXCUSED).length,
        onVacation,
        sick: records.filter((r) => r.status === AttendanceStatus.SICK).length,
        attendanceRate: percentage(present, expected),
      },
      isSubmitted: Boolean(batch),
      submittedAt: batch?.submittedAt?.toISOString() ?? null,
      children: children.map((child) => {
        const record = recordMap.get(child.id);
        return {
          id: child.id,
          fullName: fullName(child),
          avatarUrl: child.avatarUrl,
          status: record?.status ?? null,
          arrivedAt: record?.arrivedAt?.toISOString() ?? null,
          leftAt: record?.leftAt?.toISOString() ?? null,
          note: record?.note ?? null,
        };
      }),
    };
  }

  async records(scope: RequestScope, query: AttendanceQuery) {
    const tenantId = requireTenant(scope);
    const from = query.from ? toDateOnly(query.from) : undefined;
    const to = query.to ? toDateOnly(query.to) : undefined;
    const date = query.date ? toDateOnly(query.date) : undefined;

    const qb = this.recordsRepo
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.child', 'child')
      .leftJoinAndSelect('record.group', 'grp')
      .where('record.tenantId = :tenantId', { tenantId });

    if (date) qb.andWhere('record.date = :date', { date });
    if (from) qb.andWhere('record.date >= :from', { from });
    if (to) qb.andWhere('record.date <= :to', { to });
    if (query.childId) qb.andWhere('record.childId = :childId', { childId: query.childId });
    if (query.status) qb.andWhere('record.status = :status', { status: query.status });

    applyIdFilter(qb, 'record.groupId', 'gf', groupFilter(scope, query.groupId).groupId);

    if (query.branchId) {
      qb.andWhere('child.branchId = :branchId', { branchId: query.branchId });
    }

    const rows = await qb
      .orderBy('record.date', 'DESC')
      .addOrderBy('record.childId', 'ASC')
      .take(500)
      .getMany();

    return rows.map((row) => ({
      ...row,
      child: row.child
        ? {
            id: row.child.id,
            firstName: row.child.firstName,
            lastName: row.child.lastName,
            middleName: row.child.middleName,
          }
        : null,
      group: row.group ? { id: row.group.id, name: row.group.name } : null,
    }));
  }

  /** Ma'lum sanadagi kelgan bolalar soni — oziq-ovqat normasi uchun (TZ §9). */
  async presentCount(tenantId: string, branchId: string, date: Date): Promise<number> {
    return this.recordsRepo
      .createQueryBuilder('record')
      .innerJoin('record.child', 'child')
      .where('record.tenantId = :tenantId', { tenantId })
      .andWhere('record.date = :date', { date })
      .andWhere('record.status = :status', { status: AttendanceStatus.PRESENT })
      .andWhere('child.branchId = :branchId', { branchId })
      .andWhere('child.deletedAt IS NULL')
      .getCount();
  }

  /** Davomat kiritilmagan guruhlar — administrator uchun eslatma. */
  async missingSubmissions(scope: RequestScope, dateInput?: string) {
    const tenantId = requireTenant(scope);
    const date = dateInput ? toDateOnly(dateInput) : todayDateOnly();
    const bf = branchFilter(scope);

    const qb = this.groups
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.branch', 'branch')
      .leftJoinAndSelect('g.teachers', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoin('g.attendanceBatches', 'ab', 'ab.date = :date', { date })
      .where('g.tenantId = :tenantId', { tenantId })
      .andWhere('g.deletedAt IS NULL')
      .andWhere('g.isActive = true')
      .andWhere('ab.id IS NULL');

    applyIdFilter(qb, 'g.branchId', 'bf', bf.branchId);

    const groups = await qb.getMany();

    return {
      date: formatDateOnly(date),
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        branch: { id: group.branch.id, name: group.branch.name },
        teachers: (group.teachers ?? []).map((item) => ({
          ...item,
          user: { fullName: item.user.fullName, phone: item.user.phone },
        })),
      })),
    };
  }

  /** Oxirgi N kunning o'rtacha davomat foizi — anomaliya aniqlash uchun. */
  async averageAttendanceRate(tenantId: string, branchId: string, days: number): Promise<number> {
    const today = todayDateOnly();
    const from = addDays(today, -days);

    const rows = await this.recordsRepo
      .createQueryBuilder('record')
      .innerJoin('record.child', 'child')
      .select('record.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('record.tenantId = :tenantId', { tenantId })
      .andWhere('record.date >= :from AND record.date < :today', { from, today })
      .andWhere('child.branchId = :branchId', { branchId })
      .andWhere('child.deletedAt IS NULL')
      .groupBy('record.status')
      .getRawMany<{ status: AttendanceStatus; count: string }>();

    const total = rows.reduce((acc, row) => acc + Number(row.count), 0);
    const present = Number(
      rows.find((row) => row.status === AttendanceStatus.PRESENT)?.count ?? 0,
    );
    return percentage(present, total);
  }
}

function applyIdFilter(
  qb: SelectQueryBuilder<ObjectLiteral>,
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

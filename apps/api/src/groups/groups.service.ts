import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { percentage, type CreateGroupInput, type GroupSummary, type UpdateGroupInput } from '@bogcha/shared';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  assertBranchAllowed,
  assertBranchInTenant,
  assertGroupAllowed,
  ownGroupFilter,
  requireTenant,
  resolveBranchFilter,
  type RequestScope,
} from '../common/scope/request-scope';
import { addDays, todayDateOnly } from '../common/utils/date.util';
import { AttendanceStatus, AuditAction, ChildStatus } from '../entities/enums';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Branch } from '../entities/branch.entity';
import { Child } from '../entities/child.entity';
import { Group } from '../entities/group.entity';
import { GroupTeacher } from '../entities/group-teacher.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(GroupTeacher) private readonly groupTeachers: Repository<GroupTeacher>,
    @InjectRepository(Child) private readonly children: Repository<Child>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: RequestScope, params: { branchId?: string }): Promise<GroupSummary[]> {
    const tenantId = requireTenant(scope);
    const today = todayDateOnly();
    const thirtyDaysAgo = addDays(today, -30);
    const branchWhere = await resolveBranchFilter(this.branches, scope, params.branchId);

    const groups = await this.groups.find({
      where: {
        tenantId,
        deletedAt: IsNull(),
        ...branchWhere,
        ...ownGroupFilter(scope),
      },
      order: { branchId: 'ASC', name: 'ASC' },
      relations: {
        branch: true,
        teachers: { user: true },
      },
    });

    const groupIds = groups.map((group) => group.id);
    if (groupIds.length === 0) return [];

    const [childCounts, activeCounts, todayMarks, monthMarks] = await Promise.all([
      this.children
        .createQueryBuilder('c')
        .select('c.groupId', 'groupId')
        .addSelect('COUNT(*)', 'count')
        .where('c.groupId IN (:...groupIds)', { groupIds })
        .andWhere('c.deletedAt IS NULL')
        .groupBy('c.groupId')
        .getRawMany<{ groupId: string; count: string }>(),
      this.children
        .createQueryBuilder('c')
        .select('c.groupId', 'groupId')
        .addSelect('COUNT(*)', 'count')
        .where('c.groupId IN (:...groupIds)', { groupIds })
        .andWhere('c.deletedAt IS NULL')
        .andWhere('c.status = :status', { status: ChildStatus.ACTIVE })
        .groupBy('c.groupId')
        .getRawMany<{ groupId: string; count: string }>(),
      this.attendance
        .createQueryBuilder('a')
        .select('a.groupId', 'groupId')
        .addSelect('a.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('a.groupId IN (:...groupIds)', { groupIds })
        .andWhere('a.date = :today', { today })
        .groupBy('a.groupId')
        .addGroupBy('a.status')
        .getRawMany<{ groupId: string; status: AttendanceStatus; count: string }>(),
      this.attendance
        .createQueryBuilder('a')
        .select('a.groupId', 'groupId')
        .addSelect('a.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('a.groupId IN (:...groupIds)', { groupIds })
        .andWhere('a.date >= :from AND a.date <= :to', { from: thirtyDaysAgo, to: today })
        .groupBy('a.groupId')
        .addGroupBy('a.status')
        .getRawMany<{ groupId: string; status: AttendanceStatus; count: string }>(),
    ]);

    const childrenMap = new Map(childCounts.map((row) => [row.groupId, Number(row.count)]));
    const activeMap = new Map(activeCounts.map((row) => [row.groupId, Number(row.count)]));

    const todayPresent = new Map<string, number>();
    const todayTotal = new Map<string, number>();
    for (const row of todayMarks) {
      if (!row.groupId) continue;
      const count = Number(row.count);
      todayTotal.set(row.groupId, (todayTotal.get(row.groupId) ?? 0) + count);
      if (row.status === AttendanceStatus.PRESENT) {
        todayPresent.set(row.groupId, (todayPresent.get(row.groupId) ?? 0) + count);
      }
    }

    const monthPresent = new Map<string, number>();
    const monthTotal = new Map<string, number>();
    for (const row of monthMarks) {
      if (!row.groupId) continue;
      const count = Number(row.count);
      monthTotal.set(row.groupId, (monthTotal.get(row.groupId) ?? 0) + count);
      if (row.status === AttendanceStatus.PRESENT) {
        monthPresent.set(row.groupId, (monthPresent.get(row.groupId) ?? 0) + count);
      }
    }

    return groups.map((group) => {
      const childrenCount = childrenMap.get(group.id) ?? 0;
      const present = todayPresent.get(group.id) ?? 0;
      const marked = todayTotal.get(group.id) ?? 0;

      return {
        id: group.id,
        name: group.name,
        branchId: group.branchId,
        branchName: group.branch.name,
        ageFrom: group.ageFrom,
        ageTo: group.ageTo,
        capacity: group.capacity,
        childrenCount,
        activeChildrenCount: activeMap.get(group.id) ?? 0,
        occupancyPercent: percentage(childrenCount, group.capacity),
        teachers: (group.teachers ?? []).map((item) => ({
          id: item.user.id,
          fullName: item.user.fullName,
        })),
        todayPresent: present,
        todayAbsent: Math.max(0, marked - present),
        attendanceRate30d: percentage(monthPresent.get(group.id) ?? 0, monthTotal.get(group.id) ?? 0),
      };
    });
  }

  async findOne(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);
    assertGroupAllowed(scope, id);

    const group = await this.groups.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: {
        branch: true,
        teachers: { user: true },
        children: true,
      },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    assertBranchAllowed(scope, group.branchId);

    const children = (group.children ?? [])
      .filter((c) => c.deletedAt == null)
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      .map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        middleName: c.middleName,
        birthDate: c.birthDate,
        gender: c.gender,
        status: c.status,
        avatarUrl: c.avatarUrl,
      }));

    return {
      ...group,
      branch: { id: group.branch.id, name: group.branch.name },
      teachers: (group.teachers ?? []).map((item) => ({
        ...item,
        user: {
          id: item.user.id,
          fullName: item.user.fullName,
          phone: item.user.phone,
        },
      })),
      children,
    };
  }

  async create(scope: RequestScope, input: CreateGroupInput) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, input.branchId);

    const { teacherIds, ...data } = input;

    const group = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        Group,
        manager.create(Group, {
          ...data,
          colorToken: data.colorToken ?? null,
          tenantId,
        }),
      );

      if (teacherIds.length) {
        await manager.save(
          GroupTeacher,
          teacherIds.map((userId) => manager.create(GroupTeacher, { groupId: created.id, userId })),
        );
      }

      return manager.findOneOrFail(Group, {
        where: { id: created.id },
        relations: { teachers: true },
      });
    });

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Group',
      entityId: group.id,
      summary: `Yangi guruh: ${group.name}`,
      newValue: group,
    });

    return group;
  }

  async update(scope: RequestScope, id: string, input: UpdateGroupInput) {
    const tenantId = requireTenant(scope);

    const before = await this.groups.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: { teachers: true },
    });
    if (!before) throw new NotFoundException('Guruh topilmadi');
    assertBranchAllowed(scope, before.branchId);
    if (input.branchId) await assertBranchInTenant(this.branches, scope, input.branchId);

    const { teacherIds, ...data } = input;

    const group = await this.dataSource.transaction(async (manager) => {
      if (teacherIds) {
        await manager.delete(GroupTeacher, { groupId: id });
        if (teacherIds.length) {
          await manager.save(
            GroupTeacher,
            teacherIds.map((userId) => manager.create(GroupTeacher, { groupId: id, userId })),
          );
        }
      }

      await manager.update(Group, { id }, {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.branchId !== undefined ? { branchId: data.branchId } : {}),
        ...(data.ageFrom !== undefined ? { ageFrom: data.ageFrom } : {}),
        ...(data.ageTo !== undefined ? { ageTo: data.ageTo } : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
        ...(data.colorToken !== undefined ? { colorToken: data.colorToken ?? null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      });

      return manager.findOneOrFail(Group, {
        where: { id },
        relations: { teachers: true },
      });
    });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'Group',
      entityId: id,
      summary: `Guruh o'zgartirildi: ${group.name}`,
      oldValue: before,
      newValue: group,
    });

    return group;
  }

  async remove(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);

    const before = await this.groups.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('Guruh topilmadi');
    assertBranchAllowed(scope, before.branchId);

    const childrenCount = await this.children.count({
      where: { groupId: id, deletedAt: IsNull() },
    });

    if (childrenCount > 0) {
      throw new ConflictException(
        `Guruhda ${childrenCount} bola bor. Avval ularni boshqa guruhga o'tkazing.`,
      );
    }

    await this.groups.update({ id }, { deletedAt: new Date(), isActive: false });

    await this.auditService.record(scope, {
      action: AuditAction.DELETE,
      entityType: 'Group',
      entityId: id,
      summary: `Guruh o'chirildi: ${before.name}`,
      oldValue: { ...before, _count: { children: childrenCount } },
    });

    return { success: true };
  }

  /** Tarbiyachining guruhlari — mobil ilova uchun. */
  async myGroups(scope: RequestScope) {
    const tenantId = requireTenant(scope);

    const groups = await this.groups
      .createQueryBuilder('g')
      .innerJoinAndSelect('g.branch', 'branch')
      .innerJoin('g.teachers', 'teacher', 'teacher.userId = :userId', { userId: scope.userId })
      .where('g.tenantId = :tenantId', { tenantId })
      .andWhere('g.deletedAt IS NULL')
      .andWhere('g.isActive = true')
      .orderBy('g.name', 'ASC')
      .getMany();

    const groupIds = groups.map((g) => g.id);
    const counts =
      groupIds.length === 0
        ? []
        : await this.children
            .createQueryBuilder('c')
            .select('c.groupId', 'groupId')
            .addSelect('COUNT(*)', 'count')
            .where('c.groupId IN (:...groupIds)', { groupIds })
            .andWhere('c.deletedAt IS NULL')
            .groupBy('c.groupId')
            .getRawMany<{ groupId: string; count: string }>();
    const countMap = new Map(counts.map((r) => [r.groupId, Number(r.count)]));

    return groups.map((group) => ({
      ...group,
      branch: { id: group.branch.id, name: group.branch.name },
      _count: { children: countMap.get(group.id) ?? 0 },
    }));
  }
}

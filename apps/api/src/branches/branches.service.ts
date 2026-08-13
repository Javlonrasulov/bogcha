import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  allowedBranchIds,
  assertBranchInTenant,
  requireTenant,
  type RequestScope,
} from '../common/scope/request-scope';
import { AuditAction, ChildStatus } from '../entities/enums';
import { Branch } from '../entities/branch.entity';
import { Child } from '../entities/child.entity';
import { Group } from '../entities/group.entity';
import { AuditService } from '../audit/audit.service';
import type { CreateBranchDto, UpdateBranchDto } from './dto/branches.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Child) private readonly children: Repository<Child>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: RequestScope) {
    const tenantId = requireTenant(scope);
    const branchIds = allowedBranchIds(scope);

    const branches = await this.branches.find({
      where: {
        tenantId,
        deletedAt: IsNull(),
        ...(branchIds ? { id: In(branchIds) } : {}),
      },
      order: { name: 'ASC' },
    });

    const ids = branches.map((b) => b.id);
    if (ids.length === 0) return [];

    const [groupCounts, childCounts] = await Promise.all([
      this.groups
        .createQueryBuilder('g')
        .select('g.branchId', 'branchId')
        .addSelect('COUNT(*)', 'count')
        .where('g.branchId IN (:...ids)', { ids })
        .andWhere('g.deletedAt IS NULL')
        .groupBy('g.branchId')
        .getRawMany<{ branchId: string; count: string }>(),
      this.children
        .createQueryBuilder('c')
        .select('c.branchId', 'branchId')
        .addSelect('COUNT(*)', 'count')
        .where('c.tenantId = :tenantId', { tenantId })
        .andWhere('c.deletedAt IS NULL')
        .andWhere('c.status = :status', { status: ChildStatus.ACTIVE })
        .andWhere(branchIds ? 'c.branchId IN (:...branchIds)' : '1=1', { branchIds: branchIds ?? [] })
        .groupBy('c.branchId')
        .getRawMany<{ branchId: string; count: string }>(),
    ]);

    const groupMap = new Map(groupCounts.map((r) => [r.branchId, Number(r.count)]));
    const childCountMap = new Map(childCounts.map((r) => [r.branchId, Number(r.count)]));

    return branches.map((branch) => {
      const childrenCount = childCountMap.get(branch.id) ?? 0;
      return {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        phone: branch.phone,
        managerName: branch.managerName,
        capacity: branch.capacity,
        isActive: branch.isActive,
        groupCount: groupMap.get(branch.id) ?? 0,
        staffCount: 0,
        childrenCount,
        occupancyPercent:
          branch.capacity > 0 ? Math.round((childrenCount / branch.capacity) * 1000) / 10 : 0,
      };
    });
  }

  async findOne(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, id);

    const branch = await this.branches.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: { groups: true },
    });
    if (!branch) throw new NotFoundException('Filial topilmadi');

    const activeGroups = (branch.groups ?? [])
      .filter((g) => g.deletedAt == null)
      .sort((a, b) => a.name.localeCompare(b.name));

    const groupIds = activeGroups.map((g) => g.id);
    const childCounts =
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
    const childMap = new Map(childCounts.map((r) => [r.groupId, Number(r.count)]));

    return {
      ...branch,
      groups: activeGroups.map((group) => ({
        ...group,
        _count: { children: childMap.get(group.id) ?? 0 },
      })),
    };
  }

  async create(scope: RequestScope, input: CreateBranchDto) {
    const tenantId = requireTenant(scope);

    const branch = await this.branches.save(
      this.branches.create({
        ...input,
        address: input.address ?? null,
        phone: input.phone ?? null,
        managerName: input.managerName ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        tenantId,
      }),
    );

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Branch',
      entityId: branch.id,
      summary: `Yangi filial: ${branch.name}`,
      newValue: branch,
    });

    return branch;
  }

  async update(scope: RequestScope, id: string, input: UpdateBranchDto) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, id);

    const before = await this.branches.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!before) throw new NotFoundException('Filial topilmadi');

    await this.branches.update({ id }, input);
    const branch = await this.branches.findOneOrFail({ where: { id } });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'Branch',
      entityId: id,
      summary: `Filial o'zgartirildi: ${branch.name}`,
      oldValue: before,
      newValue: branch,
    });

    return branch;
  }

  async remove(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, id);

    const before = await this.branches.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!before) throw new NotFoundException('Filial topilmadi');

    // Tarixni saqlash uchun yumshoq o'chirish ishlatiladi.
    await this.branches.update({ id }, { deletedAt: new Date(), isActive: false });

    await this.auditService.record(scope, {
      action: AuditAction.DELETE,
      entityType: 'Branch',
      entityId: id,
      summary: `Filial o'chirildi: ${before.name}`,
      oldValue: before,
    });

    return { success: true, id };
  }
}

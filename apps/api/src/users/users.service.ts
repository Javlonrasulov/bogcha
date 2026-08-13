import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  permissionsForRoles,
  type CreateUserInput,
  type PaginationQuery,
  type Role,
  type UpdateUserInput,
} from '@bogcha/shared';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  assertBranchInTenant,
  isSuperAdmin,
  requireTenant,
  type RequestScope,
} from '../common/scope/request-scope';
import { paginate, paginated } from '../common/utils/pagination.util';
import { AuditAction, Role as EntityRole } from '../entities/enums';
import { Branch } from '../entities/branch.entity';
import { GroupTeacher } from '../entities/group-teacher.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { UserBranch } from '../entities/user-branch.entity';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';

const USER_RELATIONS = {
  branches: { branch: true },
  groups: { group: true },
} as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly dataSource: DataSource,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: RequestScope, query: PaginationQuery & { role?: Role }) {
    const tenantId = requireTenant(scope);
    const { skip, take } = paginate(query);

    const qb = this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.branches', 'userBranch')
      .leftJoinAndSelect('userBranch.branch', 'branch')
      .leftJoinAndSelect('user.groups', 'groupTeacher')
      .leftJoinAndSelect('groupTeacher.group', 'group')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('user.deletedAt IS NULL');

    if (query.role) {
      qb.andWhere('user.roles @> ARRAY[:role]::"Role"[]', { role: query.role });
    }

    if (query.search) {
      qb.andWhere(
        '(user.fullName ILIKE :search OR user.phone ILIKE :search OR user.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('user.fullName', 'ASC').skip(skip).take(take);

    const [items, total] = await qb.getManyAndCount();

    return paginated(
      items.map((user) => ({
        ...this.mapUser(user),
        permissions: permissionsForRoles(user.roles as Role[]),
      })),
      total,
      query,
    );
  }

  async findOne(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);
    const user = await this.users.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: USER_RELATIONS,
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return {
      ...this.mapUser(user),
      permissions: permissionsForRoles(user.roles as Role[]),
    };
  }

  async create(scope: RequestScope, input: CreateUserInput) {
    const tenantId = requireTenant(scope);
    this.assertCanAssignRoles(scope, input.roles);
    for (const branchId of input.branchIds) {
      await assertBranchInTenant(this.branches, scope, branchId);
    }

    const user = await this.dataSource.transaction(async (manager) => {
      const created = manager.create(User, {
        tenantId,
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone,
        passwordHash: await this.passwordService.hash(input.password),
        roles: input.roles as EntityRole[],
        locale: input.locale,
        isActive: input.isActive,
        mustChangePassword: true,
      });
      const saved = await manager.save(User, created);

      if (input.branchIds.length) {
        await manager.save(
          UserBranch,
          input.branchIds.map((branchId) => manager.create(UserBranch, { userId: saved.id, branchId })),
        );
      }
      if (input.groupIds.length) {
        await manager.save(
          GroupTeacher,
          input.groupIds.map((groupId) => manager.create(GroupTeacher, { userId: saved.id, groupId })),
        );
      }

      return manager.findOneOrFail(User, {
        where: { id: saved.id },
        relations: USER_RELATIONS,
      });
    });

    const mapped = this.mapUser(user);
    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user.id,
      summary: `Yangi foydalanuvchi: ${user.fullName} (${user.roles.join(', ')})`,
      newValue: { fullName: user.fullName, roles: user.roles, phone: user.phone },
    });

    return mapped;
  }

  async update(scope: RequestScope, id: string, input: UpdateUserInput) {
    const tenantId = requireTenant(scope);
    if (input.roles) this.assertCanAssignRoles(scope, input.roles);

    const before = await this.users.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: USER_RELATIONS,
    });
    if (!before) throw new NotFoundException('Foydalanuvchi topilmadi');

    const { branchIds, groupIds, ...rest } = input;

    const user = await this.dataSource.transaction(async (manager) => {
      if (branchIds) {
        for (const branchId of branchIds) {
          await assertBranchInTenant(this.branches, scope, branchId);
        }
        await manager.delete(UserBranch, { userId: id });
        if (branchIds.length) {
          await manager.save(
            UserBranch,
            branchIds.map((branchId) => manager.create(UserBranch, { userId: id, branchId })),
          );
        }
      }
      if (groupIds) {
        await manager.delete(GroupTeacher, { userId: id });
        if (groupIds.length) {
          await manager.save(
            GroupTeacher,
            groupIds.map((groupId) => manager.create(GroupTeacher, { userId: id, groupId })),
          );
        }
      }

      const bumpToken = Boolean(rest.roles || branchIds || groupIds);
      await manager.update(
        User,
        { id },
        {
          ...(rest.fullName !== undefined ? { fullName: rest.fullName } : {}),
          ...(rest.email !== undefined ? { email: rest.email ?? null } : {}),
          ...(rest.phone !== undefined ? { phone: rest.phone } : {}),
          ...(rest.roles !== undefined ? { roles: rest.roles as EntityRole[] } : {}),
          ...(rest.locale !== undefined ? { locale: rest.locale } : {}),
          ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}),
        },
      );

      if (bumpToken) {
        await manager.increment(User, { id }, 'tokenVersion', 1);
      }

      return manager.findOneOrFail(User, {
        where: { id },
        relations: USER_RELATIONS,
      });
    });

    const mappedBefore = this.mapUser(before);
    const mapped = this.mapUser(user);

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      summary: `Foydalanuvchi o'zgartirildi: ${user.fullName}`,
      oldValue: mappedBefore,
      newValue: mapped,
    });

    return mapped;
  }

  async resetPassword(scope: RequestScope, id: string, newPassword: string) {
    const tenantId = requireTenant(scope);

    const user = await this.users.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const passwordHash = await this.passwordService.hash(newPassword);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        User,
        { id },
        {
          passwordHash,
          mustChangePassword: true,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      );
      await manager.increment(User, { id }, 'tokenVersion', 1);
      await manager.update(
        RefreshToken,
        { userId: id, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      summary: `Parol administrator tomonidan tiklandi: ${user.fullName}`,
    });

    return { success: true };
  }

  async remove(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);

    if (id === scope.userId) {
      throw new ForbiddenException("O'z akkauntingizni o'chirib bo'lmaydi");
    }

    const user = await this.users.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    await this.users.update(
      { id },
      { deletedAt: new Date(), isActive: false },
    );
    await this.users.increment({ id }, 'tokenVersion', 1);

    await this.auditService.record(scope, {
      action: AuditAction.DELETE,
      entityType: 'User',
      entityId: id,
      summary: `Foydalanuvchi o'chirildi: ${user.fullName}`,
      oldValue: { fullName: user.fullName, roles: user.roles },
    });

    return { success: true };
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      branches: (user.branches ?? []).map((item) => ({
        branch: { id: item.branch.id, name: item.branch.name },
      })),
      groups: (user.groups ?? []).map((item) => ({
        group: { id: item.group.id, name: item.group.name },
      })),
    };
  }

  /** Faqat super admin OWNER va SUPER_ADMIN rollarini bera oladi. */
  private assertCanAssignRoles(scope: RequestScope, roles: Role[]): void {
    if (isSuperAdmin(scope)) return;

    const privileged: Role[] = [EntityRole.SUPER_ADMIN as Role, EntityRole.OWNER as Role];
    const requested = roles.filter((role) => privileged.includes(role));

    if (requested.length > 0) {
      throw new ForbiddenException(
        `Bu rollarni faqat platforma administratori bera oladi: ${requested.join(', ')}`,
      );
    }
  }
}

import { ForbiddenException } from '@nestjs/common';
import { Permission, Role, isGroupScopedRole, isPlatformRole } from '@bogcha/shared';
import { In, IsNull, type FindOptionsWhere, type Repository } from 'typeorm';
import { Branch } from '../../entities/branch.entity';

/**
 * So'rov konteksti — tenant izolyatsiyasining yagona manbasi (TZ §39).
 *
 * Har bir servis metodi `RequestScope` oladi va `where` shartini shu yerdan quradi.
 * Shu sababli tenant filtri tasodifan tushib qolishi mumkin emas: `tenantId`
 * hech qachon so'rov tanasidan yoki query paramdan olinmaydi.
 */
export interface RequestScope {
  userId: string;
  tenantId: string | null;
  roles: Role[];
  permissions: Permission[];
  /** Bo'sh massiv — tenantdagi barcha filiallarga ruxsat. */
  branchIds: string[];
  groupIds: string[];
}

export class ScopeError extends ForbiddenException {}

/** Tenantga tegishli amallar uchun `tenantId` majburiy. */
export function requireTenant(scope: RequestScope): string {
  if (!scope.tenantId) {
    throw new ScopeError(
      "Bu amal tashkilot kontekstini talab qiladi. Super admin uchun tashkilotni tanlang.",
    );
  }
  return scope.tenantId;
}

export function isSuperAdmin(scope: RequestScope): boolean {
  return scope.roles.some(isPlatformRole);
}

export function hasAllBranches(scope: RequestScope): boolean {
  return scope.branchIds.length === 0;
}

/**
 * TypeORM `where` uchun filial filtri.
 * `branchId` berilganda avval `assertBranchInTenant` chaqirilgan bo'lishi shart.
 */
export function branchFilter(
  scope: RequestScope,
  branchId?: string,
): FindOptionsWhere<{ branchId: string }> {
  if (branchId) {
    assertBranchAllowed(scope, branchId);
    return { branchId };
  }
  if (hasAllBranches(scope)) return {};
  return { branchId: In(scope.branchIds) };
}

/**
 * FAQAT JWT dagi filial ro'yxatini tekshiradi. Barcha-filial (bo'sh massiv)
 * uchun hech narsa qilmaydi — shuning uchun klientdan kelgan `branchId` uchun
 * `assertBranchInTenant` ishlating.
 */
export function assertBranchAllowed(scope: RequestScope, branchId: string): void {
  if (hasAllBranches(scope)) return;
  if (!scope.branchIds.includes(branchId)) {
    throw new ScopeError("Bu filial ma'lumotlariga ruxsatingiz yo'q");
  }
}

/**
 * Filial shu tashkilotga tegishli ekanini DB dan tasdiqlaydi, so'ng JWT ACL.
 */
export async function assertBranchInTenant(
  branches: Repository<Branch>,
  scope: RequestScope,
  branchId: string,
): Promise<void> {
  const tenantId = requireTenant(scope);
  const branch = await branches.findOne({
    where: { id: branchId, tenantId, deletedAt: IsNull() },
    select: { id: true },
  });
  if (!branch) {
    throw new ScopeError("Filial topilmadi yoki bu tashkilotga tegishli emas");
  }
  assertBranchAllowed(scope, branchId);
}

/**
 * Query/body dagi ixtiyoriy `branchId` ni tekshirib, TypeORM filtrini qaytaradi.
 */
export async function resolveBranchFilter(
  branches: Repository<Branch>,
  scope: RequestScope,
  branchId?: string,
): Promise<FindOptionsWhere<{ branchId: string }>> {
  if (branchId) {
    await assertBranchInTenant(branches, scope, branchId);
    return { branchId };
  }
  return branchFilter(scope);
}

/**
 * Guruh filtri. Tarbiyachi faqat o'ziga biriktirilgan guruhlarni ko'radi (TZ §3).
 */
export function groupFilter(
  scope: RequestScope,
  groupId?: string,
): FindOptionsWhere<{ groupId: string }> {
  const restricted = scope.roles.some(isGroupScopedRole);

  if (groupId) {
    if (restricted) assertGroupAllowed(scope, groupId);
    return { groupId };
  }
  if (restricted) return { groupId: In(scope.groupIds) };
  return {};
}

/**
 * `Group` modelining o'zi uchun filtr: bu yerda kalit `groupId` emas, `id`.
 */
export function ownGroupFilter(scope: RequestScope): FindOptionsWhere<{ id: string }> {
  if (!scope.roles.some(isGroupScopedRole)) return {};
  return { id: In(scope.groupIds) };
}

export function assertGroupAllowed(scope: RequestScope, groupId: string): void {
  if (!scope.roles.some(isGroupScopedRole)) return;
  if (!scope.groupIds.includes(groupId)) {
    throw new ScopeError("Bu guruh ma'lumotlariga ruxsatingiz yo'q");
  }
}

/** Foydalanuvchi ko'ra oladigan filiallar ro'yxati; bo'sh bo'lsa hammasi. */
export function allowedBranchIds(scope: RequestScope): string[] | null {
  return hasAllBranches(scope) ? null : scope.branchIds;
}

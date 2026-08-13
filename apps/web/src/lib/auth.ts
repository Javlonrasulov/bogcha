import 'server-only';
import { cache } from 'react';
import { hasAnyPermission, Role, type Permission } from '@bogcha/shared';
import { apiFetch } from './api';
import { getActiveBranchId } from './session';
import type { AuthUser, Branch } from './types';

/** Bir render davomida `/auth/me` faqat bir marta chaqiriladi. */
export const getCurrentUser = cache(async (): Promise<AuthUser> => {
  return apiFetch<AuthUser>('/auth/me');
});

export const getBranches = cache(async (): Promise<Branch[]> => {
  try {
    return await apiFetch<Branch[]>('/branches');
  } catch {
    // Tarbiyachi/oshpazda filial ro'yxatini ko'rish huquqi bo'lmasligi mumkin.
    return [];
  }
});

export interface Viewer {
  user: AuthUser;
  branches: Branch[];
  /** Tanlangan filial; `null` — barcha ruxsat etilgan filiallar. */
  branchId: string | null;
  /**
   * Bitta filial talab qiladigan ekranlar uchun (oziqlanish, menyu): tanlangan
   * filial yoki ro'yxatdagi birinchisi.
   */
  requiredBranchId: string | null;
  can: (...permissions: Permission[]) => boolean;
  hasRole: (...roles: Role[]) => boolean;
}

export const getViewer = cache(async (): Promise<Viewer> => {
  const [user, branches, cookieBranchId] = await Promise.all([
    getCurrentUser(),
    getBranches(),
    getActiveBranchId(),
  ]);

  // Faqat ruxsat etilgan filial tanlangan bo'lishi mumkin.
  const allowed = branches.map((branch) => branch.id);
  const branchId =
    cookieBranchId && allowed.includes(cookieBranchId)
      ? cookieBranchId
      : user.branchIds.length === 1
        ? user.branchIds[0]!
        : null;

  return {
    user,
    branches,
    branchId,
    requiredBranchId: branchId ?? branches[0]?.id ?? user.branchIds[0] ?? null,
    can: (...permissions: Permission[]) => hasAnyPermission(user.permissions, permissions),
    hasRole: (...roles: Role[]) => roles.some((role) => user.roles.includes(role)),
  };
});

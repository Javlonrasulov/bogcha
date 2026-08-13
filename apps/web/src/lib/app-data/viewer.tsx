'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { hasAnyPermission, Role, type Permission } from '@bogcha/shared';

export interface ClientViewer {
  branchId: string | null;
  requiredBranchId: string | null;
  permissions: readonly Permission[];
  roles: readonly Role[];
  fullName: string;
  userId: string;
  branches: Array<{ id: string; name: string }>;
  can: (...permissions: Permission[]) => boolean;
  hasRole: (...roles: Role[]) => boolean;
}

const ViewerContext = createContext<ClientViewer | null>(null);

export function ViewerProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: Omit<ClientViewer, 'can' | 'hasRole'> & {
    permissions: readonly Permission[];
    roles: readonly Role[];
  };
}) {
  const viewer: ClientViewer = {
    ...value,
    can: (...permissions) => hasAnyPermission(value.permissions, permissions),
    hasRole: (...roles) => roles.some((role) => value.roles.includes(role)),
  };
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ClientViewer {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error('useViewer ViewerProvider ichida ishlatilishi kerak');
  return ctx;
}

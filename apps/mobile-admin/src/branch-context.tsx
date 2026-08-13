import { useAuth, useResource } from '@bogcha/mobile-core';
import type { Branch } from '@bogcha/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface BranchContextValue {
  branches: Branch[];
  /** `null` — barcha filiallar (faqat Owner uchun mumkin). */
  branchId: string | null;
  setBranchId: (id: string | null) => void;
  /** So'rovlarga qo'shiladigan `?branchId=…` qismi. */
  query: string;
  /**
   * Oziqlanish va xarid rejasi kabi endpointlar bitta filialni talab qiladi.
   * Filial tanlanmagan bo'lsa, birinchi ruxsat berilgan filial ishlatiladi.
   */
  scopedBranchId: string | null;
  scopedQuery: string;
  loading: boolean;
  activeBranch: Branch | null;
}

const BranchContext = createContext<BranchContextValue | null>(null);

/**
 * Filial tanlovi (TZ §26). Owner barcha filiallarni umumiy ko'radi,
 * boshqa rollar esa faqat o'ziga ruxsat berilganlarini.
 */
export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const resource = useResource<Branch[]>('/branches', 'branches');

  const value = useMemo<BranchContextValue>(() => {
    const all = resource.data ?? [];
    // Foydalanuvchi filiallari bilan cheklanadi; bo'sh ro'yxat — hammasi.
    const allowed =
      user && user.branchIds.length > 0
        ? all.filter((branch) => user.branchIds.includes(branch.id))
        : all;
    const active = branchId ? (allowed.find((branch) => branch.id === branchId) ?? null) : null;
    const scopedBranchId = branchId ?? allowed[0]?.id ?? null;

    return {
      branches: allowed,
      branchId,
      setBranchId,
      query: branchId ? `branchId=${branchId}` : '',
      scopedBranchId,
      scopedQuery: scopedBranchId ? `branchId=${scopedBranchId}` : '',
      loading: resource.loading,
      activeBranch: active,
    };
  }, [resource.data, resource.loading, branchId, user]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch(): BranchContextValue {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranch faqat BranchProvider ichida ishlaydi');
  return context;
}

/** `path` ga filial va qo'shimcha parametrlarni qo'shadi. */
export function withQuery(path: string, ...parts: Array<string | null | undefined>): string {
  const query = parts.filter((part): part is string => Boolean(part)).join('&');
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

import { Award, PiggyBank, TrendingDown, TrendingUp, TriangleAlert, Wallet } from 'lucide-react';
import type { IconName } from '../../lib/nav';
import { NavIcon } from '../shell/icons';

const EXTRA = {
  wallet: Wallet,
  alert: TriangleAlert,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  award: Award,
  profit: PiggyBank,
} as const;

export type StatIconName = IconName | keyof typeof EXTRA;

/** `StatCard`da ikonani nom bilan berish uchun (`icon="children"`). */
export function StatIcon({ name, className }: { name: StatIconName; className?: string }) {
  const Extra = EXTRA[name as keyof typeof EXTRA];
  if (Extra) return <Extra className={className} strokeWidth={1.9} aria-hidden />;
  return <NavIcon name={name as IconName} className={className} />;
}

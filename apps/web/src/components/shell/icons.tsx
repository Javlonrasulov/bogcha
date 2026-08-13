import {
  ArrowLeftRight,
  Baby,
  Banknote,
  Bell,
  Boxes,
  CalendarCheck,
  ChefHat,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Truck,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import type { IconName } from '../../lib/nav';

const ICONS: Record<IconName, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  children: Baby,
  groups: Users,
  attendance: CalendarCheck,
  recipes: ChefHat,
  foodConsumption: UtensilsCrossed,
  inventory: Boxes,
  suppliers: Truck,
  incomes: Banknote,
  expenses: Receipt,
  payments: CreditCard,
  debts: Wallet,
  notifications: Bell,
  users: Users,
};

export function NavIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = ICONS[name] ?? ArrowLeftRight;
  return <Icon className={className} strokeWidth={1.9} aria-hidden />;
}

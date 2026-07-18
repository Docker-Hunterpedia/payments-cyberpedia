import { Role } from '@cyberpedia/shared';
import {
  AlarmClock,
  BookOpen,
  LayoutDashboard,
  Presentation,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const both = [Role.ADMIN, Role.ACCOUNTER];
const adminOnly = [Role.ADMIN];

// The first four appear in the mobile bottom bar (around the Record button);
// the rest live under More on phones. The sidebar shows everything.
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, roles: both },
  { to: '/students', label: 'Students', icon: Users, roles: both },
  { to: '/unpaid', label: 'Unpaid', icon: AlarmClock, roles: both },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: '/courses', label: 'Courses', icon: BookOpen, roles: both },
  { to: '/teachers', label: 'Teachers', icon: Presentation, roles: adminOnly },
  { to: '/finance', label: 'Finance', icon: Wallet, roles: adminOnly },
  { to: '/analytics', label: 'Analytics', icon: TrendingUp, roles: adminOnly },
  { to: '/settings', label: 'Settings', icon: Settings, roles: adminOnly },
];

export function visibleItems(
  items: NavItem[],
  role: Role | undefined,
): NavItem[] {
  if (!role) return [];
  return items.filter((item) => item.roles.includes(role));
}

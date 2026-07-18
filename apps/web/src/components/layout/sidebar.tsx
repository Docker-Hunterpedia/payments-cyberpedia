import { Banknote, LogOut } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { useLogout } from '@/api/queries';
import { useAuth } from '@/providers/auth-provider';
import { PRIMARY_NAV, SECONDARY_NAV, visibleItems } from './nav';

export function Wordmark() {
  return (
    <span className="font-display text-lg font-bold tracking-tight">
      Cyberpedia<span className="text-brand"> Payments</span>
    </span>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const logout = useLogout();
  const items = [
    ...visibleItems(PRIMARY_NAV, user?.role),
    ...visibleItems(SECONDARY_NAV, user?.role),
  ];
  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-6 pb-5 pt-7">
        <Wordmark />
      </div>

      <div className="px-4">
        <Link
          to="/record"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white shadow-raised transition-colors hover:bg-brand-strong"
        >
          <Banknote className="size-4" />
          Record payment
        </Link>
      </div>

      <nav
        className="mt-5 flex-1 space-y-1 overflow-y-auto px-4"
        aria-label="Main"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-soft text-brand-strong'
                  : 'text-muted hover:bg-paper hover:text-ink',
              )
            }
          >
            <item.icon className="size-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand-strong">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <p className="text-xs capitalize text-faint">
            {user?.role.toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          aria-label="Sign out"
          className="rounded-lg p-2 text-faint transition-colors hover:bg-line/60 hover:text-overdue"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}

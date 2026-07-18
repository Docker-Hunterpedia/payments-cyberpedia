import { Banknote, Menu } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { PRIMARY_NAV, visibleItems } from './nav';

function NavTab({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof Menu;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors',
          isActive ? 'text-brand-strong' : 'text-faint',
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  );
}

export function BottomNav() {
  const { user } = useAuth();
  const tabs = visibleItems(PRIMARY_NAV, user?.role);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 items-center px-2 py-1">
        {tabs.slice(0, 2).map((item) => (
          <NavTab
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
          />
        ))}
        <div className="flex justify-center">
          <NavLink
            to="/record"
            aria-label="Record payment"
            className="-mt-8 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-raised transition-transform active:scale-95"
          >
            <Banknote className="size-6" />
          </NavLink>
        </div>
        {tabs.slice(2).map((item) => (
          <NavTab
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
          />
        ))}
        <NavTab to="/more" label="More" icon={Menu} />
      </div>
    </nav>
  );
}

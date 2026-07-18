import { ChevronRight, LogOut } from 'lucide-react';
import { Link } from 'react-router';
import { useLogout } from '@/api/queries';
import { PageBody, PageHeader } from '@/components/layout/page';
import { SECONDARY_NAV, visibleItems } from '@/components/layout/nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/providers/auth-provider';

export function MorePage() {
  const { user } = useAuth();
  const logout = useLogout();
  const items = visibleItems(SECONDARY_NAV, user?.role);

  return (
    <>
      <PageHeader title="More" />
      <PageBody className="space-y-4">
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">
            {(user?.name ?? '?')
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-[13px] text-muted">{user?.email}</p>
          </div>
          <Badge tone="brand" className="capitalize">
            {user?.role.toLowerCase()}
          </Badge>
        </Card>

        {items.length > 0 && (
          <Card className="divide-y divide-line/70 overflow-hidden">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-paper active:bg-paper"
              >
                <item.icon className="size-5 text-muted" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <ChevronRight className="size-4 text-faint" />
              </Link>
            ))}
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full text-overdue hover:border-overdue/40 hover:text-overdue"
          onClick={() => logout.mutate()}
          loading={logout.isPending}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </PageBody>
    </>
  );
}

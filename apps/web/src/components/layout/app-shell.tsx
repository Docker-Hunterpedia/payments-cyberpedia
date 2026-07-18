import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useMe } from '@/api/queries';
import { useAuth } from '@/providers/auth-provider';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';

export function AppShell() {
  const { syncUser } = useAuth();
  const me = useMe();

  useEffect(() => {
    if (me.data) syncUser(me.data);
  }, [me.data, syncUser]);

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-64">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}

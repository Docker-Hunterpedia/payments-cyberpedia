import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  loadStoredUser,
  storeUser,
  tokenStore,
  type AuthUser,
} from '@/lib/auth';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  setSession: (session: Session) => void;
  syncUser: (user: AuthUser) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const setSession = useCallback((session: Session) => {
    tokenStore.set(session.accessToken, session.refreshToken);
    storeUser(session.user);
    setUser(session.user);
  }, []);

  const syncUser = useCallback((next: AuthUser) => {
    storeUser(next);
    setUser(next);
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setSession, syncUser, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

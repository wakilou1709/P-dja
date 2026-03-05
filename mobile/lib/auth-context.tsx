import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, saveTokens, clearTokens, getAccessToken } from './api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  points: number;
  level: number;
  streak: number;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifie si un token existe au démarrage et charge l'utilisateur
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const me = await authApi.me();
          setUser(me);
        }
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email: email.trim().toLowerCase(), password });
    await saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const register = async (formData: { firstName: string; lastName: string; email: string; password: string }) => {
    const data = await authApi.register({ ...formData, email: formData.email.trim().toLowerCase() });
    await saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    await authApi.logout();
    await clearTokens();
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await authApi.me();
    setUser(me);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

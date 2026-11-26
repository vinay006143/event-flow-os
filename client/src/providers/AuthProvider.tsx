import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: 'admin' | 'staff';
  status: string;
  permissions: string[];
  assignedGateIds: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    portal: 'admin' | 'staff',
    deviceCode?: string,
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const res = await api.get('/auth/me');
      const u = res.data.data.user as AuthUser;
      setUser(u);
      localStorage.setItem('efo_device_profile', JSON.stringify({ ...u, lastVerifiedAt: new Date().toISOString() }));
    } catch {
      try {
        const refreshed = await api.post('/auth/refresh');
        const u = refreshed.data.data.user as AuthUser;
        setUser(u);
        localStorage.setItem('efo_device_profile', JSON.stringify({ ...u, lastVerifiedAt: new Date().toISOString() }));
      } catch {
        setUser(null);
        localStorage.removeItem('efo_device_profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (
    email: string,
    password: string,
    portal: 'admin' | 'staff',
    deviceCode?: string,
  ) => {
    const endpoint = portal === 'admin' ? '/auth/admin/login' : '/auth/staff/login';
    const res = await api.post(endpoint, { email, password, deviceCode });
    const u = res.data.data.user as AuthUser;
    setUser(u);
    localStorage.setItem(
      'efo_device_profile',
      JSON.stringify({ ...u, deviceCode: deviceCode || undefined, lastLoginAt: new Date().toISOString() }),
    );
    return u;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore logout transport error
    } finally {
      localStorage.removeItem('efo_device_profile');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

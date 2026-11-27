import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  clearSavedCredentials,
  detectPortalFromPath,
  getPortalToken,
  loadEncryptedCredentials,
  saveEncryptedCredentials,
  setPortalToken,
  type PortalType,
} from '../lib/credentialVault';

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
    rememberDevice?: boolean,
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: (portalOverride?: PortalType) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async (portalOverride?: PortalType) => {
    const portal: PortalType = portalOverride ?? detectPortalFromPath() ?? 'admin';
    const vault = await loadEncryptedCredentials(portal);

    // Preload decrypted Bearer token if available so /auth/me works across cross-origin Render/Vercel too
    if (vault?.accessToken && !vault.autoLoginPaused) {
      setPortalToken(portal, vault.accessToken);
    }

    const activeToken = getPortalToken(portal);
    const hasCookieOrToken = Boolean(activeToken) || (vault && !vault.autoLoginPaused);

    if (!detectPortalFromPath() && !activeToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me', activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : undefined);
      const u = res.data.data.user as AuthUser;
      if (u.role === portal || !detectPortalFromPath()) {
        setUser(u);
        localStorage.setItem('efo_device_profile', JSON.stringify({ ...u, lastVerifiedAt: new Date().toISOString() }));
        if (vault && !vault.autoLoginPaused) {
          await saveEncryptedCredentials(portal, { ...vault, user: u });
        }
        setLoading(false);
        return;
      }
    } catch (meErr) {
      const status = (meErr as { status?: number })?.status;
      // Network error or cold-starting Render backend — preserve valid 20-day cached user session
      if ((!status || status >= 500) && vault?.user && !vault.autoLoginPaused && hasCookieOrToken) {
        setUser(vault.user);
        setLoading(false);
        return;
      }
    }

    // Try refresh token (cookie or decrypted vault refreshToken)
    if (!vault?.autoLoginPaused) {
      try {
        const refreshed = await api.post('/auth/refresh', vault?.refreshToken ? { refreshToken: vault.refreshToken } : {});
        const u = refreshed.data.data.user as AuthUser;
        const newAccess = refreshed.data.data.accessToken as string | undefined;
        const newRefresh = refreshed.data.data.refreshToken as string | undefined;
        setPortalToken(portal, newAccess);
        if (u.role === portal) {
          setUser(u);
          localStorage.setItem('efo_device_profile', JSON.stringify({ ...u, lastVerifiedAt: new Date().toISOString() }));
          if (vault) {
            await saveEncryptedCredentials(portal, {
              ...vault,
              accessToken: newAccess ?? vault.accessToken,
              refreshToken: newRefresh ?? vault.refreshToken,
              user: u,
            });
          }
          setLoading(false);
          return;
        }
      } catch {
        // Proceed to encrypted auto-login fallback below
      }
    }

    // Fallback: auto sign-in using 20-day encrypted device credentials if still valid and not manually logged out
    if (vault && !vault.autoLoginPaused && vault.email && vault.password) {
      try {
        const endpoint = portal === 'admin' ? '/auth/admin/login' : '/auth/staff/login';
        const loginRes = await api.post(endpoint, {
          email: vault.email,
          password: vault.password,
          deviceCode: vault.deviceCode || undefined,
        });
        const u = loginRes.data.data.user as AuthUser;
        const newAccess = loginRes.data.data.accessToken as string | undefined;
        const newRefresh = loginRes.data.data.refreshToken as string | undefined;
        setPortalToken(portal, newAccess);
        setUser(u);
        await saveEncryptedCredentials(portal, {
          ...vault,
          accessToken: newAccess,
          refreshToken: newRefresh,
          user: u,
          autoLoginPaused: false,
        });
        localStorage.setItem(
          'efo_device_profile',
          JSON.stringify({ ...u, deviceCode: vault.deviceCode, lastLoginAt: new Date().toISOString() }),
        );
        setLoading(false);
        return;
      } catch (autoErr) {
        const status = (autoErr as { status?: number })?.status;
        if (status === 401 || status === 403) {
          clearSavedCredentials(portal);
        }
      }
    }

    setUser(null);
    localStorage.removeItem('efo_device_profile');
    setLoading(false);
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (
    email: string,
    password: string,
    portal: 'admin' | 'staff',
    deviceCode?: string,
    rememberDevice = true,
  ) => {
    const endpoint = portal === 'admin' ? '/auth/admin/login' : '/auth/staff/login';
    const res = await api.post(endpoint, { email, password, deviceCode });
    const u = res.data.data.user as AuthUser;
    const accessToken = res.data.data.accessToken as string | undefined;
    const refreshToken = res.data.data.refreshToken as string | undefined;

    setPortalToken(portal, accessToken);
    setUser(u);
    localStorage.setItem(
      'efo_device_profile',
      JSON.stringify({ ...u, deviceCode: deviceCode || undefined, lastLoginAt: new Date().toISOString() }),
    );

    if (rememberDevice) {
      await saveEncryptedCredentials(portal, {
        email: email.trim().toLowerCase(),
        password,
        deviceCode: deviceCode?.trim().toUpperCase() || undefined,
        name: u.name,
        accessToken,
        refreshToken,
        user: u,
        autoLoginPaused: false,
      });
    } else {
      clearSavedCredentials(portal);
      setPortalToken(portal, accessToken);
    }

    return u;
  };

  const logout = async () => {
    const portal: PortalType = detectPortalFromPath() ?? (user?.role === 'staff' ? 'staff' : 'admin');
    const vault = await loadEncryptedCredentials(portal);
    try {
      await api.post('/auth/logout', vault?.refreshToken ? { refreshToken: vault.refreshToken } : {});
    } catch {
      // ignore logout transport error
    } finally {
      setPortalToken(portal, null);
      localStorage.removeItem('efo_device_profile');
      if (vault) {
        // Keep encrypted email & password saved for 20 days for convenience, but pause auto-login until explicit sign-in
        await saveEncryptedCredentials(portal, {
          ...vault,
          accessToken: undefined,
          refreshToken: undefined,
          user: undefined,
          autoLoginPaused: true,
        });
      }
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

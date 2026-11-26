import React, { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Activity, DoorOpen, History, LayoutDashboard, LogOut, QrCode, Search, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../../providers/AuthProvider';

export function ScannerLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading...</div>;
  if (!user) return <Navigate to="/staff/login" replace />;

  const navItems = [
    { to: '/staff/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/staff/scanner', label: 'Scan', icon: QrCode },
    { to: '/staff/manual-lookup', label: 'Lookup', icon: Search },
    { to: '/staff/recent-scans', label: 'Recent', icon: History },
    { to: '/staff/gates', label: 'Gates', icon: DoorOpen },
    { to: '/staff/device-status', label: 'Device', icon: Activity },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip bg-slate-950 text-slate-100 pb-24 sm:pb-6">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white">
            <QrCode className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold leading-none">EventFlow Scanner</div>
            <div className="text-[11px] text-slate-400">{user.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              online ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-red-950 text-red-300 border border-red-700'
            }`}
          >
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {!online && (
        <div className="bg-red-600 px-4 py-2 text-center text-xs font-bold text-white">
          OFFLINE MODE: Server validation is unavailable. Do not admit unverified passes across gates.
        </div>
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-5">
        <aside className="hidden w-48 shrink-0 space-y-1 sm:block">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                  active ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 border-t border-slate-800 bg-slate-900 sm:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center py-2 text-[10px] font-medium ${
                active ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertOctagon,
  BarChart3,
  Bell,
  CalendarCog,
  CreditCard,
  DoorOpen,
  FileDown,
  FileText,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  QrCode,
  RotateCcw,
  Settings,
  ShieldCheck,
  Smartphone,
  Tag,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../../providers/AuthProvider';

const NAV_GROUPS = [
  {
    label: 'Command',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/event-control', label: 'Event Day Control', icon: Activity },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Ticketing & Sales',
    items: [
      { to: '/admin/bookings', label: 'Bookings', icon: FileText },
      { to: '/admin/attendees', label: 'Attendees', icon: Users },
      { to: '/admin/tickets', label: 'Tickets', icon: Ticket },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard },
      { to: '/admin/refunds', label: 'Refunds', icon: RotateCcw },
      { to: '/admin/promo-codes', label: 'Promo Codes', icon: Tag },
    ],
  },
  {
    label: 'Venue Operations',
    items: [
      { to: '/admin/checkins', label: 'Check-ins', icon: QrCode },
      { to: '/admin/gates', label: 'Gates', icon: DoorOpen },
      { to: '/admin/staff', label: 'Staff', icon: ShieldCheck },
      { to: '/admin/devices', label: 'Devices', icon: Smartphone },
    ],
  },
  {
    label: 'Configuration & Governance',
    items: [
      { to: '/admin/event-settings', label: 'Event Settings', icon: CalendarCog },
      { to: '/admin/ticket-types', label: 'Ticket Categories', icon: Ticket },
      { to: '/admin/registration-forms', label: 'Registration Forms', icon: FileText },
      { to: '/admin/notifications', label: 'Notifications', icon: Bell },
      { to: '/admin/reports', label: 'Reports & Export', icon: FileDown },
      { to: '/admin/support', label: 'Support Desk', icon: LifeBuoy },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: History },
      { to: '/admin/emergency', label: 'Emergency Controls', icon: AlertOctagon },
      { to: '/admin/system-settings', label: 'System & Recovery', icon: Settings },
    ],
  },
];

export function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading Admin Console...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <div>
          <div className="font-display text-lg font-bold text-stone-900">EventFlow OS</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Admin Control Plane
          </div>
        </div>
        <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                      active
                        ? 'bg-amber-700 text-white shadow-sm'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-stone-200 p-4">
        <div className="text-xs font-semibold text-stone-900 truncate">{user.name}</div>
        <div className="text-[11px] text-stone-500 truncate">{user.email}</div>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex overflow-x-clip bg-stone-50 text-stone-900">
      <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 bg-white">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="shrink-0 rounded-lg border border-stone-200 p-2 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-semibold text-stone-700">
              {NAV_GROUPS.flatMap((g) => g.items).find((i) => i.to === location.pathname)?.label || 'Admin'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs sm:gap-3">
            <Link to="/admin/event-control" className="rounded-xl bg-stone-900 px-3 py-2 font-semibold text-white">
              Live Control
            </Link>
            <Link to="/" target="_blank" className="hidden rounded-xl border border-stone-200 px-3 py-2 font-medium text-stone-700 hover:bg-stone-100 sm:inline-flex">
              View Public Site
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

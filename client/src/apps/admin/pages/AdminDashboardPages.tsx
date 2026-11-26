import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Ticket,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../lib/utils';
import { Button, Card, StatusBadge } from '../../../components/ui/primitives';

export function AdminDashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await api.get('/analytics/dashboard')).data.data,
    refetchInterval: 30_000,
  });

  if (isLoading || !data) return <div className="py-10 text-sm text-stone-500">Loading analytics...</div>;

  const { kpis, categorySales, salesTimeline, gateActivity, recentBookings, recentCheckins, alerts } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900">{data.event.name}</h1>
          <p className="text-xs text-stone-500">{data.event.subtitle} — Live Operational Overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Metrics
        </Button>
      </div>

      {(alerts.failedTicketGenerations > 0 || alerts.failedNotifications > 0 || alerts.openSupportTickets > 0) && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-medium text-amber-950">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" />
          {alerts.failedTicketGenerations > 0 && (
            <Link to="/admin/system-settings" className="underline">
              {alerts.failedTicketGenerations} paid booking(s) need ticket recovery
            </Link>
          )}
          {alerts.failedNotifications > 0 && (
            <Link to="/admin/notifications" className="underline">
              {alerts.failedNotifications} failed notification(s)
            </Link>
          )}
          {alerts.openSupportTickets > 0 && (
            <Link to="/admin/support" className="underline">
              {alerts.openSupportTickets} open support request(s)
            </Link>
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>NET REVENUE</span>
            <CreditCard className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">{formatCurrency(kpis.netRevenue)}</div>
          <div className="mt-1 text-xs text-stone-500">
            Gross: {formatCurrency(kpis.grossRevenue)} • Refunded: {formatCurrency(kpis.totalRefunded)}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>TICKETS SOLD</span>
            <Ticket className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">
            {kpis.totalTicketsSold} <span className="text-sm font-normal text-stone-400">/ {kpis.totalCapacity}</span>
          </div>
          <div className="mt-1 text-xs text-stone-500">
            Available: {kpis.availableTickets} • Held: {kpis.totalReserved}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>CHECK-IN PROGRESS</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">
            {kpis.checkedInCount} <span className="text-sm font-normal text-stone-400">({kpis.attendancePercentage}%)</span>
          </div>
          <div className="mt-1 text-xs text-stone-500">
            Checked Out: {kpis.checkedOutCount ?? 0} • Remaining: {kpis.remainingAttendees}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>CONFIRMED BOOKINGS</span>
            <Users className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">{kpis.paidBookings}</div>
          <div className="mt-1 text-xs text-stone-500">Total attempts: {kpis.totalBookings}</div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0 p-4 sm:p-6">
          <h3 className="text-sm font-bold text-stone-900">Sales Over Time</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#b45309" fill="#fef3c7" name="Revenue (₹)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-w-0 p-4 sm:p-6">
          <h3 className="text-sm font-bold text-stone-900">Ticket Category Sales & Capacity</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="soldQuantity" fill="#b45309" name="Sold" radius={[6, 6, 0, 0]} />
                <Bar dataKey="availableQuantity" fill="#d6d3d1" name="Available" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">Recent Bookings</h3>
            <Link to="/admin/bookings" className="text-xs font-semibold text-amber-700 hover:underline">
              View All
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {recentBookings.map((b: Record<string, unknown>) => (
              <div key={String(b._id)} className="flex items-center justify-between rounded-xl bg-stone-50 px-3.5 py-2.5 text-xs">
                <div>
                  <div className="font-mono font-bold text-stone-900">{String(b.bookingReference)}</div>
                  <div className="text-stone-500">
                    {String((b.primaryContact as Record<string, unknown>)?.fullName)} • {String(b.totalTickets)} ticket(s)
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={String(b.status)} />
                  <div className="mt-1 font-bold">{formatCurrency(Number(b.finalAmount))}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">Gate Activity & Recent Scans</h3>
            <Link to="/admin/checkins" className="text-xs font-semibold text-amber-700 hover:underline">
              Check-in Logs
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {gateActivity.map((g: { gateName: string; count: number }) => (
              <span key={g.gateName} className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                {g.gateName}: {g.count}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {recentCheckins.map((c: Record<string, unknown>) => (
              <div key={String(c._id)} className="flex items-center justify-between rounded-xl bg-stone-50 px-3.5 py-2 text-xs">
                <div>
                  <div className="font-semibold">{String(c.attendeeName || c.ticketId || 'Scan')}</div>
                  <div className="text-stone-500">{String(c.gateName || '')} • {String(c.staffName)}</div>
                </div>
                <StatusBadge status={String(c.result)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function EventDayControlCenterPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['event-day-control'],
    queryFn: async () => (await api.get('/analytics/event-day')).data.data,
    refetchInterval: 10_000,
  });

  const triggerEmergencyToggle = async (action: string) => {
    try {
      await api.post('/system/emergency', { action, confirm: true });
      toast.success(`Executed ${action}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    }
  };

  if (isLoading || !data) return <div className="py-10 text-sm">Loading Event Day Control Center...</div>;

  const { liveCounts, gates, devices, staff, recentScans, alerts, operations } = data;

  return (
    <div className="space-y-6 rounded-3xl bg-slate-950 p-4 text-white sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Live Operations Command
          </span>
          <h1 className="text-2xl font-extrabold">Event Day Control Center</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={operations.salesOpen ? 'danger' : 'primary'}
            onClick={() => triggerEmergencyToggle(operations.salesOpen ? 'PAUSE_SALES' : 'RESUME_SALES')}
          >
            {operations.salesOpen ? 'Pause Sales' : 'Resume Sales'}
          </Button>
          <Button
            size="sm"
            variant={operations.checkinOpen ? 'danger' : 'primary'}
            onClick={() => triggerEmergencyToggle(operations.checkinOpen ? 'PAUSE_CHECKIN' : 'RESUME_CHECKIN')}
          >
            {operations.checkinOpen ? 'Pause Check-ins' : 'Resume Check-ins'}
          </Button>
          <Button
            size="sm"
            variant={operations.checkoutEnabled ? 'outline' : 'danger'}
            onClick={() => triggerEmergencyToggle(operations.checkoutEnabled ? 'DISABLE_CHECKOUT' : 'ENABLE_CHECKOUT')}
            className="border-slate-700 text-slate-100 hover:bg-slate-800"
          >
            {operations.checkoutEnabled ? 'Checkout: ON (Click to Disable)' : 'Checkout: PAUSED (Enable)'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" /> Live Refresh
          </Button>
        </div>
      </div>

      {/* Operational Status Banner */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-3 py-1 font-bold ${operations.salesOpen ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-red-950 text-red-300 border border-red-700'}`}>
          Sales: {operations.salesOpen ? 'OPEN' : 'PAUSED'}
        </span>
        <span className={`rounded-full px-3 py-1 font-bold ${operations.checkoutEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-red-950 text-red-300 border border-red-700'}`}>
          Checkout: {operations.checkoutEnabled ? 'ENABLED' : 'DISABLED'}
        </span>
        <span className={`rounded-full px-3 py-1 font-bold ${operations.checkinOpen ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-red-950 text-red-300 border border-red-700'}`}>
          Gate Check-in / Check-out: {operations.checkinOpen ? 'OPEN' : 'PAUSED'}
        </span>
      </div>

      {/* High-contrast live counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/50 p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase text-emerald-300 sm:text-xs">Inside (Checked In)</div>
          <div className="mt-1 text-3xl font-black sm:text-4xl">{liveCounts.checkedInCount}</div>
        </div>
        <div className="rounded-2xl border border-sky-700/60 bg-sky-950/50 p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase text-sky-300 sm:text-xs">Checked Out</div>
          <div className="mt-1 text-3xl font-black sm:text-4xl">{liveCounts.checkedOutCount ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase text-slate-400 sm:text-xs">Total Eligible</div>
          <div className="mt-1 text-3xl font-black sm:text-4xl">{liveCounts.totalEligible}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase text-slate-400 sm:text-xs">Not Arrived</div>
          <div className="mt-1 text-3xl font-black sm:text-4xl">{liveCounts.remainingAttendees}</div>
        </div>
        <div className="rounded-2xl border border-amber-700/60 bg-amber-950/40 p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase text-amber-300 sm:text-xs">Attendance %</div>
          <div className="mt-1 text-3xl font-black sm:text-4xl">{liveCounts.checkinPercentage}%</div>
        </div>
      </div>

      {/* Gates & Devices */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Gate Activity</h2>
          <div className="mt-3 space-y-2.5">
            {gates.map((g: Record<string, unknown>) => (
              <div key={String(g._id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950 p-3.5">
                <div>
                  <div className="font-bold">{String(g.name)}</div>
                  <div className="text-xs text-slate-400">{String(g.code)}</div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-bold">
                  <span className="text-emerald-400">In: {Number(g.validScans)}</span>
                  <span className="text-sky-400">Out: {Number(g.checkoutScans ?? 0)}</span>
                  <span className="text-red-400">Rejected: {Number(g.rejectedScans)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Scanner Devices ({devices.length}) & Staff ({staff.length})
          </h2>
          <div className="mt-3 space-y-2">
            {devices.map((d: Record<string, unknown>) => (
              <div key={String(d._id)} className="flex items-center justify-between rounded-xl bg-slate-950 p-3 text-xs">
                <div>
                  <div className="font-mono font-bold">{String(d.deviceCode)} — {String(d.name)}</div>
                  <div className="text-slate-400">
                    Last heartbeat: {d.lastHeartbeatAt ? new Date(String(d.lastHeartbeatAt)).toLocaleTimeString('en-IN') : 'Never'}
                  </div>
                </div>
                <StatusBadge status={String(d.status)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts & Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-red-900/60 bg-slate-900 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-400">
            Duplicate & Invalid Scan Alerts
          </h2>
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
            {[...alerts.duplicateScans, ...alerts.invalidAttempts].slice(0, 12).map((a: Record<string, unknown>) => (
              <div key={String(a._id)} className="flex items-center justify-between rounded-xl bg-slate-950 p-3 text-xs">
                <div>
                  <div className="font-bold text-red-300">{String(a.result)}</div>
                  <div className="text-slate-400">{String(a.message)}</div>
                </div>
                <span className="text-slate-500">{new Date(String(a.createdAt)).toLocaleTimeString('en-IN')}</span>
              </div>
            ))}
            {alerts.duplicateScans.length === 0 && alerts.invalidAttempts.length === 0 && (
              <p className="text-xs text-slate-500">No duplicate or invalid attempts logged.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Live Scan Stream</h2>
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
            {recentScans.map((s: Record<string, unknown>) => (
              <div key={String(s._id)} className="flex items-center justify-between rounded-xl bg-slate-950 p-3 text-xs">
                <div>
                  <div className="font-bold">{String(s.attendeeName || s.ticketId || 'Scan')}</div>
                  <div className="text-slate-400">{String(s.gateName || '')} • {String(s.staffName)}</div>
                </div>
                <StatusBadge status={String(s.result)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

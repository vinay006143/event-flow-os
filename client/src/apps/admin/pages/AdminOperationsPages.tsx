import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, RefreshCw, RotateCcw, Search, Send, ShieldBan } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../lib/utils';
import { Button, Card, Input, Select, StatusBadge } from '../../../components/ui/primitives';

export function AdminBookingsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['admin-bookings', search, status],
    queryFn: async () =>
      (await api.get(`/bookings?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`)).data,
  });

  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ['admin-booking-detail', selectedId],
    enabled: !!selectedId,
    queryFn: async () => (await api.get(`/bookings/${selectedId}`)).data.data,
  });

  const resendNotifications = async (bookingId: string) => {
    try {
      await api.post(`/notifications/resend-booking/${bookingId}`);
      toast.success('Ticket delivery notifications resent');
      refetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resend failed');
    }
  };

  const recoverTickets = async (bookingId: string) => {
    try {
      await api.post(`/tickets/recover/${bookingId}`);
      toast.success('Tickets recovered/issued');
      refetchDetail();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Recovery failed');
    }
  };

  const issueFullRefund = async (bookingId: string) => {
    const reason = window.prompt('Enter refund reason:');
    if (!reason) return;
    try {
      await api.post('/refunds', { bookingId, reason });
      toast.success('Refund processed');
      refetchDetail();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refund failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
          <Input
            placeholder="Search reference, name, mobile, email, ticket ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select className="w-full sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUNDED">REFUNDED</option>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="self-start sm:self-auto">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Primary Contact</th>
              <th className="px-4 py-3">Tickets</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ticket Gen</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(data?.data || []).map((b: Record<string, unknown>) => (
              <tr key={String(b._id)} className="hover:bg-stone-50">
                <td className="px-4 py-3 font-mono text-xs font-bold">{String(b.bookingReference)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{String((b.primaryContact as Record<string, unknown>)?.fullName)}</div>
                  <div className="text-xs text-stone-500">{String((b.primaryContact as Record<string, unknown>)?.mobile)}</div>
                </td>
                <td className="px-4 py-3">{String(b.totalTickets)}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(Number(b.finalAmount))}</td>
                <td className="px-4 py-3"><StatusBadge status={String(b.status)} /></td>
                <td className="px-4 py-3"><StatusBadge status={String(b.ticketGenerationStatus)} /></td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(String(b._id))}>
                    <Eye className="h-3.5 w-3.5" /> Inspect
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {detail && (
        <Card className="p-6 space-y-4 border-amber-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-mono">{detail.booking.bookingReference}</h2>
              <p className="text-xs text-stone-500">
                {detail.booking.primaryContact.fullName} • {detail.booking.primaryContact.mobile} • {detail.booking.primaryContact.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.booking.status === 'PAID' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => resendNotifications(detail.booking._id)}>
                    <Send className="h-3.5 w-3.5" /> Resend Passes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => recoverTickets(detail.booking._id)}>
                    <RefreshCw className="h-3.5 w-3.5" /> Recover/Verify Tickets
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => issueFullRefund(detail.booking._id)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Issue Refund
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold uppercase text-stone-500">Individual Tickets ({detail.tickets.length})</h3>
              <div className="mt-2 space-y-2">
                {detail.tickets.map((t: Record<string, unknown>) => (
                  <div key={String(t._id)} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-xs">
                    <div>
                      <div className="font-mono font-bold">{String(t.ticketId)}</div>
                      <div>{String(t.attendeeName)} • {String(t.ticketTypeName)}</div>
                    </div>
                    <StatusBadge status={String(t.status)} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase text-stone-500">Notification Logs</h3>
              <div className="mt-2 space-y-2">
                {detail.notifications.map((n: Record<string, unknown>) => (
                  <div key={String(n._id)} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-xs">
                    <div>
                      <div className="font-bold">{String(n.channel)} • {String(n.recipient)}</div>
                      <div className="text-stone-500">{String(n.messagePreview)}</div>
                    </div>
                    <StatusBadge status={String(n.status)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function AdminAttendeesPage() {
  const [search, setSearch] = useState('');
  const { data, refetch } = useQuery({
    queryKey: ['admin-attendees', search],
    queryFn: async () => (await api.get(`/attendees?search=${encodeURIComponent(search)}`)).data,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', mobile: '', age: '', email: '' });

  const reissue = async (ticketDocId: string) => {
    const reason = window.prompt('Reason for ticket reissue:');
    if (!reason) return;
    try {
      await api.post(`/tickets/${ticketDocId}/reissue`, { reason });
      toast.success('Ticket reissued');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reissue failed');
    }
  };

  const startEdit = (a: Record<string, unknown>) => {
    setEditingId(String(a._id));
    setEditForm({
      fullName: String(a.fullName || ''),
      mobile: String(a.mobile || ''),
      age: a.age ? String(a.age) : '',
      email: String(a.email || ''),
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await api.patch(`/attendees/${id}`, {
        fullName: editForm.fullName,
        mobile: editForm.mobile,
        age: editForm.age ? Number(editForm.age) : undefined,
        email: editForm.email || undefined,
      });
      toast.success('Attendee updated');
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 max-w-md">
        <Input placeholder="Search attendee name, mobile, booking..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="outline" onClick={() => refetch()}><Search className="h-4 w-4" /></Button>
      </div>

      {editingId && (
        <Card className="border-amber-300 bg-amber-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Edit Attendee Details</h3>
            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input required placeholder="Full Name" value={editForm.fullName} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} />
            <Input required placeholder="Mobile" value={editForm.mobile} onChange={(e) => setEditForm((f) => ({ ...f, mobile: e.target.value }))} />
            <Input type="number" min="1" max="120" placeholder="Age" value={editForm.age} onChange={(e) => setEditForm((f) => ({ ...f, age: e.target.value }))} />
            <Input type="email" placeholder="Email (optional)" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <Button size="sm" onClick={() => saveEdit(editingId)}>Save Attendee</Button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Attendee</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Booking Ref</th>
              <th className="px-4 py-3">Ticket ID</th>
              <th className="px-4 py-3">Ticket Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(data?.data || []).map((a: Record<string, unknown>) => {
              const ticket = a.ticket as Record<string, unknown> | null;
              return (
                <tr key={String(a._id)}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{String(a.fullName)}</div>
                    <div className="text-xs text-stone-500">{String(a.mobile)}</div>
                  </td>
                  <td className="px-4 py-3">{String(a.ticketTypeName)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{String(a.bookingReference)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{ticket ? String(ticket.ticketId) : '—'}</td>
                  <td className="px-4 py-3">{ticket ? <StatusBadge status={String(ticket.status)} /> : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => startEdit(a)}>
                        Edit
                      </Button>
                      {(ticket && (ticket.status === 'ISSUED' || ticket.status === 'CHECKED_OUT')) && (
                        <Button size="sm" variant="outline" onClick={() => reissue(String(ticket._id))}>
                          Reissue Pass
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminTicketsPage() {
  const [search, setSearch] = useState('');
  const { data, refetch } = useQuery({
    queryKey: ['admin-tickets', search],
    queryFn: async () => (await api.get(`/tickets?search=${encodeURIComponent(search)}`)).data,
  });

  const revoke = async (id: string) => {
    const reason = window.prompt('Revocation reason:');
    if (!reason) return;
    try {
      await api.post(`/tickets/${id}/revoke`, { reason });
      toast.success('Ticket revoked');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Revoke failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 max-w-md">
        <Input placeholder="Search ticket ID, booking ref, attendee..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Ticket ID</th>
              <th className="px-4 py-3">Attendee</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(data?.data || []).map((t: Record<string, unknown>) => (
              <tr key={String(t._id)}>
                <td className="px-4 py-3 font-mono text-xs font-bold">{String(t.ticketId)}</td>
                <td className="px-4 py-3">{String(t.attendeeName)}</td>
                <td className="px-4 py-3">{String(t.ticketTypeName)}</td>
                <td className="px-4 py-3 font-mono text-xs">{String(t.bookingReference)}</td>
                <td className="px-4 py-3"><StatusBadge status={String(t.status)} /></td>
                <td className="px-4 py-3 flex gap-2">
                  {(t.status === 'ISSUED' || t.status === 'CHECKED_OUT') && (
                    <Button size="sm" variant="danger" onClick={() => revoke(String(t._id))}>
                      <ShieldBan className="h-3.5 w-3.5" /> Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminPaymentsPage() {
  const { data } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => (await api.get('/payments')).data,
  });

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Merchant Txn</th>
            <th className="px-4 py-3">Booking</th>
            <th className="px-4 py-3">Provider</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Refunded</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {(data?.data || []).map((p: Record<string, unknown>) => (
            <tr key={String(p._id)}>
              <td className="px-4 py-3 font-mono text-xs font-bold">{String(p.merchantTransactionId)}</td>
              <td className="px-4 py-3 font-mono text-xs">{String(p.bookingReference)}</td>
              <td className="px-4 py-3">{String(p.provider)}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(Number(p.amount))}</td>
              <td className="px-4 py-3">{formatCurrency(Number(p.refundedAmount || 0))}</td>
              <td className="px-4 py-3"><StatusBadge status={String(p.status)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function AdminRefundsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: async () => (await api.get('/refunds')).data,
  });
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/refunds', {
        bookingId: bookingId.trim(),
        ...(amount ? { amount: Number(amount) } : {}),
        reason,
      });
      toast.success('Refund processed');
      setBookingId('');
      setAmount('');
      setReason('');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refund failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Process Refund</h2>
        <form onSubmit={submitRefund} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input required placeholder="Booking Ref (BK-NOD-...) or ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
          <Input type="number" placeholder="Amount ₹ (blank = full)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input required placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button type="submit" className="min-h-[42px]">Issue Refund</Button>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Refund Ref</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(data?.data || []).map((r: Record<string, unknown>) => (
              <tr key={String(r._id)}>
                <td className="px-4 py-3 font-mono text-xs font-bold">{String(r.refundReference)}</td>
                <td className="px-4 py-3 font-mono text-xs">{String(r.bookingReference)}</td>
                <td className="px-4 py-3">{String(r.refundType)}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(Number(r.amount))}</td>
                <td className="px-4 py-3 text-xs">{String(r.reason)}</td>
                <td className="px-4 py-3"><StatusBadge status={String(r.status)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminCheckinsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-checkins'],
    queryFn: async () => (await api.get('/checkins/recent?limit=50')).data,
  });

  const reverse = async (ticketDocId: string) => {
    const reason = window.prompt('Reason for reversing check-in:');
    if (!reason) return;
    try {
      await api.post(`/checkins/${ticketDocId}/reverse`, { reason });
      toast.success('Check-in reversed');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reversal failed');
    }
  };

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Ticket ID</th>
            <th className="px-4 py-3">Attendee</th>
            <th className="px-4 py-3">Gate</th>
            <th className="px-4 py-3">Staff</th>
            <th className="px-4 py-3">Result</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {(data?.data || []).map((c: Record<string, unknown>) => (
            <tr key={String(c._id)}>
              <td className="px-4 py-3 text-xs text-stone-500">{new Date(String(c.createdAt)).toLocaleString('en-IN')}</td>
              <td className="px-4 py-3 font-mono text-xs">{String(c.ticketId || '—')}</td>
              <td className="px-4 py-3">{String(c.attendeeName || '—')}</td>
              <td className="px-4 py-3">{String(c.gateName || '—')}</td>
              <td className="px-4 py-3">{String(c.staffName)}</td>
              <td className="px-4 py-3"><StatusBadge status={String(c.result)} /></td>
              <td className="px-4 py-3">
                {c.result === 'VALID' && Boolean(c.ticketDocId) && (
                  <Button size="sm" variant="outline" onClick={() => reverse(String(c.ticketDocId))}>
                    Reverse
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

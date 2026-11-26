import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, Tag, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../lib/utils';
import { Button, Card, Input } from '../../../components/ui/primitives';
import { usePublicEvent } from '../layouts/PublicLayout';
import { BookingStepper } from '../components/BookingStepper';

export function TicketsPage() {
  const navigate = useNavigate();
  const { data: event } = usePublicEvent();
  const { data: ticketTypes, isLoading } = useQuery({
    queryKey: ['public-ticket-types'],
    queryFn: async () => (await api.get('/ticket-types/public')).data.data,
  });

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number; description?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedItems = (ticketTypes || [])
    .filter((tt: Record<string, unknown>) => (quantities[String(tt.id)] || 0) > 0)
    .map((tt: Record<string, unknown>) => ({
      ticketTypeId: String(tt.id),
      name: String(tt.name),
      price: Number(tt.price),
      quantity: quantities[String(tt.id)] || 0,
    }));

  const totalCount = selectedItems.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);
  const subtotal = selectedItems.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0);
  const discount = appliedPromo?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const handleQty = (id: string, delta: number, maxAllowed: number) => {
    setAppliedPromo(null);
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(maxAllowed, (prev[id] || 0) + delta));
      return { ...prev, [id]: next };
    });
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || selectedItems.length === 0) return;
    try {
      const res = await api.post('/promo-codes/validate', {
        code: promoInput.trim(),
        items: selectedItems.map((i: { ticketTypeId: string; quantity: number }) => ({
          ticketTypeId: i.ticketTypeId,
          quantity: i.quantity,
        })),
      });
      setAppliedPromo(res.data.data);
      toast.success(`Promo ${res.data.data.code} applied!`);
    } catch (err) {
      setAppliedPromo(null);
      toast.error(err instanceof Error ? err.message : 'Invalid promo code');
    }
  };

  const handleReserveAndContinue = async () => {
    if (selectedItems.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post('/reservations', {
        items: selectedItems.map((i: { ticketTypeId: string; quantity: number }) => ({
          ticketTypeId: i.ticketTypeId,
          quantity: i.quantity,
        })),
        ...(appliedPromo ? { promoCode: appliedPromo.code } : {}),
      });
      sessionStorage.setItem('efo_active_reservation', JSON.stringify(res.data.data));
      navigate('/register');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reserve tickets');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-12">Loading passes...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <BookingStepper currentStep={1} />
      <div className="mb-8">
        <span className="font-sacred text-xs font-bold uppercase tracking-widest text-amber-800">Step 1 of 3</span>
        <h1 className="font-display mt-1 text-3xl font-bold text-stone-900 sm:text-4xl">Select Event Passes</h1>
        <p className="mt-1 text-sm text-stone-600">
          Every ticket generates an individual QR code pass for one attendee.
        </p>
      </div>

      {event && !event.operations.salesOpen && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          Ticket sales are currently paused by the event administrator.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {(ticketTypes || []).map((tt: Record<string, unknown>) => {
            const id = String(tt.id);
            const qty = quantities[id] || 0;
            const available = Number(tt.availableQuantity);
            const maxAllowed = Math.min(available, Number(tt.maxPerBooking || 10));
            const onSale = Boolean(tt.onSale) && available > 0 && event?.operations?.salesOpen !== false;

            return (
              <Card key={id} className="p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-stone-900">{String(tt.name)}</h2>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                        {formatCurrency(Number(tt.price))}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600">{String(tt.description)}</p>
                    <p className="text-xs font-medium text-stone-500">
                      {available > 0 ? `${available} remaining` : 'Sold out'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={qty <= 0}
                      onClick={() => handleQty(id, -1, maxAllowed)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-base font-bold">{qty}</span>
                    <button
                      type="button"
                      disabled={!onSale || qty >= maxAllowed}
                      onClick={() => handleQty(id, 1, maxAllowed)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div>
          <Card className="sticky top-24 border-amber-400/30 bg-[#060f2b] p-6 text-white shadow-xl">
            <h3 className="font-display text-xl font-bold text-white">Booking Summary</h3>
            {selectedItems.length === 0 ? (
              <p className="mt-4 text-sm text-slate-300">Tap + on any pass category to begin.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedItems.map((item: { ticketTypeId: string; name: string; price: number; quantity: number }) => (
                  <div key={item.ticketTypeId} className="flex justify-between text-sm">
                    <span className="text-slate-200">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-semibold text-amber-300">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}

                <div className="border-t border-white/10 pt-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Promo Code
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      placeholder="e.g. SANATANAM10"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      className="border-white/20 bg-white/10 text-white placeholder:text-slate-400"
                    />
                    <Button type="button" variant="outline" onClick={handleApplyPromo} className="border-amber-400/40 bg-transparent text-amber-200 hover:bg-white/10">
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  {appliedPromo && (
                    <p className="mt-1.5 text-xs font-medium text-emerald-300">
                      Applied {appliedPromo.code}: -{formatCurrency(appliedPromo.discountAmount)}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 border-t border-white/10 pt-3 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal ({totalCount} pass{totalCount > 1 ? 'es' : ''})</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Discount</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 text-lg font-extrabold text-amber-300">
                    <span>Total Payable</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting || totalCount === 0}
                  onClick={handleReserveAndContinue}
                  className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 text-sm font-extrabold text-slate-950 shadow-lg hover:brightness-105 disabled:opacity-50"
                >
                  {submitting ? 'Reserving Inventory...' : 'Continue to Registration'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

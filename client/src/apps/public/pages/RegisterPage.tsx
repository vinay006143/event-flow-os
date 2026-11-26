import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Clock, Copy, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../lib/utils';
import { Button, Card, Input, Select } from '../../../components/ui/primitives';
import { BookingStepper } from '../components/BookingStepper';

interface ReservationItem {
  ticketTypeId: string;
  ticketTypeName: string;
  ticketTypeCode: string;
  quantity: number;
  unitPrice: number;
}

interface ReservationData {
  _id: string;
  reservationCode: string;
  items: ReservationItem[];
  totalQuantity: number;
  subtotalAmount: number;
  discountAmount: number;
  finalAmount: number;
  promoCode?: string;
  expiresAt: string;
}

interface AttendeeSlot {
  ticketTypeId: string;
  ticketTypeName: string;
  fullName: string;
  age: string;
  mobile: string;
  email: string;
  customFields: Record<string, string | boolean>;
}

function normalizeMobileInput(raw: string): string {
  return raw.trim().replace(/[\s()-]/g, '').replace(/^0+(?=\d{10}$)/, '');
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<ReservationData | null>(() => {
    try {
      const raw = sessionStorage.getItem('efo_active_reservation');
      return raw ? (JSON.parse(raw) as ReservationData) : null;
    } catch {
      return null;
    }
  });
  const [reservationExpired, setReservationExpired] = useState(false);
  const [reholding, setReholding] = useState(false);

  const { data: regConfig } = useQuery({
    queryKey: ['registration-fields'],
    queryFn: async () => (await api.get('/registration/fields')).data.data,
  });

  // Verify held reservation is still active on server (handles restarts / 15-min TTL expiry cleanly)
  useEffect(() => {
    if (!reservation?._id) return;
    let cancelled = false;
    api
      .get(`/reservations/${reservation._id}`)
      .then((res) => {
        if (cancelled) return;
        const fresh = res.data.data as ReservationData & { status?: string };
        if (fresh.status !== 'ACTIVE' || new Date(fresh.expiresAt).getTime() <= Date.now()) {
          setReservationExpired(true);
          sessionStorage.removeItem('efo_active_reservation');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReservationExpired(true);
          sessionStorage.removeItem('efo_active_reservation');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reservation?._id]);

  const handleReholdReservation = async () => {
    if (!reservation?.items?.length) {
      navigate('/tickets');
      return;
    }
    setReholding(true);
    try {
      const res = await api.post('/reservations', {
        items: reservation.items.map((i) => ({
          ticketTypeId: i.ticketTypeId,
          quantity: i.quantity,
        })),
        ...(reservation.promoCode ? { promoCode: reservation.promoCode } : {}),
      });
      const fresh = res.data.data as ReservationData;
      sessionStorage.setItem('efo_active_reservation', JSON.stringify(fresh));
      setReservation(fresh);
      setReservationExpired(false);
      toast.success('Seats re-held! Complete registration below.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to re-hold seats');
      navigate('/tickets');
    } finally {
      setReholding(false);
    }
  };

  const initialSlots = useMemo<AttendeeSlot[]>(() => {
    if (!reservation) return [];
    const list: AttendeeSlot[] = [];
    for (const item of reservation.items) {
      for (let i = 0; i < item.quantity; i++) {
        list.push({
          ticketTypeId: item.ticketTypeId,
          ticketTypeName: item.ticketTypeName,
          fullName: '',
          age: '',
          mobile: '',
          email: '',
          customFields: {},
        });
      }
    }
    return list;
  }, [reservation]);

  const [primaryContact, setPrimaryContact] = useState({
    fullName: '',
    mobile: '',
    email: '',
  });
  const [attendees, setAttendees] = useState<AttendeeSlot[]>(initialSlots);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialSlots.length > 0 && attendees.length === 0) {
      setAttendees(initialSlots);
    }
  }, [initialSlots, attendees.length]);

  const updateAttendee = (idx: number, patch: Partial<AttendeeSlot>) => {
    setAttendees((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const copyPrimaryToFirst = () => {
    if (attendees.length === 0) return;
    updateAttendee(0, {
      fullName: primaryContact.fullName,
      mobile: primaryContact.mobile,
      email: primaryContact.email,
    });
    toast.success('Copied primary contact to Attendee #1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation) return;
    if (!acceptedTerms) {
      toast.error('Please accept the Terms & Policies to continue');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reservationId: reservation._id,
        primaryContact: {
          fullName: primaryContact.fullName.trim(),
          mobile: normalizeMobileInput(primaryContact.mobile),
          email: primaryContact.email.trim(),
        },
        attendees: attendees.map((a) => ({
          ticketTypeId: a.ticketTypeId,
          fullName: a.fullName.trim(),
          age: a.age ? Number(a.age) : undefined,
          mobile: normalizeMobileInput(a.mobile),
          email: a.email.trim(),
          customFields: a.customFields,
        })),
        ...(reservation.promoCode ? { promoCode: reservation.promoCode } : {}),
        whatsappOptIn,
        acceptedTerms: true as const,
      };

      const res = await api.post('/bookings', payload);
      sessionStorage.setItem('efo_active_booking', JSON.stringify(res.data.data));
      navigate('/checkout');
    } catch (err) {
      const apiErr = err as Error & { status?: number; code?: string };
      if (apiErr.status === 404 || /expired|no longer active|not found/i.test(apiErr.message)) {
        sessionStorage.removeItem('efo_active_reservation');
        setReservationExpired(true);
      }
      toast.error(apiErr.message || 'Please check attendee details');
    } finally {
      setSubmitting(false);
    }
  };

  if (!reservation || reservationExpired) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Card className="p-8">
          <h2 className="text-xl font-bold text-stone-900">
            {reservationExpired ? 'Ticket Hold Expired or Reset' : 'No Active Ticket Reservation'}
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            {reservationExpired
              ? 'Your previous seat hold expired or the server restarted. Re-hold your selected passes or choose new tickets.'
              : 'Select your ticket categories first to hold inventory and fill attendee registration.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {reservationExpired && reservation?.items?.length ? (
              <Button type="button" onClick={handleReholdReservation} disabled={reholding}>
                {reholding ? 'Re-holding Passes...' : 'Re-hold Same Passes'}
              </Button>
            ) : null}
            <Link
              to="/tickets"
              onClick={() => sessionStorage.removeItem('efo_active_reservation')}
              className="inline-block rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Go to Ticket Selection
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const fields = (regConfig?.fields || []) as Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    options?: string[];
    min?: number;
    max?: number;
    categoryRestrictions?: string[];
  }>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <BookingStepper currentStep={2} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-sacred text-xs font-bold uppercase tracking-widest text-amber-800">Step 2 of 3</span>
          <h1 className="font-display mt-1 text-3xl font-bold text-stone-900 sm:text-4xl">Attendee Registration</h1>
          <p className="text-sm text-stone-600">
            Each of your {reservation.totalQuantity} ticket(s) receives an individual QR pass.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
          <Clock className="h-4 w-4" />
          Held until {new Date(reservation.expiresAt).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Primary Booking Contact</h2>
              <p className="text-xs text-stone-500">Receives payment confirmation, WhatsApp & Email passes, and OTP retrieval access.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={copyPrimaryToFirst}>
              <Copy className="h-3.5 w-3.5" /> Copy to Attendee #1
            </Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Full Name *</label>
              <Input
                required
                placeholder="Booking holder name"
                value={primaryContact.fullName}
                onChange={(e) => setPrimaryContact((p) => ({ ...p, fullName: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">WhatsApp Mobile *</label>
              <Input
                required
                placeholder="10-digit mobile"
                value={primaryContact.mobile}
                onChange={(e) => setPrimaryContact((p) => ({ ...p, mobile: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Email Address *</label>
              <Input
                required
                type="email"
                placeholder="you@example.com"
                value={primaryContact.email}
                onChange={(e) => setPrimaryContact((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        {attendees.map((att, idx) => (
          <Card key={idx} className="p-6">
            <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  Attendee #{idx + 1} — <span className="text-amber-800">{att.ticketTypeName}</span>
                </h3>
              </div>
              <span className="text-xs font-medium text-stone-500">Individual QR Pass #{idx + 1}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {fields
                .filter(
                  (f) =>
                    !f.categoryRestrictions?.length ||
                    f.categoryRestrictions.includes(att.ticketTypeId),
                )
                .map((field) => {
                  const isBuiltIn = ['fullName', 'age', 'mobile', 'email'].includes(field.key);
                  const val = isBuiltIn
                    ? (att[field.key as 'fullName' | 'age' | 'mobile' | 'email'] ?? '')
                    : String(att.customFields[field.key] ?? '');

                  const setVal = (nextVal: string) => {
                    if (isBuiltIn) {
                      updateAttendee(idx, { [field.key]: nextVal });
                    } else {
                      updateAttendee(idx, {
                        customFields: { ...att.customFields, [field.key]: nextVal },
                      });
                    }
                  };

                  return (
                    <div key={field.key}>
                      <label className="mb-1 block text-xs font-medium text-stone-700">
                        {field.label} {field.required && '*'}
                      </label>
                      {field.type === 'select' ? (
                        <Select
                          required={field.required}
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        >
                          <option value="">Select...</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </Select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          required={field.required}
                          rows={2}
                          placeholder={field.placeholder}
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                          className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
                        />
                      ) : field.type === 'checkbox' ? (
                        <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
                          <input
                            type="checkbox"
                            required={field.required}
                            checked={Boolean(att.customFields[field.key])}
                            onChange={(e) =>
                              updateAttendee(idx, {
                                customFields: { ...att.customFields, [field.key]: e.target.checked },
                              })
                            }
                            className="h-4 w-4 rounded border-stone-300 text-amber-700"
                          />
                          <span>{field.placeholder || field.label}</span>
                        </label>
                      ) : (
                        <Input
                          required={field.required}
                          type={
                            field.type === 'number'
                              ? 'number'
                              : field.type === 'email'
                                ? 'email'
                                : field.type === 'phone'
                                  ? 'tel'
                                  : 'text'
                          }
                          min={field.min}
                          max={field.max}
                          placeholder={field.placeholder}
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </Card>
        ))}

        <Card className="p-6 space-y-3">
          <label className="flex items-start gap-2.5 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-300 text-amber-700"
            />
            <span>Send my individual QR passes & event reminders via WhatsApp.</span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-300 text-amber-700"
            />
            <span>
              I accept the{' '}
              <Link to="/terms" target="_blank" className="font-semibold text-amber-800 underline">
                Terms & Conditions
              </Link>{' '}
              and{' '}
              <Link to="/refund-policy" target="_blank" className="font-semibold text-amber-800 underline">
                Refund Policy
              </Link>
              .
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/tickets')}>
              <ArrowLeft className="h-4 w-4" /> Back to Passes
            </Button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-stone-500">Total Payable</div>
                <div className="text-xl font-bold text-stone-900">{formatCurrency(reservation.finalAmount)}</div>
              </div>
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? 'Creating Booking...' : 'Review & Checkout'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

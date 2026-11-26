import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../lib/utils';
import { Button, Card, StatusBadge } from '../../../components/ui/primitives';
import { BookingStepper } from '../components/BookingStepper';
import { CongratulationsPopup } from '../components/CongratulationsPopup';
import { TicketIdCard, type PassTicketData } from '../components/TicketIdCard';
import { usePublicEvent } from '../layouts/PublicLayout';

export function CheckoutPage() {
  const navigate = useNavigate();
  const [staleBooking, setStaleBooking] = useState(false);
  const raw = sessionStorage.getItem('efo_active_booking');
  const bookingBundle = (() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const [initiating, setInitiating] = useState(false);

  if (!bookingBundle?.booking || staleBooking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Card className="p-8">
          <h2 className="text-xl font-bold">
            {staleBooking ? 'Booking Session Expired' : 'No Pending Booking'}
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            {staleBooking
              ? 'This booking session expired or was reset. Please select your passes again.'
              : 'Start by selecting your passes.'}
          </p>
          <Link
            to="/tickets"
            onClick={() => {
              sessionStorage.removeItem('efo_active_booking');
              sessionStorage.removeItem('efo_active_reservation');
            }}
            className="mt-4 inline-block rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Select Passes
          </Link>
        </Card>
      </div>
    );
  }

  const { booking, attendees } = bookingBundle;

  const handlePayNow = async () => {
    setInitiating(true);
    try {
      const res = await api.post('/payments/initiate', { bookingId: booking._id });
      const payment = res.data.data;
      sessionStorage.setItem('efo_last_txn', payment.merchantTransactionId);

      if (payment.status === 'COMPLETED') {
        navigate(`/payment/success?txn=${payment.merchantTransactionId}&booking=${booking.bookingReference}`);
        return;
      }

      if (payment.provider === 'PHONEPE_DEV') {
        navigate(`/payment?txn=${payment.merchantTransactionId}&booking=${booking.bookingReference}`);
      } else if (payment.redirectUrl) {
        window.location.href = payment.redirectUrl;
      }
    } catch (err) {
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 404) {
        sessionStorage.removeItem('efo_active_booking');
        setStaleBooking(true);
      }
      toast.error(apiErr.message || 'Payment initiation failed');
    } finally {
      setInitiating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <BookingStepper currentStep={3} />
      <span className="font-sacred text-xs font-bold uppercase tracking-widest text-amber-800">Step 3 of 3</span>
      <h1 className="font-display mt-1 text-3xl font-bold text-stone-900 sm:text-4xl">Checkout &amp; Payment</h1>
      <p className="text-sm text-stone-600">
        Booking Reference: <span className="font-mono font-bold text-stone-900">{booking.bookingReference}</span>
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <Card className="p-6">
            <h2 className="text-base font-bold text-stone-900">Attendees ({attendees.length})</h2>
            <div className="mt-3 divide-y divide-stone-100">
              {attendees.map((a: Record<string, unknown>, i: number) => (
                <div key={String(a._id)} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-semibold text-stone-900">
                      #{i + 1} {String(a.fullName)}
                    </div>
                    <div className="text-xs text-stone-500">
                      {String(a.mobile)} • {String(a.ticketTypeName)}
                    </div>
                  </div>
                  <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                    1 Individual QR Pass
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <h2 className="text-base font-bold text-stone-900">Order Total</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{formatCurrency(booking.subtotalAmount)}</span>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promo ({booking.promoCode})</span>
                  <span>-{formatCurrency(booking.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-stone-200 pt-2 text-lg font-bold text-stone-900">
                <span>Payable</span>
                <span>{formatCurrency(booking.finalAmount)}</span>
              </div>
            </div>

            <Button className="mt-6 w-full" size="lg" disabled={initiating} onClick={handlePayNow}>
              <CreditCard className="h-4 w-4" />
              {initiating ? 'Connecting to Payment...' : 'Pay with PhonePe'}
            </Button>
            <p className="mt-3 text-center text-[11px] text-stone-500">
              Tickets are issued only after server-side payment verification.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PaymentPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const txn = params.get('txn') || sessionStorage.getItem('efo_last_txn') || '';
  const bookingRef = params.get('booking') || '';
  const [statusData, setStatusData] = useState<Record<string, unknown> | null>(null);
  const [notFound, setNotFound] = useState(!txn);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!txn) {
      setNotFound(true);
      return;
    }
    api
      .get(`/payments/status/${txn}`)
      .then((res) => {
        setStatusData(res.data.data);
        setNotFound(false);
      })
      .catch((err: Error & { status?: number }) => {
        if (err.status === 404) {
          sessionStorage.removeItem('efo_last_txn');
          setNotFound(true);
        }
      });
  }, [txn]);

  const simulateOutcome = async (outcome: 'COMPLETED' | 'FAILED' | 'PENDING') => {
    setProcessing(true);
    try {
      await api.post(`/payments/dev-simulate/${txn}`, {
        outcome,
        ...(outcome === 'FAILED' ? { failureReason: 'Simulated user cancellation / bank decline' } : {}),
      });
      if (outcome === 'COMPLETED') {
        navigate(`/payment/success?txn=${txn}&booking=${bookingRef}`);
      } else if (outcome === 'FAILED') {
        navigate(`/payment/failure?txn=${txn}&booking=${bookingRef}`);
      } else {
        navigate(`/payment/pending?txn=${txn}&booking=${bookingRef}`);
      }
    } catch (err) {
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 404) {
        sessionStorage.removeItem('efo_last_txn');
        setNotFound(true);
      }
      toast.error(apiErr.message || 'Simulation failed');
    } finally {
      setProcessing(false);
    }
  };

  const payment = statusData?.payment as Record<string, unknown> | undefined;

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14 text-center">
        <Card className="p-8">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="font-display mt-3 text-2xl font-bold text-stone-900">Payment Session Not Found</h1>
          <p className="mt-2 text-sm text-stone-600">
            This payment session expired or the development server was restarted. Start a fresh booking to continue.
          </p>
          <Link
            to="/tickets"
            onClick={() => {
              sessionStorage.removeItem('efo_last_txn');
              sessionStorage.removeItem('efo_active_booking');
              sessionStorage.removeItem('efo_active_reservation');
            }}
            className="mt-5 inline-block rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Select Passes Again
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <Card className="p-8">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            Development Payment Adapter (PhonePe Sandbox Flow)
          </span>
          {payment && <StatusBadge status={String(payment.status)} />}
        </div>
        <h1 className="font-display mt-4 text-2xl font-bold text-stone-900">Complete Payment</h1>
        <p className="mt-1 text-sm text-stone-600">
          Transaction: <span className="font-mono font-semibold">{txn}</span>
        </p>
        {payment && (
          <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-600">Booking Reference</span>
              <span className="font-mono font-bold">{String(payment.bookingReference)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-stone-600">Amount</span>
              <span className="font-bold">{formatCurrency(Number(payment.amount))}</span>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-stone-500">
          Live PhonePe production credentials are not active in development mode. Use the testable outcomes below to trigger verified server-side settlement:
        </p>
        <div className="mt-6 grid gap-3">
          <Button disabled={processing} onClick={() => simulateOutcome('COMPLETED')}>
            <CheckCircle2 className="h-4 w-4" /> Complete Verified Payment
          </Button>
          <Button variant="outline" disabled={processing} onClick={() => simulateOutcome('PENDING')}>
            <Clock className="h-4 w-4" /> Keep Pending (Test Reconciliation)
          </Button>
          <Button variant="danger" disabled={processing} onClick={() => simulateOutcome('FAILED')}>
            <XCircle className="h-4 w-4" /> Simulate Payment Failure
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function PaymentStatusResultPage({ mode }: { mode: 'callback' | 'success' | 'failure' | 'pending' }) {
  const [params] = useSearchParams();
  const { data: publicEvent } = usePublicEvent();
  const txn = params.get('txn') || sessionStorage.getItem('efo_last_txn') || '';
  const [data, setData] = useState<{
    payment?: Record<string, unknown>;
    booking?: Record<string, unknown>;
    tickets?: Array<Record<string, unknown>>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);

  const checkStatus = async () => {
    if (!txn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/payments/status/${txn}`);
      setData(res.data.data);
    } catch {
      // handled in UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [txn]);

  useEffect(() => {
    if (data?.booking?.status === 'PAID') {
      setShowCongrats(true);
    }
  }, [data?.booking?.status]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-700" />
        <p className="mt-3 text-sm font-medium text-stone-600">Verifying payment status with server...</p>
      </div>
    );
  }

  const booking = data?.booking;
  const tickets = data?.tickets || [];
  const isPaid = booking?.status === 'PAID';
  const isFailed = mode === 'failure' || data?.payment?.status === 'FAILED';

  if (isPaid) {
    const firstSecureRef = tickets[0]?.secureReference ? String(tickets[0].secureReference) : undefined;
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <CongratulationsPopup
          open={showCongrats}
          onClose={() => setShowCongrats(false)}
          bookingReference={String(booking.bookingReference)}
          ticketCount={tickets.length}
          primarySecureReference={firstSecureRef}
          eventName={publicEvent?.name}
        />

        <Card className="border-emerald-200 bg-emerald-50/50 p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-600" />
              <div>
                <h1 className="font-display text-2xl font-bold text-stone-900">Booking Confirmed!</h1>
                <p className="mt-1 text-sm text-stone-700">
                  Booking Reference: <span className="font-mono font-bold">{String(booking.bookingReference)}</span> •{' '}
                  {tickets.length} Individual 8:14 Sacred Pass(es) Issued
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCongrats(true)}>
              Open Celebration Card
            </Button>
          </div>
        </Card>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {tickets.map((t) => (
            <TicketIdCard
              key={String(t.ticketId)}
              ticket={t as unknown as PassTicketData}
              event={publicEvent}
              size="compact"
              showOpenPass
              notchBgClass="bg-[#050b21]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14 text-center">
      <Card className="p-8">
        {isFailed ? (
          <XCircle className="mx-auto h-12 w-12 text-red-600" />
        ) : (
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
        )}
        <h1 className="font-display mt-4 text-2xl font-bold text-stone-900">
          {isFailed ? 'Payment Not Completed' : 'Payment Verification Pending'}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {String(data?.payment?.failureReason || 'Your payment has not been confirmed yet. No confirmed tickets are issued until verified.')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={checkStatus}>
            Re-check Status
          </Button>
          <Link to="/checkout" className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white">
            Retry Payment
          </Link>
        </div>
      </Card>
    </div>
  );
}

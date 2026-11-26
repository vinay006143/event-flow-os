import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, Mail, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { Button, Card, Input, Select, StatusBadge } from '../../../components/ui/primitives';
import { usePublicEvent } from '../layouts/PublicLayout';
import { TicketIdCard, type PassTicketData } from '../components/TicketIdCard';

export function MyTicketsPage() {
  const { data: publicEvent } = usePublicEvent();
  const [mobile, setMobile] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'VERIFY' | 'LIST'>('REQUEST');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    retrievalSessionToken: string;
    bookings: Array<Record<string, unknown>>;
    tickets: Array<Record<string, unknown>>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/tickets/retrieve/request-otp', {
        mobile: mobile.trim() || undefined,
        bookingReference: bookingReference.trim() || undefined,
      });
      setDevOtpHint(res.data.data.devOtp || null);
      setStep('VERIFY');
      toast.success(`OTP sent to ${res.data.data.maskedMobile}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/tickets/retrieve/verify-otp', {
        mobile: mobile.trim() || undefined,
        bookingReference: bookingReference.trim() || undefined,
        otp: otp.trim(),
      });
      setSessionData(res.data.data);
      setStep('LIST');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (bookingRef: string) => {
    if (!sessionData) return;
    try {
      await api.post('/tickets/retrieve/resend', {
        bookingReference: bookingRef,
        retrievalSessionToken: sessionData.retrievalSessionToken,
      });
      toast.success('Tickets queued for WhatsApp & Email resend');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resend failed');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-700">OTP-Protected Access</span>
        <h1 className="font-display mt-1 text-3xl font-bold text-stone-900">Retrieve My Tickets</h1>
        <p className="mt-1 text-sm text-stone-600">
          Verify your registered mobile number or booking reference via one-time passcode to access all individual passes.
        </p>
      </div>

      {step === 'REQUEST' && (
        <Card className="max-w-lg p-6">
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Registered Mobile Number</label>
              <Input
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
            <div className="text-center text-xs font-medium text-stone-400">AND / OR</div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Booking Reference</label>
              <Input
                placeholder="e.g. BK-NOD-XXXXXXX"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value.toUpperCase())}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <KeyRound className="h-4 w-4" /> {loading ? 'Sending OTP...' : 'Request Verification OTP'}
            </Button>
          </form>
        </Card>
      )}

      {step === 'VERIFY' && (
        <Card className="max-w-lg p-6">
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-stone-700">Enter the 6-digit OTP sent to your registered contact.</p>
            {devOtpHint && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <strong>Development Mode OTP:</strong> <span className="font-mono font-bold">{devOtpHint}</span>
              </div>
            )}
            <Input
              required
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep('REQUEST')}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & View Tickets'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 'LIST' && sessionData && (
        <div className="space-y-6">
          {sessionData.bookings.map((b) => (
            <div key={String(b._id)} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                <div>
                  <span className="text-xs text-stone-500">Booking Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold">{String(b.bookingReference)}</span>
                    <StatusBadge status={String(b.status)} />
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleResend(String(b.bookingReference))}>
                  <Send className="h-3.5 w-3.5" /> Resend via WhatsApp & Email
                </Button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {sessionData.tickets
                  .filter((t) => String(t.bookingId) === String(b._id))
                  .map((t) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

export function IndividualTicketPassPage() {
  const { secureReference } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['ticket-pass', secureReference],
    queryFn: async () => (await api.get(`/tickets/pass/${secureReference}`)).data.data,
  });

  if (isLoading) return <div className="py-20 text-center text-sm text-stone-500">Loading pass...</div>;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Card className="p-8">
          <h2 className="text-lg font-bold text-stone-900">Ticket Pass Not Found</h2>
          <p className="mt-2 text-sm text-stone-600">This ticket link is invalid or unavailable.</p>
        </Card>
      </div>
    );
  }

  const { ticket, event } = data;

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <TicketIdCard
        ticket={ticket as PassTicketData}
        event={event}
        size="full"
        defaultShareOpen
        notchBgClass="bg-[#050b21]"
      />
    </div>
  );
}

export function FaqPage() {
  const { data: event } = usePublicEvent();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-stone-900">Frequently Asked Questions</h1>
      <div className="mt-6 space-y-4">
        {(event?.faqs || []).map((f: { question: string; answer: string }, idx: number) => (
          <Card key={idx} className="p-6">
            <h3 className="text-base font-bold text-stone-900">{f.question}</h3>
            <p className="mt-2 text-sm text-stone-600">{f.answer}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SupportPage() {
  const { data: event } = usePublicEvent();
  const [form, setForm] = useState({
    category: 'Ticket Delivery',
    subject: '',
    description: '',
    bookingReference: '',
    contactName: '',
    contactMobile: '',
    contactEmail: '',
  });
  const [createdRef, setCreatedRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/support', form);
      setCreatedRef(res.data.data.reference);
      toast.success('Support ticket submitted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit support request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-stone-900">Attendee Support</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="p-6">
            {createdRef ? (
              <div className="text-center py-8">
                <h2 className="text-xl font-bold text-emerald-700">Request Received</h2>
                <p className="mt-2 text-sm text-stone-600">
                  Reference: <span className="font-mono font-bold text-stone-900">{createdRef}</span>
                </p>
                <Button className="mt-4" variant="outline" onClick={() => setCreatedRef(null)}>
                  Submit Another Request
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-700">Category</label>
                    <Select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    >
                      <option>Ticket Delivery</option>
                      <option>Payment Issue</option>
                      <option>Name Correction</option>
                      <option>Refund / Cancellation</option>
                      <option>Venue & Accessibility</option>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-700">Booking Reference (optional)</label>
                    <Input
                      placeholder="BK-NOD-..."
                      value={form.bookingReference}
                      onChange={(e) => setForm((f) => ({ ...f, bookingReference: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    required
                    placeholder="Your Name *"
                    value={form.contactName}
                    onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  />
                  <Input
                    required
                    placeholder="Mobile Number *"
                    value={form.contactMobile}
                    onChange={(e) => setForm((f) => ({ ...f, contactMobile: e.target.value }))}
                  />
                  <Input
                    type="email"
                    placeholder="Email (optional)"
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
                <Input
                  required
                  placeholder="Subject *"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your issue..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-stone-300 p-3 text-sm focus:border-amber-600 focus:outline-none"
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Support Request'}
                </Button>
              </form>
            )}
          </Card>
        </div>

        <Card className="h-fit p-6 space-y-4">
          <h3 className="font-bold text-stone-900">Direct Support</h3>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Mail className="h-4 w-4 text-amber-700" /> {event?.contact?.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <MessageSquare className="h-4 w-4 text-amber-700" /> {event?.contact?.whatsappNumber}
          </div>
          <p className="text-xs text-stone-500">Support Hours: {event?.contact?.supportHours}</p>
        </Card>
      </div>
    </div>
  );
}

export function PolicyPage({ type }: { type: 'terms' | 'privacy' | 'refund' }) {
  const { data: event } = usePublicEvent();
  const title =
    type === 'terms'
      ? 'Terms & Conditions'
      : type === 'privacy'
        ? 'Privacy Policy'
        : 'Refund & Cancellation Policy';
  const content =
    type === 'terms'
      ? event?.policies?.termsAndConditions
      : type === 'privacy'
        ? event?.policies?.privacyPolicy
        : event?.policies?.refundPolicy;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Card className="p-8">
        <h1 className="font-display text-3xl font-bold text-stone-900">{title}</h1>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-stone-700">
          {content || 'Policy details are configured by the event administrator.'}
        </p>
      </Card>
    </div>
  );
}

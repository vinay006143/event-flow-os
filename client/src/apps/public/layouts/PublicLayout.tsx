import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Calendar,
  MapPin,
  Menu,
  Phone,
  QrCode,
  ShieldCheck,
  Ticket,
  X,
} from 'lucide-react';
import { api } from '../../../services/api';
import { GoldShulamIcon } from '../components/GoldShulamIcon';

export function usePublicEvent() {
  return useQuery({
    queryKey: ['public-event'],
    queryFn: async () => {
      const res = await api.get('/event/public');
      return res.data.data;
    },
  });
}

const NAV_LINKS = [
  { to: '/event', label: 'Event', match: ['/', '/event'] },
  { to: '/story', label: 'Our Story', match: ['/story'] },
  { to: '/tickets', label: 'Book Passes', match: ['/tickets'] },
  { to: '/my-tickets', label: 'My Tickets', match: ['/my-tickets'] },
  { to: '/support', label: 'Support', match: ['/support', '/faq'] },
];

export function PublicLayout() {
  const { data: event } = usePublicEvent();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip bg-[#faf7f2] text-stone-900">
      {event?.operations?.emergencyBanner && (
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 px-4 py-2 text-center text-xs font-extrabold tracking-wide text-slate-950">
          {event.operations.emergencyBanner}
        </div>
      )}

      {/* CREATIVE STICKY DEVOTIONAL NAVBAR */}
      <header
        className={`sticky top-0 z-50 text-white backdrop-blur-xl transition-all duration-300 border-b ${
          scrolled
            ? 'bg-[#040817]/95 border-amber-400/35 shadow-2xl shadow-slate-950/60'
            : 'bg-[#050b21]/85 border-amber-400/15 shadow-lg shadow-slate-950/30'
        }`}
      >
        {/* Top Sacred Gold Hairline */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400/90 to-transparent" />

        <div
          className={`mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 transition-all duration-300 ${
            scrolled ? 'py-2' : 'py-2.5 sm:py-3.5'
          }`}
        >
          {/* Sacred Crest Brand */}
          <Link to="/" className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3 md:flex-initial">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/55 bg-gradient-to-br from-[#0f1f4d] via-[#081336] to-[#04091b] shadow-md shadow-amber-500/25 transition group-hover:scale-105">
              <GoldShulamIcon className="h-6 w-6 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-sacred bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-400 bg-clip-text text-sm font-extrabold tracking-wide text-transparent sm:text-base sm:tracking-wider">
                {event?.name || 'Night of Devotion'}
              </div>
              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300/85 sm:tracking-[0.2em]">
                {event?.subtitle || 'Nirantaram Sanatanam'} • Dec 5
              </div>
            </div>
          </Link>

          {/* Center Floating Pill Nav */}
          <nav className="hidden items-center gap-1 rounded-full border border-amber-400/25 bg-[#0a1538]/90 p-1 shadow-inner md:flex">
            {NAV_LINKS.map((item) => {
              const active = item.match.includes(location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition ${
                    active
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-white/5 hover:text-amber-200'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <a
              href={`tel:${event?.contact?.phone || '+919640509090'}`}
              className="hidden items-center gap-1.5 rounded-full border border-amber-400/30 bg-white/5 px-3.5 py-2 text-xs font-semibold text-amber-200 transition hover:bg-white/10 lg:inline-flex"
            >
              <Phone className="h-3.5 w-3.5 text-amber-400" />
              <span>9640509090</span>
            </a>

            <Link
              to="/tickets"
              className="hidden min-[380px]:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-3 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/25 transition hover:brightness-105 sm:px-5 sm:text-sm"
            >
              <Ticket className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">Book Passes</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-primary-nav"
              className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-amber-400/35 bg-white/10 text-amber-200 transition active:scale-95 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-primary-nav"
            className="max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-amber-400/20 bg-[#060f2b]/98 px-4 py-4 shadow-2xl md:hidden"
          >
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-1.5">
              {NAV_LINKS.map((item) => {
                const active = item.match.includes(location.pathname);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-[44px] items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950'
                        : 'text-slate-100 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <Link
                to="/tickets"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-md shadow-amber-500/25"
              >
                <Ticket className="h-4 w-4" /> Book Passes
              </Link>

              <a
                href={`tel:${event?.contact?.phone || '+919640509090'}`}
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-white/5 py-2.5 text-xs font-bold text-amber-200"
              >
                <Phone className="h-4 w-4 text-amber-400" /> Enquiries: 9640509090
              </a>
            </nav>
          </div>
        )}
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] md:hidden"
        />
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      {/* CREATIVE DEVOTIONAL FOOTER */}
      <footer className="relative overflow-hidden border-t border-amber-400/30 bg-[#04091b] text-slate-300">
        {/* Ambient golden glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.12),transparent_55%)]" />

        {/* Decorative Top Sacred Filigree */}
        <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 pt-8">
          <div className="flex w-full items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/40" />
            <div className="flex items-center gap-2 rounded-full border border-amber-400/35 bg-[#091538] px-4 py-1 text-[11px] font-sacred font-bold tracking-[0.22em] text-amber-300">
              <GoldShulamIcon className="h-3.5 w-3.5 shrink-0" />
              <span>NIRANTARAM SANATANAM</span>
              <GoldShulamIcon className="h-3.5 w-3.5 shrink-0" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/40" />
          </div>
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-12">
          {/* Left Identity & Venue */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-400/50 bg-gradient-to-br from-[#0f1f4d] via-[#081336] to-[#04091b] shadow-md shadow-amber-500/25">
                <GoldShulamIcon className="h-7 w-7 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]" />
              </div>
              <div>
                <div className="font-sacred text-xl font-bold text-white">
                  {event?.name || 'Night of Devotion'}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">
                  {event?.subtitle || 'Nirantaram Sanatanam'}
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              రాజమండ్రి... ఈ భక్తి సంగీత వేడుకలో మనమంతా కలుద్దాం! An unforgettable evening of bhajan jamming, sacred chants, and spiritual unity.
            </p>

            <div className="mt-5 space-y-2.5 rounded-2xl border border-amber-400/20 bg-[#081232]/80 p-4 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 shrink-0 text-amber-400" />
                <span>December 5, 2026 • 6:00 PM onwards (Doors open 4:30 PM)</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  {event?.venue?.name || 'Exhibition Grounds'},{' '}
                  {event?.venue?.address || 'Beside GAIL Office, A.V. Apparao Road, Rajahmundry'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-amber-400" />
                <a
                  href={`tel:${event?.contact?.phone || '+919640509090'}`}
                  className="font-bold text-amber-300 hover:underline"
                >
                  Sponsorships, Stalls &amp; Tickets: +91 9640509090
                </a>
              </div>
            </div>
          </div>

          {/* Center Navigation & Policies */}
          <div className="grid grid-cols-2 gap-6 lg:col-span-4">
            <div>
              <h4 className="font-sacred text-xs font-bold uppercase tracking-widest text-amber-300">
                Experience
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link to="/" className="hover:text-amber-300 transition">Home &amp; Event</Link></li>
                <li><Link to="/story" className="hover:text-amber-300 transition">Our Sacred Story</Link></li>
                <li><Link to="/tickets" className="hover:text-amber-300 transition">Book Passes</Link></li>
                <li><Link to="/my-tickets" className="hover:text-amber-300 transition">Retrieve My Tickets</Link></li>
                <li><Link to="/faq" className="hover:text-amber-300 transition">Event FAQ</Link></li>
                <li><Link to="/support" className="hover:text-amber-300 transition">Attendee Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-sacred text-xs font-bold uppercase tracking-widest text-amber-300">
                Policies
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link to="/terms" className="hover:text-amber-300 transition">Terms &amp; Conditions</Link></li>
                <li><Link to="/privacy" className="hover:text-amber-300 transition">Privacy Policy</Link></li>
                <li><Link to="/refund-policy" className="hover:text-amber-300 transition">Refund Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Right Quick Reservation & Operations Card */}
          <div className="lg:col-span-3">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-amber-400/30 bg-gradient-to-b from-[#0b183d] to-[#070f28] p-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  Instant Digital Entry
                </div>
                <h4 className="font-display mt-1 text-xl font-bold text-white">
                  Reserve Your Sacred Seat
                </h4>
                <p className="mt-1.5 text-xs text-slate-300">
                  Individual QR passes delivered directly via WhatsApp &amp; Email.
                </p>
                <Link
                  to="/tickets"
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
                >
                  <QrCode className="h-4 w-4" /> Get Passes Now <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-5 border-t border-white/10 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                <Link to="/staff/login" className="inline-flex items-center gap-1 hover:text-amber-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Staff Scanner
                </Link>
                <Link to="/admin/login" className="inline-flex items-center gap-1 hover:text-amber-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin Console
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Official Sponsors + Multivisiontrendz Original Logo Band */}
        <div className="relative border-t border-amber-500/15 bg-[#030614] px-4 py-7">
          {event?.partners && event.partners.length > 0 && (
            <div className="mx-auto mb-6 max-w-6xl">
              <div className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/90">
                Organisers &amp; Official Sponsors
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {event.partners.map((p: { category: string; name: string; logoUrl?: string }, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center rounded-xl border border-amber-500/20 bg-[#0a1330] px-3 py-2"
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-300/80">
                      {p.category}
                    </span>
                    {p.logoUrl ? (
                      <img
                        src={p.logoUrl}
                        alt={p.name}
                        className="mt-1.5 h-9 w-auto rounded-lg object-contain"
                      />
                    ) : (
                      <span className="mt-1 text-xs font-bold text-white">{p.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exclusively Multivisiontrendz Creative Logo Branding */}
          <div className="mx-auto flex max-w-6xl items-center justify-center border-t border-amber-500/15 pt-5">
            <a
              href="https://www.multivisiontrendz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3.5 rounded-2xl border border-amber-400/30 bg-[#08122e]/95 px-4 py-2 transition hover:border-amber-400/70 hover:bg-[#0b183d]"
            >
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
                <img
                  src="/assets/multivisiontrendz-logo.png"
                  alt="Multivisiontrendz Logo"
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="flex flex-col text-left leading-tight">
                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Design &amp; Developed by
                </span>
                <span className="font-sacred bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-sm font-extrabold tracking-[0.12em] text-transparent group-hover:brightness-110">
                  MULTIVISIONTRENDZ
                </span>
              </span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

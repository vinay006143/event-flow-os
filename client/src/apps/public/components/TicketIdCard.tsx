import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Download,
  ExternalLink,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatEventDate } from '../../../lib/utils';
import { StatusBadge } from '../../../components/ui/primitives';
import { GoldShulamIcon } from './GoldShulamIcon';
import { SocialShareBar } from './SocialShareBar';

export interface PassTicketData {
  ticketId: string;
  secureReference: string;
  bookingReference: string;
  ticketTypeName: string;
  attendeeName: string;
  attendeeAge?: number | null;
  attendeeMobile?: string;
  maskedMobile?: string;
  qrToken?: string | null;
  status: string;
}

export interface PassEventData {
  name?: string;
  subtitle?: string;
  eventDate?: string;
  doorsOpenTime?: string;
  timezone?: string;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
  };
  ticketTemplate?: {
    headerText?: string;
  };
}

interface TicketIdCardProps {
  ticket: PassTicketData;
  event?: PassEventData | null;
  size?: 'compact' | 'full';
  showOpenPass?: boolean;
  defaultShareOpen?: boolean;
  notchBgClass?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'EV';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function maskMobile(mob?: string): string {
  if (!mob) return 'Verified';
  if (mob.includes('*')) return mob;
  return mob.length > 4 ? `${'*'.repeat(Math.max(4, mob.length - 4))}${mob.slice(-4)}` : mob;
}

export function TicketIdCard({
  ticket,
  event,
  size = 'compact',
  showOpenPass = false,
  defaultShareOpen = false,
  notchBgClass = 'bg-[#050b21]',
}: TicketIdCardProps) {
  const [shareOpen, setShareOpen] = useState(defaultShareOpen);

  const eventName = event?.name || 'Night of Devotion';
  const eventSubtitle = event?.subtitle || 'Nirantaram Sanatanam';
  const isVip = /vip|premium/i.test(ticket.ticketTypeName);
  const eventDateText = event?.eventDate
    ? formatEventDate(event.eventDate, event.timezone || 'Asia/Kolkata')
    : '5 Dec 2026, 6:00 PM';
  const doorsOpenText = event?.doorsOpenTime || '4:30 PM IST (Show 6:00 PM onwards)';
  const venueText = event?.venue?.name
    ? `${event.venue.name}${event.venue.city ? `, ${event.venue.city}` : ''}`
    : 'Exhibition Grounds, Rajahmundry';

  const displayPhone = ticket.maskedMobile || maskMobile(ticket.attendeeMobile);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicInviteUrl = `${origin}/event`;
  const privatePassUrl = `${origin}/ticket/${ticket.secureReference}`;
  const shareText = `🙏 Attending ${eventName} (${eventSubtitle}) on Dec 5 in Rajahmundry! Join this devotional evening ✨`;

  return (
    <article className="mx-auto w-full max-w-[380px] rounded-[28px] bg-gradient-to-b from-amber-300 via-amber-500/80 to-amber-400 p-[1.5px] shadow-2xl shadow-slate-950/50">
      <div className="relative overflow-hidden rounded-[26.5px] bg-[#06102b]">
        {/* Subtle Gold Inner Frame */}
        <div className="pointer-events-none absolute inset-2 z-20 rounded-[20px] border border-amber-400/25" />

        {/* 1. Top Sacred Shiva Header Banner (no overlap with card body) */}
        <div className="relative overflow-hidden px-4 pb-5 pt-3 text-white">
          <img
            src="/assets/event/moments/shiva-invocation.png"
            alt="Lord Shiva Sanctuary"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_18%]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#03091f]/45 via-[#050f2c]/35 to-[#06102b]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500" />

          {/* Top Lanyard Cutout Slot */}
          <div className="relative z-10 mb-3 flex justify-center">
            <div className="h-2.5 w-14 rounded-full border border-amber-300/75 bg-[#020617] shadow-inner" />
          </div>

          {/* Top Bar: Trishul Emblem Left + Tier Pill Right */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/70 bg-[#04091b]/85 shadow-md backdrop-blur-sm">
              <GoldShulamIcon className="h-5 w-5 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]" />
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow ${
                isVip
                  ? 'bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-slate-950'
                  : 'border border-amber-300/60 bg-[#04091b]/85 text-amber-200 backdrop-blur-sm'
              }`}
            >
              {isVip ? 'VIP ID PASS' : 'STANDARD PASS'}
            </span>
          </div>

          {/* Centered Event Title Over Lower Fade */}
          <div className="relative z-10 mt-12 text-center sm:mt-14">
            <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-amber-300 drop-shadow">
              {event?.ticketTemplate?.headerText || 'OFFICIAL ENTRY PASS'}
            </div>
            <h2 className="mt-0.5 break-words font-display text-2xl font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-[26px]">
              {eventName}
            </h2>
            <p className="mt-0.5 break-words text-[11px] font-bold tracking-wide text-amber-100 drop-shadow">
              {eventSubtitle}
            </p>
          </div>
        </div>

        {/* 2. Clean Warm Cream Ticket Card Inside Dark Navy Frame */}
        <div className="relative z-10 mx-3 rounded-[24px] bg-[#fbf7ee] text-stone-900 shadow-xl">
          {/* Upper Identity & Venue Details */}
          <div className="px-4 pb-4 pt-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-800/80">
                  PASS HOLDER IDENTITY
                </div>
                <h3 className="mt-0.5 break-words font-display text-xl font-extrabold leading-snug text-stone-950">
                  {ticket.attendeeName}
                </h3>
                <p className="break-words text-xs font-bold text-amber-700">
                  {ticket.ticketTypeName}
                </p>
              </div>
              <div className="shrink-0 pt-0.5">
                <StatusBadge status={ticket.status} />
              </div>
            </div>

            {/* Clean Contained Info Ledger (zero text overflow) */}
            <div className="mt-3.5 space-y-2.5 rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-stone-400">
                  <Calendar className="h-2.5 w-2.5 shrink-0 text-amber-700" />
                  <span>Date &amp; Gates</span>
                </div>
                <div className="mt-0.5 break-words text-xs font-bold leading-snug text-stone-900">
                  {eventDateText}
                </div>
                <div className="break-words text-[11px] font-medium text-stone-600">
                  Gates {doorsOpenText}
                </div>
              </div>

              <div className="border-t border-stone-100 pt-2 min-w-0">
                <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-stone-400">
                  <MapPin className="h-2.5 w-2.5 shrink-0 text-amber-700" />
                  <span>Venue</span>
                </div>
                <div className="mt-0.5 break-words text-xs font-bold leading-snug text-stone-900">
                  {venueText}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-2 text-[11px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-stone-400">
                    <UserCheck className="h-2.5 w-2.5 shrink-0 text-amber-700" />
                    <span>Admit / Age</span>
                  </div>
                  <div className="mt-0.5 truncate font-bold text-stone-900">
                    {ticket.attendeeAge ? `${ticket.attendeeAge} yrs (Admit 1)` : 'Admit 1'}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-stone-400">
                    <Phone className="h-2.5 w-2.5 shrink-0 text-amber-700" />
                    <span>Mobile</span>
                  </div>
                  <div className="mt-0.5 truncate font-mono font-bold text-stone-900">
                    {displayPhone}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Precision Perforated Tear Divider */}
          <div className="relative flex items-center py-0.5">
            <div className={`-ml-2.5 h-5 w-5 shrink-0 rounded-full ${notchBgClass}`} />
            <div className="mx-1 h-px flex-1 border-t-2 border-dashed border-stone-300" />
            <div className={`-mr-2.5 h-5 w-5 shrink-0 rounded-full ${notchBgClass}`} />
          </div>

          {/* 4. Crisp White QR Verification Stub */}
          <div className="px-4 pb-5 pt-3 text-center">
            <div className="mx-auto inline-flex max-w-full items-center justify-center rounded-2xl border border-amber-300/70 bg-white p-3.5 shadow-sm">
              {ticket.qrToken ? (
                <QRCodeSVG value={ticket.qrToken} size={size === 'full' ? 168 : 144} level="M" />
              ) : (
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-xl bg-red-50 px-2 text-center text-xs font-bold text-red-700">
                  <span>QR Inactive</span>
                  <span className="mt-0.5 text-[10px] font-medium">Status: {ticket.status}</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 break-all font-mono text-sm font-extrabold tracking-wider text-stone-950">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{ticket.ticketId}</span>
            </div>
            <div className="mt-0.5 break-words text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Booking Ref: <span className="font-mono font-bold text-stone-700">{ticket.bookingReference}</span> • Admit One
            </div>
          </div>
        </div>

        {/* 5. Footer Text + Responsive Actions */}
        <div className="relative z-10 px-3.5 pb-3.5 pt-3 text-center text-white">
          <div className="break-words text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-300">
            {eventSubtitle.toUpperCase()} • RAJAMAHENDRAVARAM
          </div>
          <div className="mt-0.5 break-words text-[10px] text-slate-300">
            Enquiries: +91 9640509090 • Present this 8:14 QR Pass at Entry Gate
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 text-left">
            <a
              href={`/api/v1/tickets/pass/${ticket.secureReference}/download?format=png`}
              className="inline-flex min-h-[38px] touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 px-2.5 py-1.5 text-xs font-extrabold text-slate-950 shadow transition hover:brightness-105 active:scale-95"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>Save 8:14 PNG</span>
            </a>

            <a
              href={`/api/v1/tickets/pass/${ticket.secureReference}/download?format=pdf`}
              className="inline-flex min-h-[38px] touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/15 active:scale-95"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span>PDF Pass</span>
            </a>

            {showOpenPass && (
              <Link
                to={`/ticket/${ticket.secureReference}`}
                className="inline-flex min-h-[38px] touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-amber-400/35 bg-[#0a1538] px-2.5 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-[#0f1f4d] active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span>ID Card</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setShareOpen((v) => !v)}
              className={`inline-flex min-h-[38px] touch-manipulation items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                showOpenPass ? '' : 'col-span-2'
              } ${
                shareOpen
                  ? 'border-amber-300 bg-amber-300 text-slate-950'
                  : 'border-amber-400/45 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25'
              }`}
            >
              {shareOpen ? <X className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>{shareOpen ? 'Hide Share' : 'Share'}</span>
            </button>
          </div>

          {shareOpen && (
            <div className="mt-2 rounded-2xl border border-amber-400/20 bg-[#081336] p-2.5">
              <SocialShareBar
                title={`${eventName} — Official Pass`}
                text={shareText}
                url={publicInviteUrl}
                privatePassUrl={privatePassUrl}
                variant="dark"
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Minus,
  Phone,
  Play,
  Plus,
  QrCode,
  ShieldCheck,
  Ticket,
  X,
  ZoomIn,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../lib/utils';
import { usePublicEvent } from '../layouts/PublicLayout';
import { DevotionalVideoReel } from '../components/DevotionalVideoReel';
import { SacredWelcomePreloader } from '../components/SacredWelcomePreloader';
import { GoldShulamIcon } from '../components/GoldShulamIcon';
import { SocialShareBar } from '../components/SocialShareBar';

function useEventCountdown(targetIso?: string) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, mins: 0 });
  useEffect(() => {
    const target = new Date(targetIso || '2026-12-05T18:00:00+05:30').getTime();
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setRemaining({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
      });
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}

function SacredDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-1">
      <span className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-amber-700/40" />
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-amber-700">
        <path
          d="M12 2C13.5 5.5 16.5 7.5 16.5 11C16.5 13.5 14.5 15.5 12 15.5C9.5 15.5 7.5 13.5 7.5 11C7.5 7.5 10.5 5.5 12 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M4 13C6.5 13 8.5 15 12 18C15.5 15 17.5 13 20 13C18.5 16.5 15.5 19.5 12 21C8.5 19.5 5.5 16.5 4 13Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      <span className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-amber-700/40" />
    </div>
  );
}

export function EventLandingPage() {
  const navigate = useNavigate();
  const { data: event, isLoading: eventLoading } = usePublicEvent();
  const { data: ticketTypes } = useQuery({
    queryKey: ['public-ticket-types'],
    queryFn: async () => (await api.get('/ticket-types/public')).data.data,
  });

  const [zoomedPoster, setZoomedPoster] = useState<{ src: string; title: string } | null>(null);
  const [quickQty, setQuickQty] = useState<Record<string, number>>({});
  const [reserving, setReserving] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [venueTab, setVenueTab] = useState<'zones' | 'darshan' | 'gates'>('zones');
  const [storyLang, setStoryLang] = useState<'en' | 'te'>('en');
  const [visualMode, setVisualMode] = useState<'map' | 'pass'>('map');
  const [previewTier, setPreviewTier] = useState<'REGULAR' | 'PREMIUM'>('PREMIUM');
  const countdown = useEventCountdown(event?.eventDate);

  if (eventLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-80 animate-pulse rounded-3xl bg-stone-200" />
      </div>
    );
  }

  const heroPoster = event?.posters?.heroUrl || '/assets/event/poster-hero.jpg';
  const artistsPoster = event?.posters?.artistsUrl || '/assets/event/poster-artists.jpg';
  const floorPlanPoster = event?.posters?.floorPlanUrl || '/assets/event/poster-floorplan.jpg';

  const typesList = (ticketTypes || []) as Array<Record<string, unknown>>;
  const lowestPrice =
    typesList.length > 0 ? Math.min(...typesList.map((t) => Number(t.price))) : 699;

  const selectedQuickItems = typesList
    .filter((t) => (quickQty[String(t.id)] || 0) > 0)
    .map((t) => ({
      ticketTypeId: String(t.id),
      name: String(t.name),
      price: Number(t.price),
      quantity: quickQty[String(t.id)] || 0,
    }));

  const quickTotalCount = selectedQuickItems.reduce((s, i) => s + i.quantity, 0);
  const quickSubtotal = selectedQuickItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const adjustQuickQty = (id: string, delta: number, maxAllowed: number) => {
    setQuickQty((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(maxAllowed, (prev[id] || 0) + delta)),
    }));
  };

  const handleInstantReserve = async () => {
    if (selectedQuickItems.length === 0) {
      navigate('/tickets');
      return;
    }
    setReserving(true);
    try {
      const res = await api.post('/reservations', {
        items: selectedQuickItems.map((i) => ({
          ticketTypeId: i.ticketTypeId,
          quantity: i.quantity,
        })),
      });
      sessionStorage.setItem('efo_active_reservation', JSON.stringify(res.data.data));
      navigate('/register');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to hold seats');
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="pb-20 sm:pb-0">
      <SacredWelcomePreloader />
      {/* =====================================================================
          1. LUXURY EDITORIAL HERO + CONVERSION ANCHORS
      ===================================================================== */}
      <section className="relative overflow-hidden bg-[#04091b] text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(245,158,11,0.22),transparent_50%),radial-gradient(circle_at_15%_85%,rgba(37,99,235,0.22),transparent_55%)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center lg:col-span-7 lg:text-left"
          >
            <div className="font-sacred inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 sm:text-xs">
              <GoldShulamIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{event?.subtitle || 'Nirantaram Sanatanam'}</span>
            </div>

            <h1 className="font-sacred mt-4 bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-500 bg-clip-text text-3xl font-extrabold leading-tight tracking-wide text-transparent sm:text-5xl lg:text-6xl">
              {event?.name || 'Night of Devotion'}
            </h1>

            <p className="mt-3 text-base font-medium text-amber-200/95 sm:text-xl">
              రాజమండ్రి... భక్తి సంగీతంతో ఒక అద్భుతమైన సాయంత్రానికి సిద్ధమా?
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base lg:mx-0">
              When twilight settles over Rajamahendravaram, leave the rush of the world behind. Gather with family and elders for glowing diyas, sacred chants, and soul-soothing bhajans under one open sky.
            </p>

            {event?.operations?.emergencyAnnouncement && (
              <div className="mt-4 rounded-2xl border border-amber-400/50 bg-amber-500/15 p-3.5 text-xs text-amber-100 sm:text-sm">
                <strong>Important Update:</strong> {event.operations.emergencyAnnouncement}
              </div>
            )}

            {/* Simple 2-Card Date & Venue + Countdown */}
            <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-white/[0.04] p-3.5 sm:p-4">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Saturday, December 5, 2026
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-white">6:00 PM onwards</div>
                  <div className="text-xs text-slate-400">
                    Gates open 4:30 PM • In {countdown.days}d {countdown.hours}h
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-white/[0.04] p-3.5 sm:p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Exhibition Grounds
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-white">Rajahmundry</div>
                  <div className="text-xs text-slate-400">Beside GAIL Office, A.V. Apparao Road</div>
                </div>
              </div>
            </div>

            {/* Clean Primary & Secondary CTA */}
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
              {event?.operations?.salesOpen !== false ? (
                <a
                  href="#reserve-passes"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-7 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:brightness-105 sm:text-base"
                >
                  Book Your Passes (From {formatCurrency(lowestPrice)})
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              ) : (
                <span className="rounded-2xl border border-red-400/50 bg-red-500/20 px-6 py-3 text-center text-sm font-semibold text-red-200">
                  Ticket Sales Currently Paused
                </span>
              )}
              <a
                href="#teaser-reel"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-amber-400/35 bg-white/5 px-5 py-3.5 text-sm font-semibold text-amber-100 hover:bg-white/10"
              >
                <Play className="h-4 w-4 text-amber-400" /> Watch Sample Video
              </a>
              <Link
                to="/story"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                Read Sacred Story
              </Link>
            </div>
          </motion.div>

          {/* Hero Artwork */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto w-full max-w-sm sm:max-w-md lg:col-span-5"
          >
            <div
              onClick={() => setZoomedPoster({ src: heroPoster, title: 'Night of Devotion — Official Artwork' })}
              className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-amber-400/45 bg-[#071130] shadow-2xl"
            >
              <img
                src={heroPoster}
                alt="Night of Devotion — Nirantaram Sanatanam Poster"
                className="w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 px-3 py-1.5 text-xs font-medium text-amber-300 backdrop-blur">
                <ZoomIn className="h-3.5 w-3.5" /> Tap to Enlarge
              </div>
            </div>
          </motion.div>
        </div>

        {/* Simple 3-Item Trust Strip */}
        <div className="border-t border-amber-400/20 bg-[#030716]/90 py-3.5">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <QrCode className="h-4 w-4 text-amber-400" /> 1 Attendee = 1 Personal QR Pass
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-400" /> Verified PhonePe Checkout
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-amber-400" /> Instant WhatsApp &amp; PDF Delivery
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          1.5. NIRANTARAM SANATANAM — BILINGUAL TELUGU & ENGLISH STORYTELLING
      ===================================================================== */}
      <section className="border-b border-amber-900/10 bg-[#fbf6ec] py-12 text-stone-900 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <SacredDivider />
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <span className="font-sacred text-xs font-bold uppercase tracking-[0.22em] text-amber-800">
                నిరంతరం సనాతనం • The Soul of the Gathering
              </span>
              <div className="inline-flex rounded-full border border-amber-800/25 bg-white p-0.5 text-[11px] font-bold shadow-sm">
                <button
                  type="button"
                  onClick={() => setStoryLang('en')}
                  className={`rounded-full px-3 py-1 transition ${
                    storyLang === 'en' ? 'bg-[#060f2b] text-amber-300' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setStoryLang('te')}
                  className={`rounded-full px-3 py-1 transition ${
                    storyLang === 'te' ? 'bg-[#060f2b] text-amber-300' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  తెలుగు
                </button>
              </div>
            </div>

            <h2 className="font-display mt-3 text-3xl font-bold text-stone-900 sm:text-5xl">
              {storyLang === 'te'
                ? '“నిరంతరం సనాతనం” అంటే ఏమిటి?'
                : 'What Does “Nirantaram Sanatanam” Mean?'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-base">
              {storyLang === 'te'
                ? 'రాజమండ్రి గోదావరి తీరాన ప్రవహించే పవిత్ర జలధారలా, ఎన్నడూ ఆగని భక్తి ప్రవాహమే “నిరంతరం సనాతనం”.'
                : 'Like the sacred Godavari flowing past Rajamahendravaram, Nirantaram Sanatanam celebrates an unbroken, everlasting river of devotion connecting every generation.'}
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-amber-900/15 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="font-sacred text-xs font-bold uppercase tracking-widest text-amber-800">
                01 • నిరంతరం (Nirantaram)
              </div>
              <h3 className="font-display mt-2 text-2xl font-bold text-stone-900">
                {storyLang === 'te' ? 'ఆగని భక్తి ప్రవాహం' : 'Unbroken Flow of Faith'}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 sm:text-sm">
                {storyLang === 'te'
                  ? 'నిరంతరం అనగా ఎటువంటి అంతరాయం లేకుండా నిత్యం కొనసాగే భక్తి, కృతజ్ఞత మరియు ఆధ్యాత్మిక చైతన్యం.'
                  : 'Meaning continuous, unceasing, without interruption — an unbroken rhythm of prayer, music, and gratitude carried from heart to heart.'}
              </p>
            </div>

            <div className="rounded-3xl border border-amber-900/15 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="font-sacred text-xs font-bold uppercase tracking-widest text-amber-800">
                02 • సనాతనం (Sanatanam)
              </div>
              <h3 className="font-display mt-2 text-2xl font-bold text-stone-900">
                {storyLang === 'te' ? 'శాశ్వత ధర్మ సారం' : 'The Timeless Eternal'}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600 sm:text-sm">
                {storyLang === 'te'
                  ? 'ఆది అంతం లేని శాశ్వత సత్యం — పెద్దలు, తల్లిదండ్రులు మరియు యువతను ఒకే వేదికపై కలిపే మన సనాతన సంస్కృతి.'
                  : 'Meaning that which has no beginning and no end — the timeless wisdom of Sanatana Dharma uniting elders, parents, and youth.'}
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-amber-500/40 bg-gradient-to-br from-[#060f2b] to-[#0f1d4a] p-6 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-xl">
              <div>
                <div className="font-sacred text-xs font-bold uppercase tracking-widest text-amber-300">
                  03 • డిసెంబర్ 5 • రాజమండ్రి
                </div>
                <h3 className="font-display mt-2 text-2xl font-bold text-white">
                  {storyLang === 'te' ? 'ఒక సాయంత్రం... ఎన్నో భక్తి అనుభూతులు!' : 'The Everlasting Eternal'}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {storyLang === 'te'
                    ? 'భజన జామింగ్, దీప ప్రజ్వలన మరియు హరి తేజ & హరి నిత్య లైవ్ సంగీతంతో ఆధ్యాత్మిక ఏకత్వాన్ని ఆస్వాదించండి.'
                    : 'Step into that unbroken current on December 5th through Bhajan Jamming, temple darshan zones, and shared stillness.'}
                </p>
              </div>
              <Link
                to="/story"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:underline"
              >
                {storyLang === 'te' ? 'పూర్తి కథనాన్ని చదవండి' : 'Explore the 4-Chapter Story'} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. SIMPLE & CREATIVE SPECIAL GUEST SPOTLIGHT
      ===================================================================== */}
      <section id="guests" className="relative overflow-hidden bg-[#060f2b] py-14 text-slate-100 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(245,158,11,0.14),transparent_55%)]" />

        <div className="relative mx-auto max-w-5xl px-4">
          <div className="text-center">
            <span className="font-sacred inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/10 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
              <GoldShulamIcon className="h-3.5 w-3.5 shrink-0" />
              <span>ప్రత్యేక అతిథులు • Special Guest Spotlight</span>
            </span>
            <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-5xl">
              Honoured Voices of the Evening
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
              Classical devotion and soulful storytelling uniting Rajamahendravaram under one starry sky.
            </p>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {/* Guest 1: Hari Teja & Hari Nithya */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              className="group relative overflow-hidden rounded-[30px] border border-amber-400/35 bg-gradient-to-b from-[#0e1f4f]/90 to-[#081230] p-4 shadow-2xl"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-amber-400/30">
                <img
                  src="/assets/event/guests/hari-nithya-hari-teja-portrait.png"
                  alt="Hari Teja & Hari Nithya"
                  className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#081230]/80 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-950 shadow">
                  Featuring Artists
                </span>
              </div>

              <div className="px-2 pb-2 pt-5 text-center">
                <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Hari Teja &amp; Hari Nithya
                </h3>
                <p className="mt-1 text-xs font-semibold text-amber-300">
                  భక్తి సంగీతం &amp; భజన జామింగ్
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  Classically trained sisters bringing Venkateswara &amp; Shiva bhajans, keerthanas, and joyful collective Bhajan Jamming.
                </p>
              </div>
            </motion.div>

            {/* Guest 2: Snigdha Nayani */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              className="group relative overflow-hidden rounded-[30px] border border-amber-400/35 bg-gradient-to-b from-[#0e1f4f]/90 to-[#081230] p-4 shadow-2xl"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-amber-400/30">
                <img
                  src="/assets/event/guests/snigdha-nayani.png"
                  alt="Snigdha Nayani"
                  className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#081230]/80 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-950 shadow">
                  Evening Anchor
                </span>
              </div>

              <div className="px-2 pb-2 pt-5 text-center">
                <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Snigdha Nayani
                </h3>
                <p className="mt-1 text-xs font-semibold text-amber-300">
                  Playback Singer, Composer &amp; Host
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  Beloved Telugu singer and actress guiding every chapter from twilight invocation to the 2,000-voice finale.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() =>
                setZoomedPoster({
                  src: artistsPoster,
                  title: 'Featuring Hari Teja & Hari Nithya • Anchor Snigdha Nayani',
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-white/5 px-5 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-400 hover:text-slate-950"
            >
              <ZoomIn className="h-3.5 w-3.5" /> View Official Guest Poster
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. HEART & DEVOTION: SAMPLE VIDEO + SACRED MOMENTS (Warm Ivory)
      ===================================================================== */}
      <section id="teaser-reel" className="bg-[#fbf6ec] py-12 text-stone-900 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <SacredDivider />
            <span className="font-sacred text-[11px] font-bold uppercase tracking-[0.22em] text-amber-800 sm:text-xs">
              A Prayer in Melody
            </span>
            <h2 className="font-display mt-2 text-3xl font-bold text-stone-900 sm:text-4xl">
              Some Evenings You Attend. This One Stays Within You.
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-stone-600 sm:text-base">
              Listen to a glimpse of the twilight mood — glowing diyas, sacred chants, and voices rising together in peace.
            </p>
          </div>

          <div className="mt-8 grid items-center gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-8">
              <DevotionalVideoReel />
            </div>

            <div className="min-w-0 lg:col-span-4">
              <div className="rounded-3xl border border-amber-900/15 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
                  <Heart className="h-4 w-4 text-amber-700" /> Built for Families &amp; Elders
                </div>
                <h3 className="font-display mt-2 text-2xl font-bold text-stone-900">
                  Serene, Guided &amp; Unhurried
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Exhibition Grounds is thoughtfully arranged into comfortable VIP Round Tables and elevated Theater Seating with clear entry gates and photo darshan zones.
                </p>
                <div className="mt-4 space-y-2 border-y border-stone-100 py-3.5 text-xs font-medium text-stone-700">
                  <div className="flex justify-between">
                    <span>Regular Theater Pass</span>
                    <strong className="text-stone-900">₹699</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Premium VIP Zone</span>
                    <strong className="text-amber-800">₹1,199</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Promo: SANATANAM10</span>
                    <strong>10% Off</strong>
                  </div>
                </div>
                <a
                  href="#reserve-passes"
                  className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[#060f2b] text-sm font-bold text-amber-200 transition hover:bg-amber-800 hover:text-white"
                >
                  Choose Your Seats <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* 3 Simple, Emotional Moments Cards (Using Live Bhajan & Diya Scenes) */}
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group overflow-hidden rounded-3xl border border-amber-900/15 bg-white shadow-sm transition hover:shadow-md">
              <div className="overflow-hidden">
                <img
                  src="/assets/event/gallery/diya-aarti-emotion.jpg"
                  alt="Devotees holding glowing brass diyas during twilight aarti"
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  05:45 PM • Deepa Prajwalana
                </span>
                <h3 className="font-display mt-1 text-xl font-bold text-stone-900">
                  Hold a Diya &amp; Feel the Stillness
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Twilight settles in golden warmth as families offer prayers with glowing brass lamps and jasmine blossoms.
                </p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-3xl border border-amber-900/15 bg-white shadow-sm transition hover:shadow-md">
              <div className="overflow-hidden">
                <img
                  src="/assets/event/gallery/stage-bhajan-sanctuary.jpg"
                  alt="Grand temple concert stage with musicians and audience"
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  06:00 PM • Sacred Concert Sanctuary
                </span>
                <h3 className="font-display mt-1 text-xl font-bold text-stone-900">
                  Grand Temple Stage &amp; VIP Seating
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Experience Hari Teja &amp; Hari Nithya on an illuminated temple-arched stage surrounded by Adiyogi &amp; Siva Parvati zones.
                </p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-3xl border border-amber-900/15 bg-white shadow-sm transition hover:shadow-md sm:col-span-2 lg:col-span-1">
              <div className="overflow-hidden">
                <img
                  src="/assets/event/gallery/bhajan-crowd-joy.jpg"
                  alt="Families and youth singing bhajans together joyfully"
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  08:00 PM • Enjoying Bhajan Jamming
                </span>
                <h3 className="font-display mt-1 text-xl font-bold text-stone-900">
                  2,000 Voices Singing in Pure Joy
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Clap, sing, and celebrate together across generations — the unforgettable heart of Nirantaram Sanatanam.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/story"
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-800/30 bg-white px-6 py-3 text-sm font-bold text-amber-900 shadow-sm hover:bg-amber-50"
            >
              Read the Full 4-Chapter Sacred Story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. USER-FRIENDLY PASS RESERVATION & FLOOR PLAN
      ===================================================================== */}
      <section id="reserve-passes" className="border-t border-amber-900/15 bg-[#f4ecdc] py-12 text-stone-900 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <SacredDivider />
            <span className="font-sacred text-[11px] font-bold uppercase tracking-[0.22em] text-amber-800 sm:text-xs">
              Simple 3-Step Booking
            </span>
            <h2 className="font-display mt-2 text-3xl font-bold text-stone-900 sm:text-4xl">
              Select Your Passes &amp; Seating Zone
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Tap <strong>+</strong> to pick how many passes you need — every attendee gets their own personal QR pass.
            </p>
          </div>

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
            {/* Simple Pass Cards First on Mobile (order-1), Side-by-Side on Desktop */}
            <div className="space-y-4 lg:order-2 lg:col-span-7">
              {typesList.map((tt) => {
                const id = String(tt.id);
                const isPremium = String(tt.code).toUpperCase() === 'PREMIUM';
                const available = Number(tt.availableQuantity);
                const capacity = Number(tt.capacity);
                const qty = quickQty[id] || 0;
                const maxAllowed = Math.min(available, Number(tt.maxPerBooking || 10));

                return (
                  <div
                    key={id}
                    className={`rounded-3xl border-2 p-5 sm:p-6 transition shadow-sm ${
                      isPremium
                        ? 'border-amber-400 bg-gradient-to-br from-[#071130] to-[#121c3d] text-white'
                        : 'border-stone-300 bg-white text-stone-900'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span
                          className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            isPremium
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-stone-900 text-amber-200'
                          }`}
                        >
                          {isPremium ? 'VIP Zone • 50 Round Tables' : 'Theater Seating'}
                        </span>
                        <h3 className="font-display mt-2 text-2xl font-bold">{String(tt.name)}</h3>
                        <p className={`mt-1 text-xs ${isPremium ? 'text-slate-300' : 'text-stone-600'}`}>
                          {String(tt.description)}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className={`text-3xl font-black ${isPremium ? 'text-amber-400' : 'text-amber-800'}`}>
                          {formatCurrency(Number(tt.price))}
                        </div>
                        <div className={`text-[11px] ${isPremium ? 'text-slate-400' : 'text-stone-500'}`}>
                          per pass
                        </div>
                      </div>
                    </div>

                    <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                      {((tt.perks as string[]) || []).map((perk, idx) => (
                        <li key={idx} className={`flex items-center gap-2 text-xs ${isPremium ? 'text-slate-200' : 'text-stone-700'}`}>
                          <CheckCircle2 className={`h-4 w-4 shrink-0 ${isPremium ? 'text-amber-400' : 'text-emerald-700'}`} />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>

                    <div className={`mt-5 flex items-center justify-between gap-4 border-t pt-4 ${isPremium ? 'border-white/15' : 'border-stone-200'}`}>
                      <span className={`text-xs font-bold ${isPremium ? 'text-amber-300' : 'text-amber-800'}`}>
                        {available > 0 ? `${available} seats left` : 'Sold Out'}
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={`Decrease ${String(tt.name)}`}
                          disabled={qty <= 0}
                          onClick={() => adjustQuickQty(id, -1, maxAllowed)}
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border transition disabled:opacity-35 ${
                            isPremium
                              ? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
                              : 'border-stone-300 bg-stone-50 text-stone-900 hover:bg-stone-100'
                          }`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-7 text-center text-lg font-extrabold">{qty}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${String(tt.name)}`}
                          disabled={available <= 0 || qty >= maxAllowed}
                          onClick={() => adjustQuickQty(id, 1, maxAllowed)}
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border transition disabled:opacity-35 ${
                            isPremium
                              ? 'border-amber-400 bg-amber-400 text-slate-950 hover:bg-amber-300'
                              : 'border-stone-900 bg-stone-900 text-white hover:bg-amber-800'
                          }`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Clean Checkout Action Card */}
              <div className="flex flex-col justify-between gap-4 rounded-3xl border-2 border-amber-500/40 bg-[#060f2b] p-5 text-white shadow-lg sm:flex-row sm:items-center sm:p-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    {quickTotalCount > 0
                      ? `${quickTotalCount} Pass${quickTotalCount > 1 ? 'es' : ''} Selected`
                      : 'Tap + above to select passes'}
                  </div>
                  <div className="mt-0.5 text-2xl font-black">
                    {quickTotalCount > 0 ? formatCurrency(quickSubtotal) : `From ${formatCurrency(lowestPrice)}`}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Have a promo code? Use <span className="font-mono font-bold text-amber-300">SANATANAM10</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={reserving}
                  onClick={handleInstantReserve}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-md hover:brightness-105 disabled:opacity-50"
                >
                  <Ticket className="h-4 w-4" />
                  {reserving
                    ? 'Holding Seats...'
                    : quickTotalCount > 0
                      ? 'Continue to Details'
                      : 'Go to Ticket Page'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Interactive Visual Switcher: Floor Plan Map vs. Live QR Pass Preview */}
            <div className="space-y-4 lg:order-1 lg:col-span-5">
              <div className="flex gap-1.5 rounded-2xl border border-amber-900/15 bg-white p-1.5 text-xs font-bold shadow-sm">
                <button
                  type="button"
                  onClick={() => setVisualMode('map')}
                  className={`flex-1 rounded-xl py-2.5 transition ${
                    visualMode === 'map'
                      ? 'bg-[#060f2b] text-amber-300 shadow'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Venue Floor Plan
                </button>
                <button
                  type="button"
                  onClick={() => setVisualMode('pass')}
                  className={`flex-1 rounded-xl py-2.5 transition ${
                    visualMode === 'pass'
                      ? 'bg-[#060f2b] text-amber-300 shadow'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Preview Your QR Pass
                </button>
              </div>

              {visualMode === 'map' ? (
                <div
                  onClick={() =>
                    setZoomedPoster({
                      src: floorPlanPoster,
                      title: '250 ft × 250 ft Venue Floor Plan & Zone Pricing',
                    })
                  }
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-amber-700/30 bg-[#071130] shadow-lg"
                >
                  <img
                    src="/assets/event/moments/grand-arena-plan.png"
                    alt="Exhibition Grounds 250ft × 250ft Floor Plan"
                    className="w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/90 px-3 py-1.5 text-xs font-semibold text-amber-300">
                    <ZoomIn className="h-3.5 w-3.5" /> Zoom Map
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-[#060f2b] via-[#0b1942] to-[#1a1308] p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-sacred text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                      Sample Digital Entry Pass
                    </span>
                    <div className="flex gap-1 rounded-full bg-white/10 p-0.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPreviewTier('PREMIUM')}
                        className={`rounded-full px-2.5 py-0.5 ${
                          previewTier === 'PREMIUM' ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
                        }`}
                      >
                        VIP
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTier('REGULAR')}
                        className={`rounded-full px-2.5 py-0.5 ${
                          previewTier === 'REGULAR' ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
                        }`}
                      >
                        Regular
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 border-y border-white/10 py-4">
                    <div>
                      <div className="font-sacred text-lg font-bold text-amber-200">Night of Devotion</div>
                      <div className="text-[11px] text-slate-300">నిరంతరం సనాతనం • Dec 5, 2026</div>
                      <div className="mt-3 text-[10px] uppercase tracking-wider text-slate-400">Attendee</div>
                      <div className="text-base font-bold text-white">Devotee Name</div>
                      <div className="mt-1 inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                        {previewTier === 'PREMIUM' ? 'Premium VIP Zone • ₹1,199' : 'Regular Theater • ₹699'}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-2.5 shadow-inner shrink-0">
                      <QRCodeSVG value="EFO1.SAMPLE.NIGHT-OF-DEVOTION" size={88} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-mono font-bold text-amber-300">EFO-NOD-7K92X1</span>
                    <span>Delivered via WhatsApp &amp; PDF</span>
                  </div>
                </div>
              )}

              {/* Interactive Venue Info Tabs */}
              <div className="rounded-3xl border border-amber-900/15 bg-white p-5 shadow-sm">
                <div className="flex gap-1.5 rounded-xl bg-stone-100 p-1 text-xs font-bold">
                  {[
                    { id: 'zones' as const, label: 'Arena Zones' },
                    { id: 'darshan' as const, label: 'Photo Darshan' },
                    { id: 'gates' as const, label: 'Gates & Entry' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setVenueTab(tab.id)}
                      className={`flex-1 rounded-lg py-2 transition ${
                        venueTab === tab.id
                          ? 'bg-[#060f2b] text-amber-300 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 text-xs leading-relaxed text-stone-700">
                  {venueTab === 'zones' && (
                    <ul className="space-y-1.5">
                      <li>• <strong>Plot Size:</strong> 250 ft × 250 ft (62,500 sq ft) Devotional Arena</li>
                      <li>• <strong>Main Stage:</strong> 50 ft × 20 ft with 30 ft × 10 ft LED Wall</li>
                      <li>• <strong>VIP Zone:</strong> 50 Round Tables (500 Seats) + 10 Stage-Front Sofas</li>
                      <li>• <strong>Theater Zone:</strong> Elevated 1,500-Seat Sanctuary</li>
                    </ul>
                  )}
                  {venueTab === 'darshan' && (
                    <ul className="space-y-1.5">
                      <li>• <strong>Adiyogi Installation:</strong> Illuminated Lord Shiva portrait zone</li>
                      <li>• <strong>Siva Parvati Idol:</strong> Life-size devotional family photo zone</li>
                      <li>• <strong>Vigneswara Zone:</strong> Auspicious Ganesha entrance darshan</li>
                    </ul>
                  )}
                  {venueTab === 'gates' && (
                    <ul className="space-y-1.5">
                      <li>• <strong>Main &amp; Regular Entrances:</strong> QR check-in for Regular Passes (4:30 PM)</li>
                      <li>• <strong>Dedicated VIP Gates:</strong> Express QR lane for Premium Round-Table guests</li>
                      <li>• <strong>Digital Passes:</strong> Keep QR pass ready on phone or PDF printout</li>
                    </ul>
                  )}
                </div>
              </div>

              {event?.venue?.mapsLink && (
                <a
                  href={event.venue.mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-amber-900/20 bg-white py-3 text-xs font-bold text-amber-900 hover:bg-amber-50"
                >
                  <MapPin className="h-4 w-4 text-amber-700" />
                  Open Exhibition Grounds in Google Maps
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Simple FAQ + Sponsorships */}
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-amber-900/15 bg-white p-6 shadow-sm">
              <h3 className="font-display text-2xl font-bold text-stone-900">Common Questions</h3>
              <div className="mt-3 divide-y divide-stone-100">
                {(event?.faqs || []).map((f: { question: string; answer: string }, idx: number) => (
                  <div key={idx} className="py-3">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="flex min-h-[36px] w-full items-center justify-between gap-2 text-left text-sm font-bold text-stone-900"
                    >
                      <span>{f.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-amber-700 transition ${
                          openFaq === idx ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openFaq === idx && (
                      <p className="mt-2 text-xs leading-relaxed text-stone-600">{f.answer}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-stone-100 pt-3 flex flex-wrap gap-3 text-xs text-stone-600">
                {(event?.scheduleItems || []).map((item: { time: string; title: string }, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-stone-50 px-2.5 py-1">
                    <Clock className="h-3 w-3 text-amber-700" /> <strong>{item.time}</strong> {item.title}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-amber-500/40 bg-[#060f2b] p-6 text-white shadow-lg sm:p-7">
              <div>
                <span className="font-sacred text-[11px] font-bold uppercase tracking-widest text-amber-300">
                  Sponsorships, Stalls &amp; Group Passes
                </span>
                <h3 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                  Connect Directly With Our Desk
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Need help with family group tickets, devotional stalls, or brand sponsorships? Our Rajahmundry team is one tap away.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={`tel:${event?.contact?.phone || '+919640509090'}`}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-300"
                >
                  <Phone className="h-4 w-4" /> Call 9640509090
                </a>
                <Link
                  to="/support"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-amber-400/40 px-5 py-3 text-sm font-semibold text-amber-200 hover:bg-white/5"
                >
                  Send Online Message
                </Link>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Invite Family &amp; Friends
                </div>
                <SocialShareBar
                  title={`${event?.name || 'Night of Devotion'} — ${event?.subtitle || 'Nirantaram Sanatanam'}`}
                  text="🙏 Join us at Night of Devotion (Nirantaram Sanatanam) on Dec 5, 2026 at Exhibition Grounds, Rajahmundry for sacred bhajans & diyas! ✨"
                  url={typeof window !== 'undefined' ? window.location.origin : ''}
                  variant="dark"
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. LUXURY SPONSORS & OFFICIAL PARTNERS PAVILION
      ===================================================================== */}
      {(() => {
        const partnersList =
          event?.partners && event.partners.length > 0
            ? (event.partners as Array<{ category: string; name: string; logoUrl?: string }>)
            : [
                { category: 'Organised By', name: 'Vybe', logoUrl: '/assets/event/sponsors/vybe.png' },
                { category: 'Organised By', name: 'Inspire Events', logoUrl: '/assets/event/sponsors/inspire.png' },
                { category: 'Organised By', name: 'Sri Megaa Events', logoUrl: '/assets/event/sponsors/megaa.png' },
                { category: 'Makeover Partner', name: 'BornPretty', logoUrl: '/assets/event/sponsors/bornpretty.png' },
                { category: 'Radio Partner', name: 'RED FM 93.5', logoUrl: '/assets/event/sponsors/redfm.png' },
                { category: 'Photography Partner', name: 'RC Studios', logoUrl: '/assets/event/sponsors/rcstudios.png' },
                { category: 'Marketing Partner', name: 'One Ad Agency', logoUrl: '/assets/event/sponsors/onead.png' },
              ];
        const organisers = partnersList.filter((p) => /organis|present|title/i.test(p.category));
        const officialPartners = partnersList.filter((p) => !/organis|present|title/i.test(p.category));

        return (
          <section
            id="sponsors"
            className="relative overflow-hidden border-t border-amber-400/30 bg-gradient-to-b from-[#04091b] via-[#071234] to-[#030716] py-14 text-white sm:py-20"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.18),transparent_55%),radial-gradient(circle_at_85%_90%,rgba(217,119,6,0.12),transparent_45%)]" />

            <div className="relative mx-auto max-w-6xl px-4">
              {/* Header */}
              <div className="mx-auto max-w-2xl text-center">
                <span className="font-sacred inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300 shadow-sm">
                  <GoldShulamIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>అధికారిక భాగస్వాములు • Official Sponsors &amp; Partners</span>
                </span>
                <h2 className="font-display mt-3 bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-400 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                  Proudly Presented &amp; Supported By
                </h2>
                <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                  Crafted in collaboration with Rajamahendravaram’s premier cultural organisers, media, and creative partners.
                </p>
              </div>

              {/* Organising Row */}
              {organisers.length > 0 && (
                <div className="mt-10">
                  <div className="mb-4 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/90">
                    <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/50" />
                    <span>Organised By</span>
                    <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/50" />
                  </div>

                  <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
                    {organisers.map((p, idx) => (
                      <motion.div
                        key={`org-${idx}`}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.22 }}
                        className="group relative flex flex-col items-center justify-between rounded-3xl border border-amber-400/35 bg-gradient-to-b from-[#0d1c47]/95 to-[#060f2b] p-4 text-center shadow-xl transition hover:border-amber-300/75 hover:shadow-amber-500/15"
                      >
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300">
                          {p.category}
                        </span>
                        <div className="my-3 flex h-20 w-full items-center justify-center rounded-2xl bg-white/95 p-2.5 shadow-inner ring-1 ring-amber-300/40">
                          {p.logoUrl ? (
                            <img
                              src={p.logoUrl}
                              alt={p.name}
                              className="max-h-14 w-auto max-w-full object-contain transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <span className="text-sm font-extrabold text-slate-900">{p.name}</span>
                          )}
                        </div>
                        <div className="text-xs font-bold tracking-wide text-amber-100 sm:text-sm">
                          {p.name}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Event Partners */}
              {officialPartners.length > 0 && (
                <div className="mt-10">
                  <div className="mb-4 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/90">
                    <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/50" />
                    <span>Official Event Partners</span>
                    <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/50" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {officialPartners.map((p, idx) => (
                      <motion.div
                        key={`partner-${idx}`}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.22 }}
                        className="group flex flex-col items-center justify-between rounded-2xl border border-amber-400/25 bg-[#0a1638]/90 p-3.5 text-center shadow-lg transition hover:border-amber-300/60"
                      >
                        <div className="text-[9px] font-bold uppercase tracking-widest text-amber-300/90">
                          {p.category}
                        </div>
                        <div className="my-2.5 flex h-16 w-full items-center justify-center rounded-xl bg-white/95 p-2 shadow-inner ring-1 ring-amber-200/30">
                          {p.logoUrl ? (
                            <img
                              src={p.logoUrl}
                              alt={p.name}
                              className="max-h-12 w-auto max-w-full object-contain transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-900">{p.name}</span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-100">{p.name}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sponsor Inquiry Strip */}
              <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-400/25 bg-white/[0.04] px-5 py-4 text-center backdrop-blur sm:flex-row sm:text-left">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Partner With Night of Devotion
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Interested in event branding, devotional stalls, or corporate VIP tables?
                  </p>
                </div>
                <Link
                  to="/support"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/15 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400 hover:text-slate-950"
                >
                  Sponsor Inquiry <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Mobile Sticky Quick-Book Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-amber-500/30 bg-[#050b21]/95 px-4 py-3 text-white backdrop-blur sm:hidden">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-amber-300">Dec 5 • Rajahmundry</div>
          <div className="text-sm font-extrabold">Passes from {formatCurrency(lowestPrice)}</div>
        </div>
        <a
          href="#reserve-passes"
          className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow"
        >
          Book Passes
        </a>
      </div>

      {/* Poster Lightbox */}
      {zoomedPoster && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setZoomedPoster(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-amber-400/40 bg-slate-950 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-amber-200">
              <span className="truncate pr-2">{zoomedPoster.title}</span>
              <button
                onClick={() => setZoomedPoster(null)}
                className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img src={zoomedPoster.src} alt={zoomedPoster.title} className="w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}

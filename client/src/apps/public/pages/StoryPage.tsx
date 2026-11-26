import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Flame,
  Heart,
  MapPin,
  Music,
  Phone,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { usePublicEvent } from '../layouts/PublicLayout';
import { DevotionalVideoReel } from '../components/DevotionalVideoReel';
import { GoldShulamIcon } from '../components/GoldShulamIcon';

const CHAPTERS = [
  {
    num: 'Chapter I',
    time: '04:30 PM • Twilight Arrival',
    title: 'Leaving the Noise Behind',
    telugu: 'రాజమండ్రి గోదావరి తీరంలో... ఒక ప్రశాంత ఆధ్యాత్మిక సాయంత్రం',
    body: 'Every week passes in hurried traffic, notifications, and endless schedules. On December 5th, as twilight softens over Exhibition Grounds beside A.V. Apparao Road, step inside a serene 62,500 sq ft sanctuary scented with jasmine, sandalwood, and warm brass diyas.',
    quote: '“When the first temple bell rings, the rush of the outside world falls quiet.”',
    image: '/assets/event/moments/sacred-diya-temple.png',
    icon: Flame,
  },
  {
    num: 'Chapter II',
    time: '05:15 PM • Sacred Darshan Walk',
    title: 'Moments Before the Music Begins',
    telugu: 'ఆదియోగి, శివపార్వతి & విఘ్నేశ్వర దర్శన ప్రాంగణాలు',
    body: 'Before taking your seat, walk unhurriedly with your parents, children, and friends through life-size sacred installations of Adiyogi, Siva Parvati, and Vigneswara — spaces crafted for quiet prayer and family memories you will keep for years.',
    quote: '“Hold a glowing brass diya with your loved ones and feel gratitude rise naturally.”',
    image: '/assets/event/gallery/diya-aarti-emotion.jpg',
    icon: Sparkles,
  },
  {
    num: 'Chapter III',
    time: '06:00 PM • Live Concert Begins',
    title: 'Hari Teja & Hari Nithya — Bhajan Immersion',
    telugu: 'మనసుకు ప్రశాంతతనిచ్చే భజనాలు, మనసును భక్తిలో ముంచెత్తే సంగీతం!',
    body: 'Under a 50-foot temple-arched stage and starry Rajahmundry sky, Hari Teja & Hari Nithya awaken timeless Sanatan melodies — gracefully woven together by evening host Snigdha Nayani. Every note invites stillness, smiles, and heartfelt devotion.',
    quote: '“Music that doesn’t merely entertain the ear — it calms the heart.”',
    image: '/assets/event/gallery/stage-bhajan-sanctuary.jpg',
    icon: Music,
  },
  {
    num: 'Chapter IV',
    time: '08:00 PM • Bhajan Jamming',
    title: 'Two Thousand Voices Singing as One',
    telugu: 'ఒక సాయంత్రం... ఎన్నో భక్తి అనుభూతులు!',
    body: 'This is the moment people talk about long after December 5th ends: hands raised in rhythm, elders smiling beside youth, everyone clapping and singing bhajans in unison — Bhajan Jamming that turns strangers into one spiritual family.',
    quote: '“Nirantaram Sanatanam — timeless devotion carried home in every heart.”',
    image: '/assets/event/gallery/bhajan-crowd-joy.jpg',
    icon: Users,
  },
];

export function StoryPage() {
  const { data: event } = usePublicEvent();

  return (
    <div className="bg-[#04091b] text-slate-100">
      {/* STORY HERO */}
      <section className="relative overflow-hidden border-b border-amber-400/20 py-14 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(245,158,11,0.22),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="font-sacred inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">
              <GoldShulamIcon className="h-3.5 w-3.5 shrink-0" />
              <span>The Story Behind {event?.name || 'Night of Devotion'}</span>
            </div>

            <h1 className="font-sacred mt-5 bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-500 bg-clip-text text-3xl font-extrabold leading-tight text-transparent sm:text-5xl lg:text-6xl">
              Why We Gather on December 5th
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              In Telugu and classical tradition, <strong className="text-amber-200">నిరంతరం (Nirantaram)</strong> means <em>unceasing, unbroken flow</em>, and <strong className="text-amber-200">సనాతనం (Sanatanam)</strong> means <em>the eternal without beginning or end</em>. Together, <strong className="text-amber-200">నిరంతరం సనాతనం — “The Everlasting Eternal”</strong> — brings Rajamahendravaram one serene evening where grandparents, parents, and youth light a diya together and lose themselves in live bhajans.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/tickets"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-7 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg hover:brightness-105"
              >
                <Ticket className="h-4 w-4" /> Reserve Your Family Seats <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#story-video"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-amber-400/35 bg-white/5 px-6 py-3.5 text-sm font-semibold text-amber-100 hover:bg-white/10"
              >
                Watch Story Reel
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* DEVOTIONAL STORYTELLING CHAPTERS (Temple Ivory Editorial Canvas) */}
      <section className="bg-[#fbf6ec] py-14 text-stone-900 sm:py-20">
        <div className="mx-auto max-w-6xl space-y-16 px-4">
          {CHAPTERS.map((ch, idx) => {
            const Icon = ch.icon;
            const reversed = idx % 2 === 1;
            return (
              <motion.div
                key={ch.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45 }}
                className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12"
              >
                <div className={`lg:col-span-6 ${reversed ? 'lg:order-2' : ''}`}>
                  <div className="group relative overflow-hidden rounded-[28px] border-2 border-amber-800/20 bg-stone-900 shadow-xl">
                    <img
                      src={ch.image}
                      alt={ch.title}
                      className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur">
                      <Icon className="h-3.5 w-3.5" /> {ch.num}
                    </div>
                  </div>
                </div>

                <div className={`space-y-4 lg:col-span-6 ${reversed ? 'lg:order-1' : ''}`}>
                  <div className="font-sacred text-xs font-bold uppercase tracking-widest text-amber-800">
                    {ch.time}
                  </div>
                  <h2 className="font-display text-3xl font-bold text-stone-900 sm:text-4xl">
                    {ch.title}
                  </h2>
                  <p className="text-sm font-semibold text-amber-900">{ch.telugu}</p>
                  <p className="text-sm leading-relaxed text-stone-700 sm:text-base">{ch.body}</p>
                  <blockquote className="rounded-2xl border-l-4 border-amber-600 bg-white px-5 py-3.5 font-display text-lg italic text-stone-800 shadow-sm">
                    {ch.quote}
                  </blockquote>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SAMPLE VIDEO & EMOTIONAL CONVERSION FINALE */}
      <section id="story-video" className="bg-[#060f2b] py-16 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-400">
              <Heart className="h-4 w-4" /> Experience the Mood
            </div>
            <h2 className="font-display mt-2 text-3xl font-bold text-white sm:text-4xl">
              Watch the Devotional Journey Come Alive
            </h2>
          </div>

          <DevotionalVideoReel />

          <div className="mt-10 flex flex-col items-center justify-between gap-6 rounded-3xl border border-amber-400/35 bg-gradient-to-r from-[#0b183d] via-[#10204d] to-[#0b183d] p-7 text-center sm:flex-row sm:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-amber-300 sm:justify-start">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Dec 5, 2026 • 6 PM</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Exhibition Grounds, Rajahmundry</span>
              </div>
              <h3 className="font-display mt-2 text-2xl font-bold text-white sm:text-3xl">
                Bring Your Parents, Family &amp; Friends
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                Regular Theater Passes ₹699 • VIP Round-Table Passes ₹1,199 • Use promo <span className="font-mono font-bold text-amber-300">SANATANAM10</span>
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row shrink-0">
              <Link
                to="/tickets"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-300"
              >
                Book Passes Now <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="tel:+919640509090"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-amber-400/40 px-4 py-3 text-xs font-bold text-amber-200 hover:bg-white/5"
              >
                <Phone className="h-4 w-4" /> 9640509090
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

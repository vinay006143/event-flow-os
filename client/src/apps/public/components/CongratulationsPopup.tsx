import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Sparkles, X } from 'lucide-react';
import { GoldShulamIcon } from './GoldShulamIcon';

interface CongratulationsPopupProps {
  open: boolean;
  onClose: () => void;
  bookingReference: string;
  ticketCount: number;
  primarySecureReference?: string;
  eventName?: string;
}

const CRACKER_PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i * 20 * Math.PI) / 180;
  const dist = i % 2 === 0 ? 118 : 88;
  const colors = ['#FDE047', '#F59E0B', '#FB7185', '#34D399', '#FBBF24'];
  return {
    id: i,
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    size: i % 3 === 0 ? 7 : 5,
    color: colors[i % colors.length]!,
    delay: (i % 4) * 0.04,
  };
});

export function CongratulationsPopup({
  open,
  onClose,
  bookingReference,
  ticketCount,
  primarySecureReference,
  eventName = 'Night of Devotion',
}: CongratulationsPopupProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="congrats-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Compact Celebration Jewel-Box Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border-2 border-amber-400/70 bg-gradient-to-b from-[#071133] via-[#050b21] to-[#030712] p-6 text-center text-white shadow-2xl shadow-amber-500/25"
          >
            {/* Gold Top Hairline */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close popup"
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Firecracker Burst + Sacred Gold Shulam Seal */}
            <div className="relative mx-auto mt-2 flex h-28 w-28 items-center justify-center">
              {/* Expanding Festive Shockwave Rings */}
              <motion.span
                initial={{ scale: 0.3, opacity: 0.9 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.4, ease: 'easeOut' }}
                className="pointer-events-none absolute h-14 w-14 rounded-full border-2 border-amber-300"
              />
              <motion.span
                initial={{ scale: 0.4, opacity: 0.8 }}
                animate={{ scale: 2.6, opacity: 0 }}
                transition={{ duration: 1.2, delay: 0.18, repeat: Infinity, repeatDelay: 1.4, ease: 'easeOut' }}
                className="pointer-events-none absolute h-14 w-14 rounded-full border border-rose-400/70"
              />

              {/* Radiating Firecracker Sparks */}
              {CRACKER_PARTICLES.map((p) => (
                <motion.span
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: [0, p.x * 0.75, p.x],
                    y: [0, p.y * 0.75, p.y + 12],
                    scale: [0, 1.35, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.15,
                    delay: p.delay,
                    repeat: Infinity,
                    repeatDelay: 1.35,
                    ease: 'easeOut',
                  }}
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    boxShadow: `0 0 8px ${p.color}`,
                  }}
                  className="pointer-events-none absolute rounded-full"
                />
              ))}

              {/* Center Medallion */}
              <motion.div
                initial={{ rotate: -12, scale: 0.75 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-[#0f1f4d] to-[#040817] shadow-xl shadow-amber-500/35"
              >
                <GoldShulamIcon className="h-10 w-10 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]" />
              </motion.div>
            </div>

            <div className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              <Sparkles className="h-3 w-3" /> Booking Confirmed
            </div>

            <h2
              id="congrats-heading"
              className="font-display mt-2.5 bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-400 bg-clip-text text-2xl font-extrabold text-transparent"
            >
              శుభాకాంక్షలు! Congratulations!
            </h2>

            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Your {ticketCount} sacred pass{ticketCount > 1 ? 'es' : ''} for{' '}
              <strong className="text-amber-200">{eventName}</strong> {ticketCount > 1 ? 'are' : 'is'} ready.
            </p>

            <div className="mt-3 inline-block rounded-xl border border-amber-400/30 bg-white/5 px-3.5 py-1.5 font-mono text-xs font-bold tracking-wider text-amber-200">
              {bookingReference}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg transition hover:brightness-105"
              >
                View My 8:14 Passes
              </button>

              {primarySecureReference && (
                <a
                  href={`/api/v1/tickets/pass/${primarySecureReference}/download?format=png`}
                  className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-white/10"
                >
                  <Download className="h-3.5 w-3.5" /> Save 8:14 Image
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

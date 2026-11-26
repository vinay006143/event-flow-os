import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GoldShulamIcon } from './GoldShulamIcon';

export function SacredWelcomePreloader() {
  const [visible, setVisible] = useState(() => {
    try {
      return !sessionStorage.getItem('efo_welcome_seen');
    } catch {
      return true;
    }
  });

  const dismiss = () => {
    try {
      sessionStorage.setItem('efo_welcome_seen', '1');
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 2300);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.65, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#040817] px-6 text-center text-white"
        >
          {/* Warm Diya Radial Aura */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.22),transparent_58%)]" />

          {/* Sacred Rotating Mandala Ring + Gold Shulam Crest */}
          <motion.div
            initial={{ scale: 0.84, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative flex h-28 w-28 items-center justify-center"
          >
            <motion.svg
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
              viewBox="0 0 120 120"
              className="absolute inset-0 h-full w-full text-amber-400/55"
              fill="none"
            >
              <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="1" strokeDasharray="4 5" />
              <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="0.9" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <circle
                  key={deg}
                  cx={60 + 54 * Math.cos((deg * Math.PI) / 180)}
                  cy={60 + 54 * Math.sin((deg * Math.PI) / 180)}
                  r="2.2"
                  fill="currentColor"
                />
              ))}
            </motion.svg>

            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/60 bg-gradient-to-br from-[#0f1f4d] via-[#081336] to-[#04091b] shadow-2xl shadow-amber-500/35">
              <GoldShulamIcon className="h-10 w-10 drop-shadow-[0_0_10px_rgba(251,191,36,0.55)]" />
            </div>
          </motion.div>

          {/* Bilingual Welcome Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="relative mt-6 max-w-md"
          >
            <p className="text-sm font-semibold text-amber-300 sm:text-base">
              స్వాగతం • Welcome to a Sacred Evening
            </p>
            <h1 className="font-sacred mt-2 bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-500 bg-clip-text text-3xl font-extrabold tracking-wider text-transparent sm:text-4xl">
              NIGHT OF DEVOTION
            </h1>
            <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.26em] text-amber-200/85">
              నిరంతరం సనాతనం • Nirantaram Sanatanam
            </p>
            <p className="mt-2 text-xs text-slate-400">
              December 5, 2026 • Exhibition Grounds, Rajahmundry
            </p>
          </motion.div>

          {/* Golden Loading Shimmer Bar */}
          <div className="relative mt-7 h-1 w-52 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.1, ease: 'easeInOut' }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400"
            />
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="relative mt-6 text-[11px] font-semibold uppercase tracking-widest text-slate-400 transition hover:text-amber-300"
          >
            Enter Now →
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

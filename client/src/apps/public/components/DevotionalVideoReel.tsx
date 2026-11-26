import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ReelScene {
  id: string;
  num: string;
  shortLabel: string;
  label: string;
  image: string;
  kicker: string;
  title: string;
  caption: string;
  durationMs: number;
}

const REEL_SCENES: ReelScene[] = [
  {
    id: 'invocation',
    num: '01',
    shortLabel: 'Aarti Diyas',
    label: '01 Aarti Diyas',
    image: '/assets/event/gallery/diya-aarti-emotion.jpg',
    kicker: '5th December 2026 • Twilight at Rajahmundry',
    title: 'Light the First Diya With Family',
    caption: 'Warm brass oil lamps, jasmine, and peaceful prayers as evening settles.',
    durationMs: 6500,
  },
  {
    id: 'stage',
    num: '02',
    shortLabel: 'Grand Stage',
    label: '02 Grand Stage',
    image: '/assets/event/gallery/stage-bhajan-sanctuary.jpg',
    kicker: 'Nirantaram Sanatanam • 62,500 sq ft Sanctuary',
    title: 'Sacred Temple Stage & Live Ensemble',
    caption: 'A 50-ft temple-arched stage with VIP Round Tables & elevated Theater Seating.',
    durationMs: 6500,
  },
  {
    id: 'artists',
    num: '03',
    shortLabel: 'Sacred Voices',
    label: '03 Sacred Voices',
    image: '/assets/event/guests/hari-teja-nithya.png',
    kicker: 'Featuring Hari Teja & Hari Nithya',
    title: 'Soul-Soothing Bhajans & Devotional Melodies',
    caption: 'Live classical & bhajan performances anchored gracefully by Snigdha Nayani.',
    durationMs: 6500,
  },
  {
    id: 'bhajan-joy',
    num: '04',
    shortLabel: 'Bhajan Joy',
    label: '04 Bhajan Joy',
    image: '/assets/event/gallery/bhajan-crowd-joy.jpg',
    kicker: 'One Evening… Many Devotional Experiences',
    title: '2,000 Hearts Singing Together in Bliss',
    caption: 'Hands raised in Bhajan Jamming — reserve your family seats today.',
    durationMs: 6500,
  },
];

export function DevotionalVideoReel() {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const currentScene = REEL_SCENES[sceneIdx]!;

  const goToScene = (idx: number) => {
    const normalized = (idx + REEL_SCENES.length) % REEL_SCENES.length;
    setSceneIdx(normalized);
    setProgress(0);
  };

  // Advance scenes smoothly when playing
  useEffect(() => {
    if (!playing) return;
    const stepMs = 80;
    const id = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (stepMs / currentScene.durationMs) * 100;
        if (next >= 100) {
          setSceneIdx((i) => (i + 1) % REEL_SCENES.length);
          return 0;
        }
        return next;
      });
    }, stepMs);
    return () => clearInterval(id);
  }, [playing, currentScene.durationMs]);

  // Ambient subtle golden diya embers particle canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const embers = Array.from({ length: 28 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1 + Math.random() * 2.2,
      vy: 0.25 + Math.random() * 0.55,
      vx: (Math.random() - 0.5) * 0.35,
      alpha: 0.25 + Math.random() * 0.55,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (playing) {
        for (const e of embers) {
          e.y -= e.vy;
          e.x += e.vx;
          if (e.y < -6) {
            e.y = canvas.height + 6;
            e.x = Math.random() * canvas.width;
          }
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(251, 191, 36, ${e.alpha})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Optional soothing harmonic Tanpura drone when user unmutes
  const toggleSound = () => {
    if (muted) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) {
          const ctx = new AudioCtx();
          const master = ctx.createGain();
          master.gain.value = 0.04;
          master.connect(ctx.destination);

          // Sa - Pa - Sa gentle harmonic drone (146.83Hz D3, 220Hz A3, 293.66Hz D4)
          [146.83, 220.0, 293.66].forEach((freq) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(master);
            osc.start();
          });
          audioCtxRef.current = ctx;
          gainRef.current = master;
        } else {
          audioCtxRef.current.resume();
          if (gainRef.current) gainRef.current.gain.value = 0.04;
        }
        setMuted(false);
      } catch {
        setMuted(true);
      }
    } else {
      if (gainRef.current) gainRef.current.gain.value = 0;
      setMuted(true);
    }
  };

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  const totalProgress = ((sceneIdx + progress / 100) / REEL_SCENES.length) * 100;

  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-[#050b21] shadow-2xl shadow-amber-950/30 sm:rounded-3xl lg:rounded-[28px]">
      {/* 1. Unobstructed 16:9 Visual Stage (Mobile, Tablet & Desktop) */}
      <div className="group relative aspect-video w-full overflow-hidden bg-[#040817]">
        {REEL_SCENES.map((scene, idx) => {
          const active = idx === sceneIdx;
          return (
            <img
              key={scene.id}
              src={scene.image}
              alt={scene.title}
              className={`absolute inset-0 h-full w-full object-cover ${
                scene.id === 'artists' ? 'object-top' : 'object-center'
              } transition-all duration-1000 ease-out ${
                active
                  ? playing
                    ? 'scale-105 opacity-100'
                    : 'scale-100 opacity-100'
                  : 'scale-100 opacity-0'
              }`}
            />
          );
        })}

        {/* Atmospheric vignette & floating golden diya embers */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050b21] via-transparent to-[#040817]/55" />
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Top Bar: Teaser Badge + Audio Toggle */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-2.5 sm:p-4">
          <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-amber-400/45 bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md sm:px-3.5 sm:py-1.5 sm:text-[11px] sm:tracking-widest">
            <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
            <span className="truncate sm:hidden">Teaser • {currentScene.num}/04</span>
            <span className="hidden sm:inline">Official Event Teaser Reel</span>
          </div>

          <button
            type="button"
            onClick={toggleSound}
            className="inline-flex min-h-[34px] shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-white/25 bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md transition hover:bg-slate-900 active:scale-95 sm:px-3.5 sm:py-1.5"
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            )}
            <span className="sm:hidden">{muted ? 'Sound Off' : 'Tanpura On'}</span>
            <span className="hidden sm:inline">{muted ? 'Enable Tanpura Drone' : 'Tanpura Playing'}</span>
          </button>
        </div>

        {/* Center Play/Pause Trigger (Always visible when paused, hover-revealed on desktop when playing) */}
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause teaser' : 'Play teaser'}
          className={`absolute inset-0 z-[5] flex items-center justify-center transition-opacity duration-300 ${
            playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 bg-slate-950/30'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/60 bg-slate-950/80 text-amber-300 shadow-xl backdrop-blur-md transition hover:scale-105 sm:h-14 sm:w-14">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </span>
        </button>
      </div>

      {/* 2. Cinema Progress Bar (Clickable segment scrub) */}
      <div className="grid grid-cols-4 gap-1 bg-[#040817] px-3 pt-2.5 sm:px-6 sm:pt-3">
        {REEL_SCENES.map((scene, idx) => {
          const fillPct = idx < sceneIdx ? 100 : idx === sceneIdx ? progress : 0;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => goToScene(idx)}
              aria-label={`Jump to ${scene.label}`}
              className="group/bar py-1.5 touch-manipulation text-left"
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15 transition group-hover/bar:bg-white/25">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-100"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Responsive Story & Control Deck (Cleanly structured on Mobile, Tablet & Desktop) */}
      <div className="bg-gradient-to-b from-[#050b21] to-[#081336] p-4 sm:p-5 lg:p-6">
        {/* Scene Kicker + Title + Action Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300 sm:text-[11px] sm:tracking-[0.2em]">
              {currentScene.kicker}
            </div>
            <h3 className="font-display mt-1 text-lg font-bold leading-snug text-white sm:text-2xl lg:text-[26px]">
              {currentScene.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
              {currentScene.caption}
            </p>
          </div>

          {/* Playback + Book Seat Controls */}
          <div className="flex shrink-0 items-center justify-between gap-2 pt-1 sm:justify-end sm:pt-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToScene(sceneIdx - 1)}
                aria-label="Previous scene"
                className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/15 active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause teaser' : 'Play teaser'}
                className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition hover:bg-amber-300 active:scale-95"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => goToScene(sceneIdx + 1)}
                aria-label="Next scene"
                className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/15 active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Link
              to="/tickets"
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-xs font-extrabold text-slate-950 shadow transition hover:bg-amber-100 sm:flex-initial sm:px-5"
            >
              <span>Book Seat</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Scene Chapters: 2x2 on Mobile, 4-Column Bar on Tablet & Desktop */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REEL_SCENES.map((scene, idx) => {
            const active = idx === sceneIdx;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => goToScene(idx)}
                className={`flex min-h-[42px] touch-manipulation items-center gap-2 rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] ${
                  active
                    ? 'border-amber-400 bg-amber-400/15 text-amber-200 shadow-sm'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold ${
                    active ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-amber-300'
                  }`}
                >
                  {scene.num}
                </span>
                <span className="min-w-0 truncate text-[11px] font-bold sm:text-xs">
                  {scene.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subtle progress readout */}
        <div className="sr-only" aria-live="polite">
          Scene {sceneIdx + 1} of {REEL_SCENES.length}: {currentScene.title} ({Math.round(totalProgress)}%)
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Check, Copy, Instagram, Link2, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface SocialShareBarProps {
  title?: string;
  text: string;
  url: string;
  privatePassUrl?: string;
  variant?: 'light' | 'dark';
  compact?: boolean;
}

/**
 * Generates a lightweight 9:16 Story PNG for WhatsApp Status / Instagram Story without exposing gate QR.
 */
async function buildSacredStoryPngFile(title: string, inviteUrl: string): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const grad = ctx.createLinearGradient(0, 0, 0, 1920);
  grad.addColorStop(0, '#040817');
  grad.addColorStop(0.55, '#081336');
  grad.addColorStop(1, '#030712');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetH = 840;
      const scale = Math.max(1080 / img.width, targetH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, (1080 - drawW) / 2, 0, drawW, drawH);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = '/assets/event/moments/shiva-invocation.png';
  });

  const fade = ctx.createLinearGradient(0, 0, 0, 900);
  fade.addColorStop(0, 'rgba(4,8,23,0.45)');
  fade.addColorStop(0.45, 'rgba(4,8,23,0.12)');
  fade.addColorStop(1, '#06102d');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 1080, 900);

  ctx.strokeStyle = 'rgba(251,191,36,0.75)';
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, 1008, 1848);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FDE047';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText('✨ ATTENDING NIGHT OF DEVOTION ✨', 540, 980);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 68px Georgia, serif';
  ctx.fillText('NIRANTARAM SANATANAM', 540, 1070);

  ctx.fillStyle = '#FBF6EC';
  ctx.fillRect(108, 1180, 864, 380);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4;
  ctx.strokeRect(108, 1180, 864, 380);

  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText('SATURDAY • DEC 5, 2026 • 6:00 PM', 540, 1270);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 38px Georgia, serif';
  ctx.fillText('Exhibition Grounds, Rajahmundry', 540, 1345);

  ctx.fillStyle = '#B45309';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(`Passes: ${inviteUrl}`, 540, 1455);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText(title, 540, 1770);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png', 0.95),
  );
  return new File([blob], 'night-of-devotion-story-9x16.png', { type: 'image/png' });
}

export function SocialShareBar({
  title = 'Night of Devotion — Nirantaram Sanatanam',
  text,
  url,
  privatePassUrl,
  variant = 'light',
}: SocialShareBarProps) {
  const [copied, setCopied] = useState<'invite' | 'pass' | null>(null);
  const [busy, setBusy] = useState(false);

  const isDark = variant === 'dark';
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const whatsappText = encodeURIComponent(`${text} ${url}`);

  const copyText = async (value: string, kind: 'invite' | 'pass', msg: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(msg);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error('Unable to copy');
    }
  };

  const handleStory = async (label: string) => {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(`${text} ${url}`).catch(() => undefined);
      const file = await buildSacredStoryPngFile(title, url.replace(/^https?:\/\//, ''));

      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text: `${text} ${url}` });
        return;
      }

      const blobUrl = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'night-of-devotion-story-9x16.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success(`9:16 Story saved & caption copied for ${label}`);
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toast.error('Could not create story card');
      }
    } finally {
      setBusy(false);
    }
  };

  const pillCls = isDark
    ? 'border-white/15 bg-white/10 text-slate-100 hover:bg-white/15'
    : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <a
        href={`https://wa.me/?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[34px] touch-manipulation items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-500 active:scale-95"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </a>

      <button
        type="button"
        disabled={busy}
        onClick={() => handleStory('Instagram / Status')}
        className="inline-flex min-h-[34px] touch-manipulation items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 px-3 py-1 text-[11px] font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-60"
      >
        <Instagram className="h-3.5 w-3.5" />
        9:16 Story
      </button>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex min-h-[34px] touch-manipulation items-center rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95 ${pillCls}`}
      >
        Facebook
      </a>

      <a
        href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex min-h-[34px] touch-manipulation items-center rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95 ${pillCls}`}
      >
        X
      </a>

      <button
        type="button"
        onClick={async () => {
          if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
              await navigator.share({ title, text, url });
              return;
            } catch (err) {
              if ((err as Error)?.name === 'AbortError') return;
            }
          }
          await copyText(`${text}\n${url}`, 'invite', 'Invite message copied!');
        }}
        className={`inline-flex min-h-[34px] touch-manipulation items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95 ${pillCls}`}
      >
        {copied === 'invite' ? <Check className="h-3 w-3 text-emerald-500" /> : <Share2 className="h-3 w-3" />}
        {copied === 'invite' ? 'Copied' : 'More'}
      </button>

      <button
        type="button"
        onClick={() => copyText(`${text}\n${url}`, 'invite', 'Invite message copied!')}
        className={`inline-flex min-h-[34px] touch-manipulation items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition active:scale-95 ${pillCls}`}
      >
        <Copy className="h-3 w-3" /> Copy Msg
      </button>

      {privatePassUrl && (
        <button
          type="button"
          onClick={() => copyText(privatePassUrl, 'pass', 'Private QR pass link copied!')}
          className={`inline-flex min-h-[34px] touch-manipulation items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95 ${
            isDark
              ? 'border-amber-400/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25'
              : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
          }`}
        >
          {copied === 'pass' ? <Check className="h-3 w-3 text-emerald-500" /> : <Link2 className="h-3 w-3" />}
          {copied === 'pass' ? 'Pass Copied' : 'Pass Link'}
        </button>
      )}
    </div>
  );
}

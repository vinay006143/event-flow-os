import React from 'react';
import { cn } from '../../lib/utils';

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-stone-200/80 bg-white shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-amber-700 text-white hover:bg-amber-800 shadow-sm',
    secondary: 'bg-stone-900 text-white hover:bg-stone-800',
    outline: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50',
    ghost: 'text-stone-700 hover:bg-stone-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20 disabled:bg-stone-100',
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    gold: 'bg-amber-100 text-amber-900 border-amber-300',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone =
    ['PAID', 'ISSUED', 'VALID', 'COMPLETED', 'ACTIVE', 'SENT', 'DELIVERED', 'RESOLVED'].includes(s)
      ? 'success'
      : ['CHECKED_IN', 'PARTIALLY_REFUNDED'].includes(s)
        ? 'info'
        : ['PENDING', 'PENDING_PAYMENT', 'RESERVED', 'INITIATED', 'IN_PROGRESS', 'QUEUED', 'OPEN', 'CHECKED_OUT'].includes(s)
          ? 'warning'
          : ['FAILED', 'CANCELLED', 'REFUNDED', 'REVOKED', 'EXPIRED', 'SUSPENDED', 'ALREADY_CHECKED_IN', 'INVALID', 'NOT_CHECKED_IN'].includes(s)
            ? 'danger'
            : 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-10 text-center">
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-stone-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

import React, { useId } from 'react';

interface GoldShulamIconProps {
  className?: string;
}

/**
 * Sacred Gold Trishulam (Shulam) emblem SVG for Night of Devotion.
 */
export function GoldShulamIcon({ className = 'h-5 w-5' }: GoldShulamIconProps) {
  const gradId = useId();
  const shineId = useId();

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#FBBF24" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id={shineId} x1="32" y1="3" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="45%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Center Spearhead (Shula) & Vertical Shaft */}
      <path
        d="M32 3L37.2 18.2L34.3 21.5V56.8L32 61L29.7 56.8V21.5L26.8 18.2L32 3Z"
        fill={`url(#${shineId})`}
      />

      {/* Left Curved Trident Wing */}
      <path
        d="M11.8 10.5C8.8 19.6 10.2 28.6 17.2 34.4C21.3 37.8 26.2 38.8 30.2 38.8V33.8C26.4 33.8 22.7 32.6 19.8 29.8C15.8 26 15.2 19.8 16.9 14.5C15.5 13 13.7 11.7 11.8 10.5Z"
        fill={`url(#${gradId})`}
      />

      {/* Right Curved Trident Wing */}
      <path
        d="M52.2 10.5C55.2 19.6 53.8 28.6 46.8 34.4C42.7 37.8 37.8 38.8 33.8 38.8V33.8C37.6 33.8 41.3 32.6 44.2 29.8C48.2 26 48.8 19.8 47.1 14.5C48.5 13 50.3 11.7 52.2 10.5Z"
        fill={`url(#${gradId})`}
      />

      {/* Sacred Collar Ring */}
      <rect x="26.2" y="39.6" width="11.6" height="2.8" rx="1.4" fill={`url(#${shineId})`} />

      {/* Traditional Damaru Accent */}
      <path
        d="M25.5 44H38.5L33.5 47.2L38.5 50.4H25.5L30.5 47.2L25.5 44Z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

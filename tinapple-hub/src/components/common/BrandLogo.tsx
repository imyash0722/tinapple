import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-tinapple-surface via-tinapple-card to-tinapple-dark border border-tinapple-border shadow-lg shadow-tinapple-gold/5 group ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 group-hover:scale-110"
      >
        {/* Upper Facet (Palm / Crown Emerald) */}
        <path
          d="M12 2L17.5 7.5L12 13L6.5 7.5L12 2Z"
          fill="url(#crownGradient)"
          className="opacity-90"
        />
        {/* Lower Facet (Pineapple Core Amber/Gold) */}
        <path
          d="M12 11L17.5 16.5L12 22L6.5 16.5L12 11Z"
          fill="url(#coreGradient)"
          className="opacity-95"
        />
        {/* Center Interlock Glimmer */}
        <circle cx="12" cy="12" r="1.5" fill="#ffffff" className="animate-pulse" />

        <defs>
          <linearGradient id="crownGradient" x1="6.5" y1="2" x2="17.5" y2="13" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7ec789" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="coreGradient" x1="6.5" y1="11" x2="17.5" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f59e0b" />
            <stop offset="1" stopColor="#e5b567" />
          </linearGradient>
        </defs>
      </svg>
      {/* Subtle outer glow on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-tinapple-green/10 to-tinapple-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};
export default BrandLogo;

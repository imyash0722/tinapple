import React, { useState } from 'react';
import ElectricLogo from '../reactbits/ElectricLogo';

const EMBLEM_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32 6 L48 22 L32 38 L16 22 Z M32 26 L48 42 L32 58 L16 42 Z" fill="#ffffff" fill-rule="evenodd"/><circle cx="32" cy="32" r="3.5" fill="#ffffff"/></svg>'
)}`;

interface BrandLogoProps {
  className?: string;
  size?: number;
  electric?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 36,
  electric = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-tinapple-surface via-tinapple-card to-tinapple-dark border border-tinapple-border shadow-lg shadow-tinapple-gold/10 group cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      title="Tinapple Appliance Dual-Facet Core"
    >
      {/* Underlying Electric Lightning Arc Field */}
      {electric && (
        <div className="absolute -inset-2.5 pointer-events-none z-0 overflow-visible opacity-85 group-hover:opacity-100 transition-opacity">
          <ElectricLogo
            src={EMBLEM_SVG}
            color="#e5b567"
            glowColor="#7ec789"
            thickness={1.5}
            glow={0.7}
            scale={0.92}
            arcs={isHovered ? 5 : 3}
            speed={isHovered ? 1.4 : 0.8}
            intensity={isHovered ? 1.5 : 1.1}
            interactive={true}
          />
        </div>
      )}

      {/* Central Sharp Vector Dual-Facet Emblem */}
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(229,181,103,0.35)]"
      >
        {/* Upper Facet (Palm / Crown Emerald) */}
        <path
          d="M12 2L17.5 7.5L12 13L6.5 7.5L12 2Z"
          fill="url(#crownGradient)"
          className="opacity-95"
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

      {/* Ambient Radial Hover Flare */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-tinapple-green/15 to-tinapple-gold/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20" />
    </div>
  );
};

export default BrandLogo;

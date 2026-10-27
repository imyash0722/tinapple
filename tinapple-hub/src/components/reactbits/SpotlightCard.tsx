import React, { useRef, useState, useEffect } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  borderColor?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'var(--tinapple-accent-glow, rgba(229, 181, 103, 0.15))',
  borderColor = 'var(--tinapple-accent, rgba(229, 181, 103, 0.45))',
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState<number>(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`tinapple-glass-card relative overflow-hidden rounded-2xl border border-tinapple-border bg-tinapple-card/80 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-tinapple-border-hover hover:shadow-2xl hover:shadow-tinapple-blue/5 ${className}`}
      {...props}
    >
      {/* Dynamic Radial Spotlight Glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 65%)`,
        }}
      />
      {/* Subtle border highlight follow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-0 border border-white/10"
        style={{
          opacity: opacity * 0.7,
          borderColor: borderColor,
        }}
      />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};
export default SpotlightCard;

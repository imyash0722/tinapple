import React from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spotlightColor?: string;
  borderColor?: string;
}

// Compatibility wrapper: consumers keep their layout and handlers; elevation is tonal.
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children, className = '', spotlightColor: _spotlight, borderColor: _border, ...props
}) => (
  <div className={`tinapple-glass-card m3-card relative overflow-hidden ${className}`} {...props}>
    <div className="relative z-10 w-full h-full">{children}</div>
  </div>
);
export default SpotlightCard;

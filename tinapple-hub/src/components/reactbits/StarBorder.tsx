import React from 'react';

interface StarBorderProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  color?: string;
  speed?: string;
  as?: 'button' | 'div';
  onClick?: (e?: any) => void;
}

export const StarBorder: React.FC<StarBorderProps> = ({
  children,
  className = '',
  color = '#7aa2f7',
  speed = '4s',
  as = 'button',
  onClick,
  disabled,
  ...props
}) => {
  const Component = as;

  return (
    <Component
      onClick={onClick as any}
      disabled={disabled as any}
      className={`relative inline-flex items-center justify-center p-[1px] overflow-hidden rounded-xl group transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${className}`}
      {...(as === 'button' ? { type: 'button' } : {})}
      {...(props as any)}
    >
      {/* Animated gradient spinning border */}
      <span
        className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite]"
        style={{
          background: `conic-gradient(from 90deg at 50% 50%, #161824 0%, ${color} 50%, #161824 100%)`,
          animationDuration: speed,
        }}
      />
      {/* Inner surface */}
      <span className="relative inline-flex items-center justify-center w-full h-full px-4 py-2.5 rounded-[11px] bg-tinapple-card/90 backdrop-blur-md text-sm font-medium text-tinapple-text transition-all duration-200 group-hover:bg-tinapple-surface/90">
        {children}
      </span>
    </Component>
  );
};
export default StarBorder;

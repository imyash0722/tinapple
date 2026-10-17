import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  shimmerColor?: string;
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 5,
  className = '',
  shimmerColor = '#ffffff',
}) => {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`inline-block bg-clip-text text-transparent font-semibold ${
        disabled ? 'text-tinapple-text' : ''
      } ${className}`}
      style={{
        backgroundImage: disabled
          ? 'none'
          : `linear-gradient(120deg, rgba(192, 202, 245, 0.7) 0%, rgba(192, 202, 245, 0.7) 35%, ${shimmerColor} 50%, rgba(192, 202, 245, 0.7) 65%, rgba(192, 202, 245, 0.7) 100%)`,
        backgroundSize: '250% 100%',
        animation: disabled ? 'none' : `shine ${animationDuration} linear infinite`,
      }}
    >
      <style>{`
        @keyframes shine {
          0% { background-position: 150% 0; }
          100% { background-position: -150% 0; }
        }
      `}</style>
      {text}
    </span>
  );
};
export default ShinyText;

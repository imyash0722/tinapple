import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface ElasticSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  label?: string;
  unit?: string;
  className?: string;
}

export const ElasticSlider: React.FC<ElasticSliderProps> = ({
  value,
  min = 50,
  max = 100,
  step = 5,
  onChange,
  label = 'Value',
  unit = '%',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handleMove(e.clientX);
    const onPointerMove = (moveEvent: PointerEvent) => handleMove(moveEvent.clientX);
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawRatio = (clientX - rect.left) / rect.width;
    const clampedRatio = Math.max(0, Math.min(1, rawRatio));
    const rawVal = min + clampedRatio * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    onChange(Math.min(max, Math.max(min, steppedVal)));
  };

  return (
    <div className={`space-y-2 select-none ${className}`}>
      <div className="flex justify-between items-center text-xs font-medium text-tinapple-subtext">
        <span>{label}</span>
        <span className="font-mono font-semibold text-tinapple-cyan">
          {value}
          {unit}
        </span>
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="relative h-7 w-full rounded-xl bg-tinapple-dark/60 border border-tinapple-border p-1 cursor-pointer overflow-hidden backdrop-blur-md"
      >
        {/* Fill track */}
        <motion.div
          className="h-full rounded-lg bg-gradient-to-r from-tinapple-blue via-tinapple-cyan to-tinapple-green"
          style={{ width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        />

        {/* Thumb knob */}
        <motion.div
          className="absolute top-1 bottom-1 w-2.5 rounded-md bg-white shadow-md shadow-black/40 pointer-events-none"
          style={{ left: `calc(${percentage}% - 6px)` }}
          animate={{ left: `calc(${percentage}% - 6px)` }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        />
      </div>
    </div>
  );
};
export default ElasticSlider;

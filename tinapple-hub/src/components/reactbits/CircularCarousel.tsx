import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CircularCarouselItem {
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
}

export type CircularCarouselPreset = 'cylinder' | 'orbit' | 'wheel' | 'panorama';
export type CircularCarouselIntro = 'assemble' | 'rise' | 'spin' | 'none';
export type CircularCarouselAutoplay = 'drift' | 'step' | 'off';

export interface CircularCarouselProps {
  items?: CircularCarouselItem[];
  preset?: CircularCarouselPreset;
  intro?: CircularCarouselIntro;
  cardWidth?: number;
  aspectRatio?: number;
  gap?: number;
  curve?: number;
  tilt?: number;
  perspective?: number;
  autoplay?: CircularCarouselAutoplay;
  speed?: number;
  interval?: number;
  direction?: 'left' | 'right';
  draggable?: boolean;
  momentum?: number;
  snap?: boolean;
  pauseOnHover?: boolean;
  focusOnClick?: boolean;
  parallax?: number;
  stretch?: number;
  depthFade?: number;
  fadeColor?: string;
  innerShade?: number;
  cornerRadius?: number;
  captions?: boolean;
  onChange?: (index: number) => void;
  onItemClick?: (item: CircularCarouselItem, index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_ITEMS: CircularCarouselItem[] = [
  { src: '/icons/archlinux.svg', title: 'System', subtitle: 'Core Appliance' }
];

export const CircularCarousel: React.FC<CircularCarouselProps> = ({
  items = DEFAULT_ITEMS,
  cardWidth = 180,
  aspectRatio = 180 / 220,
  onChange,
  onItemClick,
  className = '',
  style
}) => {
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;
  const count = list.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);

  // Keep activeIndex within bounds if list shrinks
  useEffect(() => {
    if (activeIndex >= count && count > 0) {
      setActiveIndex(0);
      onChange?.(0);
    }
  }, [count, activeIndex, onChange]);

  const handleSelect = useCallback(
    (index: number) => {
      const normalized = ((index % count) + count) % count;
      setActiveIndex(normalized);
      onChange?.(normalized);
      onItemClick?.(list[normalized], normalized);
    },
    [count, list, onChange, onItemClick]
  );

  const prev = useCallback(() => {
    handleSelect(activeIndex - 1);
  }, [activeIndex, handleSelect]);

  const next = useCallback(() => {
    handleSelect(activeIndex + 1);
  }, [activeIndex, handleSelect]);

  // Keyboard navigation when focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onItemClick?.(list[activeIndex], activeIndex);
    }
  };

  // Wheel horizontal/vertical delta
  const handleWheel = (e: React.WheelEvent) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 25) {
      if (delta > 0) next();
      else prev();
    }
  };

  // Pointer drag gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) prev();
      else next();
    }
    dragStartX.current = null;
  };

  const cardH = cardWidth / (aspectRatio || 0.82);

  // Calculate 3D geometry for each card
  const cards = list.map((item, index) => {
    let offset = index - activeIndex;
    if (offset > count / 2) offset -= count;
    if (offset < -count / 2) offset += count;

    // Angle step: evenly spaced for small sets, capped for larger sets
    const angleStep = count <= 6 ? (2 * Math.PI) / count : (26 * Math.PI) / 180;
    const angle = offset * angleStep;
    const isVisible = Math.abs(offset) <= Math.min(count / 2, 4.5);

    // Radii for ellipse in perspective space
    const radiusX = Math.min(340, Math.max(220, count * 35));
    const radiusZ = 220;

    const x = Math.sin(angle) * radiusX;
    const z = (Math.cos(angle) - 1) * radiusZ;
    const rotateY = -((angle * 180) / Math.PI) * 0.7;
    const isCenter = offset === 0;
    const scale = isCenter ? 1.08 : Math.max(0.72, 1 - Math.abs(offset) * 0.09);
    const opacity = isCenter ? 1 : Math.max(0.25, 1 - Math.abs(offset) * 0.22);
    const zIndex = Math.round(100 + Math.cos(angle) * 50);

    return {
      item,
      index,
      offset,
      isCenter,
      isVisible,
      x,
      z,
      rotateY,
      scale,
      opacity,
      zIndex
    };
  });

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={`relative w-full h-full flex flex-col items-center justify-center select-none outline-none overflow-hidden ${className}`.trim()}
      style={{
        perspective: '1200px',
        ...style
      }}
      role="region"
      aria-label="3D Radial Appliance Carousel"
    >
      {/* 3D Stage */}
      <div
        className="relative w-full h-[320px] flex items-center justify-center pointer-events-auto"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {cards.map((c) => {
          if (!c.isVisible) return null;
          return (
            <motion.div
              key={c.index}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(c.index);
              }}
              initial={false}
              animate={{
                x: c.x,
                z: c.z,
                rotateY: c.rotateY,
                scale: c.scale,
                opacity: c.opacity
              }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 26,
                mass: 0.8
              }}
              style={{
                width: `${cardWidth}px`,
                height: `${cardH}px`,
                position: 'absolute',
                zIndex: c.zIndex,
                transformStyle: 'preserve-3d',
                cursor: c.isCenter ? 'default' : 'pointer'
              }}
              className="group cursor-pointer"
            >
              <div
                className={`w-full h-full rounded-2xl p-4 flex flex-col items-center justify-between text-center transition-all duration-300 backdrop-blur-xl ${
                  c.isCenter
                    ? 'bg-[#0b1329]/90 border-2 border-tinapple-gold shadow-[0_0_35px_rgba(229,181,103,0.35)] ring-1 ring-tinapple-gold/50'
                    : 'bg-[#070e1f]/80 border border-sky-500/30 hover:border-sky-400/60 shadow-xl'
                }`}
              >
                {/* Active Indicator Badge */}
                <div className="w-full flex justify-between items-center h-5">
                  {c.isCenter ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase bg-tinapple-gold text-tinapple-dark shadow-sm">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-tinapple-muted opacity-60">
                      #{c.index + 1}
                    </span>
                  )}
                </div>

                {/* Appliance Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center p-3 transition-transform duration-300 ${
                    c.isCenter
                      ? 'bg-tinapple-gold/15 border border-tinapple-gold/40 shadow-lg scale-105'
                      : 'bg-sky-500/10 border border-sky-500/25 group-hover:scale-105'
                  }`}
                >
                  <img
                    src={c.item.src}
                    alt={c.item.title || ''}
                    draggable={false}
                    className="w-full h-full object-contain filter drop-shadow"
                    onError={(e) => {
                      // Fallback icon on image error
                      (e.target as HTMLImageElement).src = '/icons/archlinux.svg';
                    }}
                  />
                </div>

                {/* Title & Tagline */}
                <div className="w-full px-1">
                  <h4
                    className={`text-xs font-bold truncate tracking-tight transition-colors ${
                      c.isCenter ? 'text-white text-sm font-extrabold' : 'text-tinapple-text'
                    }`}
                  >
                    {c.item.title}
                  </h4>
                  {c.item.subtitle && (
                    <p
                      className={`text-[10px] font-mono truncate mt-0.5 ${
                        c.isCenter ? 'text-tinapple-gold' : 'text-tinapple-muted'
                      }`}
                    >
                      {c.item.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation Controls & Pagination */}
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-[200]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="pointer-events-auto p-2.5 rounded-full bg-tinapple-card/90 border border-tinapple-border/90 text-tinapple-subtext hover:text-white hover:border-tinapple-gold hover:bg-tinapple-dark/95 shadow-xl transition-all duration-200 focus:outline-none"
          title="Previous Appliance (Left Arrow)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="pointer-events-auto p-2.5 rounded-full bg-tinapple-card/90 border border-tinapple-border/90 text-tinapple-subtext hover:text-white hover:border-tinapple-gold hover:bg-tinapple-dark/95 shadow-xl transition-all duration-200 focus:outline-none"
          title="Next Appliance (Right Arrow)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Pagination Indicator Dots & Counter */}
      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 pointer-events-auto z-[200]">
        <span className="text-[11px] font-mono text-tinapple-gold font-bold px-2 py-0.5 rounded-full bg-tinapple-dark/80 border border-tinapple-border/70">
          {activeIndex + 1} / {count}
        </span>
        <div className="flex items-center gap-1.5 overflow-hidden max-w-[200px]">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`transition-all duration-300 rounded-full ${
                i === activeIndex
                  ? 'w-5 h-1.5 bg-tinapple-gold'
                  : 'w-1.5 h-1.5 bg-tinapple-subtext/40 hover:bg-white'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CircularCarousel;

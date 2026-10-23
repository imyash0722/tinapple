import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface DockItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface DockProps {
  items: DockItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const Dock: React.FC<DockProps> = ({ items, activeId, onSelect, className = '' }) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={`tinapple-glass-card flex items-end h-16 gap-3 px-4 pb-2.5 rounded-2xl shadow-2xl shadow-black/80 ${className}`}
    >
      {items.map((item) => (
        <DockIcon
          key={item.id}
          item={item}
          mouseX={mouseX}
          isActive={activeId === item.id}
          onClick={() => onSelect(item.id)}
        />
      ))}
    </div>
  );
};

interface DockIconProps {
  item: DockItem;
  mouseX: any;
  isActive: boolean;
  onClick: () => void;
}

const DockIcon: React.FC<DockIconProps> = ({ item, mouseX, isActive, onClick }) => {
  const ref = useRef<HTMLButtonElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-120, 0, 120], [44, 58, 44]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 200, damping: 14 });

  return (
    <motion.button
      ref={ref}
      style={{ width, height: width }}
      onClick={onClick}
      aria-label={item.label}
      className={`relative flex items-center justify-center rounded-xl transition-all duration-200 group hover:z-50 focus-within:z-50 active:scale-90 ${
        isActive
          ? 'bg-tinapple-surface border border-tinapple-gold/70 text-tinapple-gold shadow-lg shadow-tinapple-gold/20'
          : 'bg-tinapple-surface/80 border border-transparent text-tinapple-subtext hover:bg-tinapple-surface hover:text-white'
      }`}
    >
      {/* Tooltip */}
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 invisible group-hover:visible group-focus-visible:visible opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-200 pointer-events-none px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-zinc-900/95 border border-white/10 text-tinapple-gold shadow-2xl whitespace-nowrap z-50">
        {item.label}
      </span>

      {/* Icon */}
      <div className="flex items-center justify-center w-full h-full p-2.5">
        {item.icon}
      </div>

      {/* Badge if present */}
      {item.badge !== undefined && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4 h-4 flex items-center justify-center text-[10px] font-mono font-bold rounded-full bg-tinapple-green text-tinapple-dark shadow-sm">
          {item.badge}
        </span>
      )}
    </motion.button>
  );
};
export default Dock;

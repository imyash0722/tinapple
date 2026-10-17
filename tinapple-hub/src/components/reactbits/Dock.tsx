import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface DockItem {
  id: string;
  label: string;
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
      className={`flex items-end h-16 gap-3 px-4 pb-2.5 rounded-2xl border border-tinapple-border bg-tinapple-card/90 backdrop-blur-3xl shadow-2xl shadow-black/80 ${className}`}
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
      className={`relative flex items-center justify-center rounded-xl transition-colors duration-200 group active:scale-90 ${
        isActive
          ? 'bg-tinapple-gold text-tinapple-dark shadow-lg shadow-tinapple-gold/25'
          : 'bg-tinapple-surface/90 text-tinapple-subtext hover:bg-tinapple-surface hover:text-white'
      }`}
    >
      {/* Tooltip */}
      <span className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-tinapple-dark/95 border border-tinapple-border text-tinapple-gold shadow-xl whitespace-nowrap">
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

      {/* Active Indicator dot */}
      {isActive && (
        <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-tinapple-gold shadow-sm shadow-tinapple-gold" />
      )}
    </motion.button>
  );
};
export default Dock;

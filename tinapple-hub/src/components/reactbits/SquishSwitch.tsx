import React from 'react';
import { motion } from 'framer-motion';

interface SquishSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'amber' | 'emerald' | 'purple' | 'cyan' | 'blue';
  size?: 'sm' | 'md';
}

export const SquishSwitch: React.FC<SquishSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  className = '',
  variant = 'amber',
  size = 'md',
}) => {
  const variantStyles = {
    amber: {
      on: 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_14px_rgba(245,158,11,0.45)] border border-amber-400/60',
      ring: 'focus-visible:ring-amber-400',
    },
    emerald: {
      on: 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_14px_rgba(16,185,129,0.45)] border border-emerald-400/60',
      ring: 'focus-visible:ring-emerald-400',
    },
    purple: {
      on: 'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-[0_0_14px_rgba(168,85,247,0.45)] border border-purple-400/60',
      ring: 'focus-visible:ring-purple-400',
    },
    cyan: {
      on: 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_14px_rgba(6,182,212,0.45)] border border-cyan-400/60',
      ring: 'focus-visible:ring-cyan-400',
    },
    blue: {
      on: 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_0_14px_rgba(59,130,246,0.45)] border border-blue-400/60',
      ring: 'focus-visible:ring-blue-400',
    },
  }[variant];

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full p-1 transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 ${variantStyles.ring} focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-40 disabled:cursor-not-allowed ${
        isSmall ? 'h-5 w-9' : 'h-7 w-12'
      } ${
        checked
          ? variantStyles.on
          : 'bg-slate-900 border border-slate-700/80 hover:border-slate-600'
      } ${className}`}
    >
      <motion.span
        layout
        transition={{
          type: 'spring',
          stiffness: 700,
          damping: 30,
        }}
        animate={{
          x: checked ? (isSmall ? 16 : 20) : 0,
          scaleX: [1, 1.25, 1],
        }}
        className={`pointer-events-none block rounded-full transition-colors ${
          isSmall ? 'h-3 w-3' : 'h-5 w-5'
        } ${
          checked
            ? 'bg-white shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
            : 'bg-slate-400 shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
        }`}
      />
    </button>
  );
};
export default SquishSwitch;

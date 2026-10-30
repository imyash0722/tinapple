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
      on: 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.35)] border border-amber-400/40',
      ring: 'focus-visible:ring-amber-400',
    },
    emerald: {
      on: 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.35)] border border-emerald-400/40',
      ring: 'focus-visible:ring-emerald-400',
    },
    purple: {
      on: 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_12px_rgba(168,85,247,0.35)] border border-purple-400/40',
      ring: 'focus-visible:ring-purple-400',
    },
    cyan: {
      on: 'bg-gradient-to-r from-cyan-400 to-sky-500 shadow-[0_0_12px_rgba(6,182,212,0.35)] border border-cyan-400/40',
      ring: 'focus-visible:ring-cyan-400',
    },
    blue: {
      on: 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_12px_rgba(59,130,246,0.35)] border border-blue-400/40',
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
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full p-0.5 transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 ${variantStyles.ring} focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-40 disabled:cursor-not-allowed ${
        isSmall ? 'h-5 w-9' : 'h-6 w-11'
      } ${
        checked
          ? variantStyles.on
          : 'bg-zinc-800/90 border border-white/10 hover:border-white/20'
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
          scaleX: [1, 1.2, 1],
        }}
        className={`pointer-events-none block rounded-full transition-colors ${
          isSmall ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'
        } ${
          checked
            ? 'bg-white shadow-[0_2px_5px_rgba(0,0,0,0.45)]'
            : 'bg-zinc-300 shadow-[0_1px_3px_rgba(0,0,0,0.35)]'
        }`}
      />
    </button>
  );
};
export default SquishSwitch;

import React from 'react';
import { motion } from 'framer-motion';

interface LightToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  labelOn?: string;
  labelOff?: string;
}

export const LightToggle: React.FC<LightToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  className = '',
  labelOn = 'ENABLED',
  labelOff = 'DISABLED',
}) => {
  return (
    <motion.button
      type="button"
      role="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className={`relative inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold tracking-wider select-none transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:bg-emerald-500/25'
          : 'bg-zinc-900/90 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500/60'
      } ${className}`}
      title={checked ? 'Active (Click to disable)' : 'Inactive (Click to enable)'}
    >
      {/* Tactile Hardware Illuminated LED Jewel */}
      <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
        {checked && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 transition-colors duration-150 ${
            checked
              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
              : 'bg-zinc-600'
          }`}
        />
      </span>

      <span>{checked ? labelOn : labelOff}</span>
    </motion.button>
  );
};

export default LightToggle;

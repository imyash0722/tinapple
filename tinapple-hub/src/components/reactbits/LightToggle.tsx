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
  labelOn = 'ON',
  labelOff = 'OFF',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all duration-200 select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
          : 'bg-slate-900/80 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
      } ${className}`}
      title={checked ? 'Active (Click to disable)' : 'Inactive (Click to enable)'}
    >
      {/* Illuminated LED Indicator Light */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {checked && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 transition-colors ${
            checked
              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
              : 'bg-zinc-600'
          }`}
        />
      </span>

      <span>{checked ? labelOn : labelOff}</span>
    </button>
  );
};

export default LightToggle;

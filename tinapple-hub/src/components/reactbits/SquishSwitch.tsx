import React from 'react';
import { motion } from 'framer-motion';

interface SquishSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const SquishSwitch: React.FC<SquishSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-tinapple-blue focus-visible:ring-offset-2 focus-visible:ring-offset-tinapple-dark disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-tinapple-blue' : 'bg-tinapple-card border border-tinapple-border'
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
          x: checked ? 20 : 0,
          scaleX: [1, 1.25, 1],
        }}
        className={`pointer-events-none block h-5 w-5 rounded-full shadow-md shadow-black/30 transition-colors ${
          checked ? 'bg-tinapple-dark' : 'bg-tinapple-subtext'
        }`}
      />
    </button>
  );
};
export default SquishSwitch;

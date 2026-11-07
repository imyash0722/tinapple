import React from 'react';

interface SquishSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  title?: string;
  'aria-labelledby'?: string;
  // Retained for existing consumers; all switches now follow the M3 primary role.
  variant?: 'amber' | 'emerald' | 'purple' | 'cyan' | 'blue';
  size?: 'sm' | 'md';
}

export const SquishSwitch: React.FC<SquishSwitchProps> = ({
  checked, onChange, disabled = false, className = '', label, title,
  'aria-labelledby': labelledBy,
}) => (
  <button type="button" role="switch" aria-checked={checked}
    aria-label={labelledBy ? undefined : label || 'Toggle setting'} aria-labelledby={labelledBy}
    title={title}
    disabled={disabled} onClick={() => onChange(!checked)}
    className={`m3-switch ${className}`}>
    <span className="m3-switch-track" aria-hidden="true"><span className="m3-switch-thumb" /></span>
  </button>
);
export default SquishSwitch;

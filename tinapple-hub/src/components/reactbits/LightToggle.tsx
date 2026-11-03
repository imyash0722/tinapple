import React, { useId } from 'react';
import { SquishSwitch } from './SquishSwitch';

interface LightToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  labelOn?: string;
  labelOff?: string;
}
export const LightToggle: React.FC<LightToggleProps> = ({
  checked, onChange, disabled = false, className = '', labelOn = 'Enabled', labelOff = 'Disabled',
}) => {
  const id = useId();
  return <span className={`inline-flex items-center gap-2 text-sm text-on-surface ${className}`}>
    <SquishSwitch checked={checked} onChange={onChange} disabled={disabled} aria-labelledby={id} />
    <span id={id}>{checked ? labelOn : labelOff}</span>
  </span>;
};
export default LightToggle;

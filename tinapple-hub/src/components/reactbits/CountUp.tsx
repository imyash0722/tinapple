import React, { useEffect, useState } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number; // seconds
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 1.2,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
}) => {
  const [current, setCurrent] = useState<number>(from);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = current;
    const difference = to - startValue;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCurrent(startValue + difference * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [to, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {current.toFixed(decimals)}
      {suffix}
    </span>
  );
};
export default CountUp;

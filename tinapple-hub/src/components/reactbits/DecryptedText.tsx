import React, { useState, useEffect, useRef } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  className?: string;
  encryptedClassName?: string;
  animateOn?: 'view' | 'hover';
  characters?: string;
}

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 40,
  maxIterations = 10,
  className = '',
  encryptedClassName = 'text-tinapple-cyan/70 font-mono',
  animateOn = 'view',
  characters = '01ABCDEFGHJKLMNPQRSTUVWXYZ_/*+-!#$%',
}) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isDecrypted, setIsDecrypted] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  const startAnimation = () => {
    let iteration = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration) {
              return text[index];
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        setIsDecrypted(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      iteration += 1 / (maxIterations / 2);
    }, speed);
  };

  useEffect(() => {
    if (animateOn === 'view') {
      startAnimation();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  return (
    <span
      className={`inline-block ${isDecrypted ? className : encryptedClassName}`}
      onMouseEnter={() => {
        if (animateOn === 'hover') startAnimation();
      }}
    >
      {displayText}
    </span>
  );
};
export default DecryptedText;

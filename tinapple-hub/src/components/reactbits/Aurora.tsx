import React, { useEffect, useRef } from 'react';

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  time?: number;
  speed?: number;
  className?: string;
  opacity?: number;
}

export const Aurora: React.FC<AuroraProps> = ({
  colorStops = ['#0a0b10', '#1a1c2b', '#283457', '#7aa2f7', '#bb9af7'],
  amplitude = 1.0,
  speed = 0.5,
  className = '',
  opacity = 0.45,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let mouseX = width / 2;
    let mouseY = height / 3;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let step = 0;
    const render = () => {
      step += 0.003 * speed;
      ctx.clearRect(0, 0, width, height);

      // Create dynamic wave gradient layers
      const waves = [
        { y: height * 0.25, amp: 70 * amplitude, freq: 0.0012, color: colorStops[3], speed: 1.0 },
        { y: height * 0.45, amp: 90 * amplitude, freq: 0.0009, color: colorStops[4], speed: 0.8 },
        { y: height * 0.65, amp: 110 * amplitude, freq: 0.0007, color: colorStops[2], speed: 1.2 },
      ];

      waves.forEach((w, index) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let x = 0; x <= width; x += 15) {
          const mouseInfluence = Math.sin((x - mouseX) * 0.002) * 20;
          const y =
            w.y +
            Math.sin(x * w.freq + step * w.speed) * w.amp +
            Math.cos(x * w.freq * 0.5 + step * 0.7) * (w.amp * 0.5) +
            mouseInfluence;
          if (x === 0) ctx.lineTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, w.y - 100, 0, height);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, w.color);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.globalAlpha = opacity * (0.8 - index * 0.15);
        ctx.filter = 'blur(60px)';
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [colorStops, amplitude, speed, opacity]);

  return (
    <div className={`fixed inset-0 pointer-events-none -z-10 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-tinapple-dark via-transparent to-tinapple-dark/60 opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(#1f2335_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
    </div>
  );
};
export default Aurora;

import React, { useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { CanvasWidget, CanvasViewport } from '../../types/canvas';

interface CanvasMinimapProps {
  canvasWidth: number;
  canvasHeight: number;
  viewport: CanvasViewport;
  containerWidth: number;
  containerHeight: number;
  widgets: CanvasWidget[];
  onPanTo: (x: number, y: number) => void;
}

export const CanvasMinimap: React.FC<CanvasMinimapProps> = ({
  canvasWidth,
  canvasHeight,
  viewport,
  containerWidth,
  containerHeight,
  widgets,
  onPanTo,
}) => {
  const minimapRef = useRef<HTMLDivElement>(null);

  // Scaled dimensions for the minimap preview
  const mapW = 160;
  const mapH = (canvasHeight / canvasWidth) * mapW;

  const scaleX = mapW / canvasWidth;
  const scaleY = mapH / canvasHeight;

  // Viewport bounds in canvas space
  const viewX = -viewport.panX / viewport.zoom;
  const viewY = -viewport.panY / viewport.zoom;
  const viewW = containerWidth / viewport.zoom;
  const viewH = containerHeight / viewport.zoom;

  // Scaled viewport rect
  const rectX = Math.max(0, Math.min(mapW, viewX * scaleX));
  const rectY = Math.max(0, Math.min(mapH, viewY * scaleY));
  const rectW = Math.max(12, Math.min(mapW - rectX, viewW * scaleX));
  const rectH = Math.max(8, Math.min(mapH - rectY, viewH * scaleY));

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click in minimap to canvas coordinates
    const targetCanvasX = clickX / scaleX;
    const targetCanvasY = clickY / scaleY;

    // Center viewport at this coordinate
    const newPanX = -(targetCanvasX * viewport.zoom - containerWidth / 2);
    const newPanY = -(targetCanvasY * viewport.zoom - containerHeight / 2);

    onPanTo(newPanX, newPanY);
  };

  return (
    <div className="rounded-xl bg-slate-950/80 border border-white/10 p-1.5 shadow-2xl backdrop-blur-md select-none font-mono">
      <div className="flex items-center justify-between px-1.5 pb-1 text-[9px] text-zinc-400 font-bold">
        <span className="flex items-center gap-1">
          <Navigation className="w-2.5 h-2.5 text-tinapple-gold" />
          <span>RADAR</span>
        </span>
        <span className="text-zinc-500">{Math.round(viewport.zoom * 100)}%</span>
      </div>

      <div
        ref={minimapRef}
        onClick={handleMinimapClick}
        style={{ width: `${mapW}px`, height: `${mapH}px` }}
        className="relative bg-slate-900/90 rounded-lg border border-white/5 overflow-hidden cursor-crosshair"
      >
        {/* Render dots/rects for each widget */}
        {widgets
          .filter((w) => w.visible)
          .map((w) => (
            <div
              key={w.id}
              style={{
                left: `${w.x * scaleX}px`,
                top: `${w.y * scaleY}px`,
                width: `${Math.max(4, w.w * scaleX)}px`,
                height: `${Math.max(3, w.h * scaleY)}px`,
              }}
              className="absolute rounded-[1px] bg-sky-400/40 border border-sky-400/60 pointer-events-none"
            />
          ))}

        {/* Viewport Frame */}
        <div
          style={{
            left: `${rectX}px`,
            top: `${rectY}px`,
            width: `${rectW}px`,
            height: `${rectH}px`,
          }}
          className="absolute rounded border border-tinapple-gold bg-tinapple-gold/15 pointer-events-none shadow-sm shadow-tinapple-gold/30 transition-all duration-75"
        />
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import Waves from './Waves';
import Particles from './Particles';
import MicroSlats from './MicroSlats';

export type BackgroundMode = 'plain' | 'microslats' | 'waves' | 'wallpaper' | 'none';
export interface BackgroundSettings {
  mode: BackgroundMode;
  wallpaperUrl: string;
  wallpaperDim: number;
  accentColor: string;
  secondaryColor: string;
  syncWallpaperColors: boolean;
  enableParticles: boolean;
  enableNebula: boolean;
  enableGlass: boolean;
  glassBlur: number;
  glassTranslucency: number;
  uiScale: string;
}

export const FullWindowBackground: React.FC<{ settings: BackgroundSettings }> = ({ settings }) => {
  const { mode, wallpaperUrl, wallpaperDim, accentColor, secondaryColor, enableParticles, enableNebula } = settings;
  const particleColors = useMemo(() => [accentColor, secondaryColor, '#ffffff'], [accentColor, secondaryColor]);
  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#040714]">
      {/* Plainer Graphic Background (Subtle ambient glow, soft grid & watermark) */}
      {(mode === 'plain' || mode === 'none') && (
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 90% 60% at 50% -15%, ${accentColor}1c 0%, transparent 70%), radial-gradient(ellipse 70% 50% at 90% 100%, ${secondaryColor}14 0%, transparent 60%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage: `linear-gradient(to right, ${accentColor}25 1px, transparent 1px), linear-gradient(to bottom, ${accentColor}25 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(ellipse 85% 75% at 50% 45%, black 40%, transparent 95%)',
              WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 50% 45%, black 40%, transparent 95%)',
            }}
          />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full border border-sky-400/[0.035] pointer-events-none" />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[1140px] h-[1140px] rounded-full border border-sky-400/[0.02] pointer-events-none" />
        </div>
      )}

      {mode === 'microslats' && (
        <div className="absolute inset-0 opacity-35">
          <MicroSlats preset="swell" color="#081026" glintColor={accentColor} backgroundColor="#040714"
            slatWidth={14} slatHeight={48} gap={8} roundness={0.4} interactive cursorStrength={1.2}
            cursorSize={100} lean={0.4} contrast={1.08} glint={0.8} speed={0.25} />
        </div>
      )}
      {mode === 'waves' && (
        <div className="absolute inset-0">
          <Waves lineColor={`${accentColor}22`} accentColor={`${secondaryColor}30`} backgroundColor="#040714"
            spacing={32} amplitude={30} speed={0.45} mouseInteraction clickRipple opacity={0.7} />
        </div>
      )}
      {mode === 'wallpaper' && <>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(wallpaperUrl)})` }} />
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(4, 7, 20, ${wallpaperDim})` }} />
      </>}
      {enableNebula && <>
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }} />
        <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full blur-[140px] opacity-15"
          style={{ background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 70%)` }} />
      </>}
      {enableParticles && (
        <div className="absolute inset-0 opacity-25">
          <Particles particleCount={20} particleColors={particleColors} particleSpread={15} speed={0.25}
            particleBaseSize={70} sizeRandomness={0.7} moveParticlesOnHover connections connectionDistance={120} glow={0.5} />
        </div>
      )}
    </div>
  );
};
export default FullWindowBackground;

import React, { useMemo } from 'react';
import Waves from './Waves';
import Particles from './Particles';
import MicroSlats from './MicroSlats';

export type BackgroundMode = 'microslats' | 'waves' | 'wallpaper' | 'none';
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
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#060709]">
      {mode === 'microslats' && (
        <div className="absolute inset-0">
          <MicroSlats preset="swell" color="#0b0e14" glintColor={accentColor} backgroundColor="#060709"
            slatWidth={20} slatHeight={72} gap={6} roundness={0.3} interactive cursorStrength={2.2}
            cursorSize={130} lean={0.65} contrast={1.4} glint={1.8} speed={0.45} />
        </div>
      )}
      {mode === 'waves' && (
        <div className="absolute inset-0">
          <Waves lineColor={`${accentColor}26`} accentColor={`${secondaryColor}40`} backgroundColor="#060709"
            spacing={28} amplitude={36} speed={0.6} mouseInteraction clickRipple opacity={0.85} />
        </div>
      )}
      {mode === 'wallpaper' && <>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(wallpaperUrl)})` }} />
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(6, 7, 9, ${wallpaperDim})` }} />
      </>}
      {enableNebula && <>
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full blur-[120px] opacity-25"
          style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }} />
        <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full blur-[140px] opacity-20"
          style={{ background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 70%)` }} />
      </>}
      {enableParticles && (
        <div className="absolute inset-0 opacity-30">
          <Particles particleCount={25} particleColors={particleColors} particleSpread={15} speed={0.35}
            particleBaseSize={80} sizeRandomness={0.7} moveParticlesOnHover connections connectionDistance={120} glow={0.7} />
        </div>
      )}
    </div>
  );
};
export default FullWindowBackground;

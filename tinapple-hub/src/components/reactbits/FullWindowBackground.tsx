import React, { useMemo, useState, useEffect } from 'react';
import Waves from './Waves';
import Particles from './Particles';
import MicroSlats from './MicroSlats';
import { Aurora } from './Aurora';
import { getCachedWallpaperBlob, cacheWallpaperUrl } from '../../theme/appearance';

export type BackgroundMode = 'plain' | 'aurora' | 'microslats' | 'waves' | 'wallpaper' | 'none';
export interface BackgroundSettings {
  colorMode?: 'dark' | 'light';
  mode: BackgroundMode;
  wallpaperUrl: string;
  wallpaperDim: number;
  wallpaperBlur?: number;
  accentColor: string;
  secondaryColor: string;
  syncWallpaperColors: boolean;
  enableParticles: boolean;
  enableNebula: boolean;
  enableGlass: boolean;
  glassBlur: number;
  glassTranslucency: number;
  uiScale: string;
  sidebarAutohide?: boolean;
}

export const FullWindowBackground: React.FC<{ settings: BackgroundSettings }> = React.memo(({ settings }) => {
  const { mode, wallpaperUrl, wallpaperDim, wallpaperBlur = 0, accentColor, secondaryColor, enableParticles, enableNebula } = settings;
  const particleColors = useMemo(() => [accentColor, secondaryColor, '#ffffff'], [accentColor, secondaryColor]);

  const isVideo = useMemo(() => {
    const target = (wallpaperUrl || '').toLowerCase();
    return target.endsWith('.mp4') || target.endsWith('.webm') || target.includes('.mp4?') || target.includes('.webm?');
  }, [wallpaperUrl]);

  // Synchronize offline cache in background without mutating live DOM video/image elements
  useEffect(() => {
    if (mode === 'wallpaper' && wallpaperUrl) {
      cacheWallpaperUrl(wallpaperUrl).catch(() => {});
    }
  }, [mode, wallpaperUrl]);

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-surface-container-lowest">
      {(mode === 'plain' || mode === 'none') && <div className="absolute inset-0 bg-surface-container-lowest" />}
      {mode === 'aurora' && (
        <div className="absolute inset-0 pointer-events-none">
          <Aurora
            colorStops={['var(--md-sys-color-surface-container-lowest, #040714)', 'var(--md-sys-color-surface-container-low, #081026)', `${secondaryColor}25`, `${accentColor}40`, `${accentColor}60`]}
            amplitude={1.2}
            speed={0.4}
            opacity={0.45}
          />
        </div>
      )}

      {mode === 'microslats' && (
        <div className="absolute inset-0 opacity-35">
          <MicroSlats preset="swell" color="var(--md-sys-color-surface-container, #081026)" glintColor={accentColor} backgroundColor="var(--md-sys-color-surface-container-lowest, #040714)"
            slatWidth={14} slatHeight={48} gap={8} roundness={0.4} interactive cursorStrength={1.2}
            cursorSize={100} lean={0.4} contrast={1.08} glint={0.8} speed={0.25} />
        </div>
      )}
      {mode === 'waves' && (
        <div className="absolute inset-0 opacity-40">
          <Waves lineColor={`${accentColor}18`} accentColor={`${secondaryColor}20`} backgroundColor="var(--md-sys-color-surface-container-lowest, #040714)"
            spacing={44} amplitude={24} speed={0.3} mouseInteraction clickRipple opacity={0.4} />
        </div>
      )}
      {mode === 'wallpaper' && (
        <div className="absolute inset-0 overflow-hidden">
          {isVideo ? (
            <video
              key={wallpaperUrl}
              src={wallpaperUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              style={{
                filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : 'none',
                transform: wallpaperBlur > 0 ? 'scale(1.06)' : 'none',
              }}
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-300"
              style={{
                backgroundImage: `url(${JSON.stringify(wallpaperUrl)})`,
                filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : 'none',
                transform: wallpaperBlur > 0 ? 'scale(1.06)' : 'none',
              }}
            />
          )}
          <div
            className="absolute inset-0 transition-colors duration-300"
            style={{ backgroundColor: `rgb(var(--md-sys-color-surface-container-lowest-rgb, 9 9 11) / ${wallpaperDim})` }}
          />
          {/* Subtle Matte Diffuse Vignette for True Material 3 Matte Depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 40%, transparent 50%, rgb(var(--md-sys-color-surface-container-lowest-rgb, 9 9 11) / 0.4) 100%)`,
            }}
          />
        </div>
      )}
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
});
export default FullWindowBackground;

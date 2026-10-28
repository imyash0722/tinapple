import React, { useMemo, useState, useEffect } from 'react';
import Waves from './Waves';
import Particles from './Particles';
import MicroSlats from './MicroSlats';
import { Aurora } from './Aurora';
import { getCachedWallpaperBlob, cacheWallpaperUrl } from '../../theme/appearance';

export type BackgroundMode = 'plain' | 'aurora' | 'microslats' | 'waves' | 'wallpaper' | 'none';
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
  const [cachedUrl, setCachedUrl] = useState<string>(wallpaperUrl);

  const isVideo = useMemo(() => {
    const target = (cachedUrl || wallpaperUrl || '').toLowerCase();
    return target.endsWith('.mp4') || target.endsWith('.webm') || target.includes('.mp4?') || target.includes('.webm?');
  }, [cachedUrl, wallpaperUrl]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function loadCached() {
      if (mode !== 'wallpaper' || !wallpaperUrl) return;
      try {
        const blob = await getCachedWallpaperBlob(wallpaperUrl) || await getCachedWallpaperBlob('active_wallpaper');
        if (blob && active) {
          objectUrl = URL.createObjectURL(blob);
          setCachedUrl(objectUrl);
        }
        const liveUrl = await cacheWallpaperUrl(wallpaperUrl);
        if (liveUrl && active && liveUrl !== objectUrl) {
          setCachedUrl(liveUrl);
        }
      } catch {
        if (active) setCachedUrl(wallpaperUrl);
      }
    }

    loadCached();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mode, wallpaperUrl]);
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
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `linear-gradient(to right, ${accentColor}20 1px, transparent 1px), linear-gradient(to bottom, ${accentColor}20 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 90%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 90%)',
            }}
          />
        </div>
      )}

      {mode === 'aurora' && (
        <div className="absolute inset-0 pointer-events-none">
          <Aurora
            colorStops={['#040714', '#081026', `${secondaryColor}25`, `${accentColor}40`, `${accentColor}60`]}
            amplitude={1.2}
            speed={0.4}
            opacity={0.45}
          />
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
        <div className="absolute inset-0 opacity-40">
          <Waves lineColor={`${accentColor}18`} accentColor={`${secondaryColor}20`} backgroundColor="#040714"
            spacing={44} amplitude={24} speed={0.3} mouseInteraction clickRipple opacity={0.4} />
        </div>
      )}
      {mode === 'wallpaper' && (
        <>
          {isVideo ? (
            <video
              src={cachedUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-300"
              style={{ backgroundImage: `url(${JSON.stringify(cachedUrl)})` }}
            />
          )}
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(4, 7, 20, ${wallpaperDim})` }} />
          {/* Subtle Matte Diffuse Vignette for True Material 3 Matte Depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 40%, transparent 50%, rgba(5, 8, 18, 0.4) 100%)`,
            }}
          />
        </>
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
};
export default FullWindowBackground;

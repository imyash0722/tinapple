import React, { useState, useEffect } from 'react';

interface PresetWallpaper {
  id: string;
  name: string;
  url: string;
  theme: string;
}

export const PywalThemingWidget: React.FC = () => {
  const [blur, setBlur] = useState<number>(() => {
    return Number(localStorage.getItem('tinapple_blur') || 20);
  });
  const [opacity, setOpacity] = useState<number>(() => {
    return Number(localStorage.getItem('tinapple_opacity') || 75);
  });
  const [uiScale, setUiScale] = useState<string>(() => {
    return localStorage.getItem('tinapple_scale') || '100%';
  });
  const [activeWallpaper, setActiveWallpaper] = useState<string>(() => {
    return localStorage.getItem('tinapple_wallpaper') || 'pine-sunset';
  });

  const wallpapers: PresetWallpaper[] = [
    {
      id: 'pine-sunset',
      name: 'Pineapple Dusk',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
      theme: 'Amber & Emerald',
    },
    {
      id: 'cyber-neon',
      name: 'Cyberpunk Tokyo',
      url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=80',
      theme: 'Neon Cyan & Violet',
    },
    {
      id: 'nord-mountain',
      name: 'Nordic Aurora',
      url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80',
      theme: 'Frost Blue & Teal',
    },
    {
      id: 'catppuccin-forest',
      name: 'Deep Forest',
      url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80',
      theme: 'Sage & Olive',
    },
    {
      id: 'minimal-dark',
      name: 'Obsidian Minimal',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
      theme: 'Monochrome Glass',
    },
  ];

  const scalePresets = [
    { label: 'Compact', value: '90%' },
    { label: 'Default', value: '100%' },
    { label: 'Comfortable', value: '108%' },
    { label: 'Large', value: '115%' },
  ];

  useEffect(() => {
    localStorage.setItem('tinapple_blur', blur.toString());
    document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
  }, [blur]);

  useEffect(() => {
    localStorage.setItem('tinapple_opacity', opacity.toString());
    document.documentElement.style.setProperty('--glass-opacity', `${opacity / 100}`);
  }, [opacity]);

  useEffect(() => {
    localStorage.setItem('tinapple_scale', uiScale);
    document.documentElement.style.setProperty('--ui-scale', uiScale);
    const zoomVal = parseInt(uiScale) / 100;
    (document.body.style as any).zoom = zoomVal.toString();
  }, [uiScale]);

  const selectWallpaper = (wp: PresetWallpaper) => {
    setActiveWallpaper(wp.id);
    localStorage.setItem('tinapple_wallpaper', wp.id);
    document.documentElement.style.setProperty('--app-bg-image', `url(${wp.url})`);
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-lg">
            🎨
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Dynamic Pywal & Glassmorphism</h3>
            <span className="text-[11px] text-slate-400 font-mono">Real-time Palette & UI Tuning</span>
          </div>
        </div>
      </div>

      {/* Sliders: Blur and Translucency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">Background Blur</span>
            <span className="text-emerald-400 font-bold">{blur}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">Controls frosted backdrop diffusion</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">Glass Translucency</span>
            <span className="text-blue-400 font-bold">{opacity}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="95"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">Controls background alpha transparency</span>
        </div>
      </div>

      {/* Per-Device UI Scaling */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
          📱 Per-Device UI Display Scaling
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {scalePresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setUiScale(preset.value)}
              className={`p-2.5 rounded-xl text-xs font-mono font-medium transition-all text-center border ${
                uiScale === preset.value
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className="block font-bold">{preset.label}</span>
              <span className="text-[10px] text-slate-500">{preset.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Wallpapers Gallery */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
          🖼️ Dynamic Pywal Wallpaper Engine
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {wallpapers.map((wp) => (
            <button
              key={wp.id}
              onClick={() => selectWallpaper(wp)}
              className={`group relative rounded-xl overflow-hidden aspect-video border text-left transition-all ${
                activeWallpaper === wp.id
                  ? 'ring-2 ring-emerald-500 border-emerald-500 scale-105 shadow-xl'
                  : 'border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'
              }`}
            >
              <img src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent p-2 flex flex-col justify-end">
                <span className="text-[11px] font-bold text-white truncate">{wp.name}</span>
                <span className="text-[9px] text-slate-400 font-mono truncate">{wp.theme}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

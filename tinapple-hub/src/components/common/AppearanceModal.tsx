import React, { useEffect, useRef, useState } from 'react';
import { Palette, X, Check } from 'lucide-react';
import type { BackgroundMode, BackgroundSettings } from '../reactbits/FullWindowBackground';
import { BUNDLED_WALLPAPERS, THEME_PALETTES, isHexColor, isWallpaperUrl } from '../../theme/appearance';
export { BUNDLED_WALLPAPERS, THEME_PALETTES } from '../../theme/appearance';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BackgroundSettings;
  onUpdate: React.Dispatch<React.SetStateAction<BackgroundSettings>>;
  colorStatus?: string;
  storageStatus?: string;
}

const modes: { id: BackgroundMode; label: string }[] = [
  { id: 'plain', label: 'Plainer Graphic' },
  { id: 'waves', label: 'WebGL Waves' },
  { id: 'microslats', label: 'Micro Slats' },
  { id: 'wallpaper', label: 'Wallpaper' },
  { id: 'none', label: 'Solid Void' },
];
const fieldClass = 'w-full min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-tinapple-gold';

export const AppearanceModal: React.FC<AppearanceModalProps> = ({ isOpen, onClose, settings, onUpdate, colorStatus, storageStatus }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState(settings.wallpaperUrl);
  const [urlError, setUrlError] = useState('');
  const [hex, setHex] = useState(settings.accentColor);
  const [hexError, setHexError] = useState('');

  useEffect(() => { setUrl(settings.wallpaperUrl); }, [settings.wallpaperUrl]);
  useEffect(() => { setHex(settings.accentColor); setHexError(''); }, [settings.accentColor]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  const update = (patch: Partial<BackgroundSettings>) => onUpdate(previous => ({ ...previous, ...patch }));
  const setAccent = (value: string) => update({ accentColor: value, syncWallpaperColors: false });
  const toggle = (key: 'syncWallpaperColors' | 'enableParticles' | 'enableNebula' | 'enableGlass', label: string, description?: string) => (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <span><span className="block text-sm text-zinc-200">{label}</span>{description && <span className="block mt-1 text-xs text-zinc-400">{description}</span>}</span>
      <input type="checkbox" role="switch" checked={settings[key]} onChange={event => update({ [key]: event.target.checked })}
        className="h-5 w-5 shrink-0 accent-tinapple-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tinapple-gold" />
    </label>
  );

  return (
    <dialog ref={dialogRef} aria-labelledby="appearance-title" onCancel={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="appearance-drawer fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0e1118]/95 p-0 text-zinc-200 backdrop-blur-2xl shadow-2xl">
      <div className="flex min-h-full flex-col" onClick={event => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#0e1118]/95 p-6 backdrop-blur-xl">
          <div>
            <h2 id="appearance-title" className="flex items-center gap-2 font-mono text-lg font-bold"><Palette className="h-5 w-5 text-tinapple-gold" />Appearance</h2>
            <p className="mt-1 text-xs text-zinc-400">Your space, your atmosphere. Changes apply instantly.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close appearance" className="rounded-xl p-2 hover:bg-white/10 focus-visible:outline-tinapple-gold"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-7 p-6">
          <section aria-labelledby="background-heading">
            <h3 id="background-heading" className="mb-3 text-xs font-mono uppercase tracking-wider text-zinc-400">Background</h3>
            <div className="grid grid-cols-2 gap-2">
              {modes.map(mode => <button key={mode.id} type="button" aria-pressed={settings.mode === mode.id} onClick={() => update({ mode: mode.id })}
                className={`rounded-xl border px-3 py-3 text-sm transition-colors ${settings.mode === mode.id ? 'border-tinapple-gold/60 bg-tinapple-gold/10 text-tinapple-gold' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}>{mode.label}</button>)}
            </div>
          </section>
          {settings.mode === 'wallpaper' && <section aria-labelledby="wallpaper-heading" className="space-y-4">
            <h3 id="wallpaper-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">Wallpaper</h3>
            <div className="grid grid-cols-2 gap-3">
              {BUNDLED_WALLPAPERS.map(wallpaper => <button key={wallpaper.url} type="button" onClick={() => { update({ wallpaperUrl: wallpaper.url }); setUrlError(''); }}
                aria-pressed={settings.wallpaperUrl === wallpaper.url} className={`overflow-hidden rounded-xl border text-left ${settings.wallpaperUrl === wallpaper.url ? 'border-tinapple-gold ring-1 ring-tinapple-gold' : 'border-white/10 hover:border-white/30'}`}>
                <img src={wallpaper.url} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                <span className="block px-2 py-2 text-xs">{wallpaper.name}</span>
              </button>)}
            </div>
            <form onSubmit={event => {
              event.preventDefault();
              if (!isWallpaperUrl(url.trim())) { setUrlError('Enter an HTTP(S) image URL or a local image path.'); return; }
              update({ wallpaperUrl: url.trim() }); setUrlError('');
            }}>
              <label htmlFor="wallpaper-url" className="mb-2 block text-xs text-zinc-400">Custom image URL</label>
              <div className="flex gap-2">
                <input id="wallpaper-url" type="text" value={url} onChange={event => setUrl(event.target.value)} className={fieldClass} placeholder="https://…/wallpaper.jpg" aria-describedby={urlError ? 'wallpaper-url-error' : undefined} aria-invalid={!!urlError} />
                <button type="submit" className="rounded-xl border border-white/10 px-4 text-sm hover:bg-white/10">Apply</button>
              </div>
              {urlError && <p id="wallpaper-url-error" role="alert" className="mt-2 text-xs text-red-400">{urlError}</p>}
            </form>
            <label className="block text-sm" htmlFor="wallpaper-dim">
              <span className="flex justify-between"><span>Dark overlay</span><span className="font-mono text-zinc-400">{Math.round(settings.wallpaperDim * 100)}%</span></span>
              <input id="wallpaper-dim" type="range" min="0.2" max="0.8" step="0.01" value={settings.wallpaperDim} onChange={event => update({ wallpaperDim: Number(event.target.value) })} className="mt-3 w-full accent-tinapple-gold" />
            </label>
            {toggle('syncWallpaperColors', 'Auto-Sync Accent Color with Wallpaper')}
            {colorStatus && <p role="status" className="text-xs text-zinc-400">{colorStatus}</p>}
          </section>}
          <section aria-labelledby="accent-heading" className="space-y-3">
            <h3 id="accent-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">Theme accent</h3>
            <div className="grid grid-cols-4 gap-3">
              {THEME_PALETTES.map(palette => {
                const selected = settings.accentColor === palette.primary && settings.secondaryColor === palette.secondary;
                return <button type="button" key={palette.name} aria-pressed={selected} onClick={() => update({ accentColor: palette.primary, secondaryColor: palette.secondary, syncWallpaperColors: false })}
                  className="flex flex-col items-center gap-2 rounded-lg p-1 hover:bg-white/5" title={palette.name}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/20 ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`} style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}>{selected && <Check className="h-4 w-4 text-black" />}</span>
                  <span className="text-center text-[10px] text-zinc-300">{palette.name}</span>
                </button>;
              })}
            </div>
            <p className="text-xs text-zinc-400">Picking a palette or custom color turns off wallpaper color sync.</p>
            <form onSubmit={event => { event.preventDefault(); if (isHexColor(hex)) { setAccent(hex); setHexError(''); } else setHexError('Use a six-digit hex color, such as #e5b567.'); }}>
              <label htmlFor="accent-hex" className="mb-2 block text-xs text-zinc-400">Custom accent</label>
              <div className="flex items-center gap-2">
                <input aria-label="Custom accent color picker" type="color" value={settings.accentColor} onChange={event => setAccent(event.target.value)} className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" />
                <input id="accent-hex" value={hex} onChange={event => setHex(event.target.value)} className={`${fieldClass} font-mono`} aria-invalid={!!hexError} aria-describedby={hexError ? 'accent-error' : undefined} />
                <button type="submit" className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">Apply</button>
              </div>
              {hexError && <p id="accent-error" role="alert" className="mt-2 text-xs text-red-400">{hexError}</p>}
            </form>
            <label className="flex items-center justify-between text-sm text-zinc-300">Secondary accent
              <input aria-label="Secondary accent color picker" type="color" value={settings.secondaryColor} onChange={event => update({ secondaryColor: event.target.value, syncWallpaperColors: false })} className="h-9 w-11 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" />
            </label>
          </section>
          <section aria-labelledby="ambient-heading">
            <h3 id="ambient-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">Ambient effects</h3>
            {toggle('enableParticles', 'Constellation Particles')}
            {toggle('enableNebula', 'Radial Nebula Glow')}
          </section>
          <section aria-labelledby="glass-heading" className="space-y-4">
            <h3 id="glass-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">Glassmorphism</h3>
            {toggle('enableGlass', 'Frosted Glass Translucency', 'Let your wallpaper and ambient effects shine through panels.')}
            <div className={`space-y-4 pt-1 transition-opacity ${settings.enableGlass ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <label className="block text-sm" htmlFor="glass-blur">
                <span className="flex justify-between">
                  <span className="text-zinc-200">Background Blur</span>
                  <span className="font-mono text-tinapple-gold font-bold">{settings.glassBlur}px</span>
                </span>
                <input
                  id="glass-blur"
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={settings.glassBlur}
                  onChange={event => update({ glassBlur: Number(event.target.value) })}
                  className="mt-2 w-full accent-tinapple-gold cursor-pointer"
                />
                <span className="block mt-1 text-xs text-zinc-400">Controls frosted backdrop diffusion</span>
              </label>

              <label className="block text-sm" htmlFor="glass-translucency">
                <span className="flex justify-between">
                  <span className="text-zinc-200">Glass Translucency</span>
                  <span className="font-mono text-tinapple-gold font-bold">{settings.glassTranslucency}%</span>
                </span>
                <input
                  id="glass-translucency"
                  type="range"
                  min="10"
                  max="90"
                  step="1"
                  value={settings.glassTranslucency}
                  onChange={event => update({ glassTranslucency: Number(event.target.value) })}
                  className="mt-2 w-full accent-tinapple-gold cursor-pointer"
                />
                <span className="block mt-1 text-xs text-zinc-400">Controls see-through glass clarity (higher = more translucent)</span>
              </label>
            </div>
          </section>
          <section aria-labelledby="scale-heading" className="space-y-3">
            <h3 id="scale-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">UI Display Scaling</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Compact', value: '90%' },
                { label: 'Default', value: '100%' },
                { label: 'Comfortable', value: '108%' },
                { label: 'Large', value: '115%' },
              ].map(preset => {
                const isSelected = (settings.uiScale || '100%') === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => update({ uiScale: preset.value })}
                    className={`p-2.5 rounded-xl text-xs font-mono transition-all text-center border ${
                      isSelected
                        ? 'border-tinapple-gold/60 bg-tinapple-gold/10 text-tinapple-gold shadow-sm'
                        : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                    }`}
                  >
                    <span className="block font-bold">{preset.label}</span>
                    <span className="text-[10px] opacity-75">{preset.value}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-400">Adjust the entire dashboard scale for your monitor resolution.</p>
          </section>
          <p role="status" className="text-xs text-zinc-500">{storageStatus || 'Preferences saved on this device.'}</p>
        </div>
      </div>
    </dialog>
  );
};

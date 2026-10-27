import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Palette,
  X,
  Check,
  Search,
  Shuffle,
  Upload,
  Play,
  Film,
  Sparkles,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import type { BackgroundMode, BackgroundSettings } from '../reactbits/FullWindowBackground';
import {
  BUNDLED_WALLPAPERS,
  THEME_PALETTES,
  isHexColor,
  isWallpaperUrl,
  extractWallpaperColors,
} from '../../theme/appearance';
import { api } from '../../services/api';
import { WallpaperItem } from '../../types/api';

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
  { id: 'plain', label: 'Graphic Minimal' },
  { id: 'aurora', label: 'Aurora Mesh (ReactBits)' },
  { id: 'waves', label: 'WebGL Waves' },
  { id: 'microslats', label: 'Micro Slats' },
  { id: 'wallpaper', label: 'Wallpaper Gallery' },
  { id: 'none', label: 'Solid Void' },
];

const WALLPAPER_CATEGORIES = [
  'All',
  'Animated',
  'Pixel Art',
  'Anime & Aesthetic',
  'Nature & Scenery',
  'Sci-Fi & Tech',
  'Pineapple',
];

const fieldClass =
  'w-full min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-tinapple-gold';

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  colorStatus,
  storageStatus,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState(settings.wallpaperUrl);
  const [urlError, setUrlError] = useState('');
  const [hex, setHex] = useState(settings.accentColor);
  const [hexError, setHexError] = useState('');

  // Wallpaper Gallery States
  const [gallery, setGallery] = useState<WallpaperItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    setUrl(settings.wallpaperUrl);
  }, [settings.wallpaperUrl]);

  useEffect(() => {
    setHex(settings.accentColor);
    setHexError('');
  }, [settings.accentColor]);

  // Load Wallpapers from API whenever dialog opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadWallpapers() {
      setIsLoadingGallery(true);
      try {
        const items = await api.getWallpapers();
        if (isMounted && items && items.length > 0) {
          setGallery(items);
        } else if (isMounted) {
          // Fallback to bundled
          const fallback: WallpaperItem[] = BUNDLED_WALLPAPERS.map((b) => ({
            id: b.name,
            name: b.name,
            file: b.url.replace('/wallpapers/', ''),
            url: b.url,
            isVideo: b.url.endsWith('.mp4') || b.url.endsWith('.webm'),
            category: b.name.includes('Pineapple') ? 'Pineapple' : b.name.includes('Pixel') ? 'Pixel Art' : 'Nature & Scenery',
            extension: '.' + b.url.split('.').pop(),
          }));
          setGallery(fallback);
        }
      } catch {
        if (isMounted) {
          const fallback: WallpaperItem[] = BUNDLED_WALLPAPERS.map((b) => ({
            id: b.name,
            name: b.name,
            file: b.url.replace('/wallpapers/', ''),
            url: b.url,
            isVideo: false,
            category: 'Nature & Scenery',
            extension: '.' + b.url.split('.').pop(),
          }));
          setGallery(fallback);
        }
      } finally {
        if (isMounted) setIsLoadingGallery(false);
      }
    }

    loadWallpapers();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Modal focus and scroll lock
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

  const update = (patch: Partial<BackgroundSettings>) =>
    onUpdate((previous) => ({ ...previous, ...patch }));

  const setAccent = (value: string) => update({ accentColor: value, syncWallpaperColors: false });

  // Handle Wallpaper Select (with color sampling and API notify)
  const handleSelectWallpaper = async (wp: WallpaperItem) => {
    update({ wallpaperUrl: wp.url });
    setUrlError('');

    // Inform server session
    api.selectWallpaper(wp.file);

    // Auto extract colors if enabled and not video
    if (settings.syncWallpaperColors && !wp.isVideo) {
      try {
        const abortCtrl = new AbortController();
        const [prim, sec] = await extractWallpaperColors(wp.url, abortCtrl.signal);
        if (prim && sec) {
          update({ accentColor: prim, secondaryColor: sec });
        }
      } catch (e) {
        console.debug('Color extraction:', e);
      }
    }
  };

  // Handle Random / Shuffle Wallpaper
  const handleShuffle = () => {
    const pool = filteredWallpapers.length > 0 ? filteredWallpapers : gallery;
    if (pool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pool.length);
    handleSelectWallpaper(pool[randomIndex]);
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage('Uploading wallpaper to server...');
    try {
      const res = await api.uploadWallpaper(file);
      if (res.ok && res.item) {
        setGallery((prev) => [res.item!, ...prev]);
        await handleSelectWallpaper(res.item);
        setUploadMessage('✓ Wallpaper uploaded and applied!');
        setTimeout(() => setUploadMessage(null), 3500);
      } else {
        setUploadMessage(res.error || 'Failed to upload wallpaper.');
        setTimeout(() => setUploadMessage(null), 4000);
      }
    } catch {
      setUploadMessage('Network error during upload.');
      setTimeout(() => setUploadMessage(null), 4000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filtered Wallpapers
  const filteredWallpapers = useMemo(() => {
    return gallery.filter((item) => {
      const matchesCat =
        selectedCategory === 'All' ||
        (selectedCategory === 'Animated' && item.isVideo) ||
        item.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.file.toLowerCase().includes(query);

      return matchesCat && matchesQuery;
    });
  }, [gallery, selectedCategory, searchQuery]);

  const toggle = (
    key: 'syncWallpaperColors' | 'enableParticles' | 'enableNebula' | 'enableGlass',
    label: string,
    description?: string
  ) => (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <span>
        <span className="block text-sm text-zinc-200">{label}</span>
        {description && <span className="block mt-1 text-xs text-zinc-400">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={settings[key]}
        onChange={(event) => update({ [key]: event.target.checked })}
        className="h-5 w-5 shrink-0 accent-tinapple-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tinapple-gold"
      />
    </label>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="appearance-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="appearance-drawer fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0e1118]/95 p-0 text-zinc-200 backdrop-blur-2xl shadow-2xl z-50"
    >
      <div className="flex min-h-full flex-col" onClick={(event) => event.stopPropagation()}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-[#0e1118]/95 p-5 sm:p-6 backdrop-blur-xl">
          <div>
            <h2 id="appearance-title" className="flex items-center gap-2 font-mono text-lg font-bold">
              <Palette className="h-5 w-5 text-tinapple-gold" />
              Portal Appearance & Atmosphere
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400 font-mono">
              Live Pywal colors, video loops, and glass styling
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close appearance"
            className="rounded-xl p-2 hover:bg-white/10 focus-visible:outline-tinapple-gold text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-7 p-5 sm:p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
          {/* Background Mode Selection */}
          <section aria-labelledby="background-heading">
            <h3 id="background-heading" className="mb-3 text-xs font-mono uppercase tracking-wider text-zinc-400">
              Backdrop Engine
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={settings.mode === mode.id}
                  onClick={() => update({ mode: mode.id })}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-mono transition-all text-center ${
                    settings.mode === mode.id
                      ? 'border-tinapple-gold/70 bg-tinapple-gold/15 text-tinapple-gold font-bold shadow-sm shadow-tinapple-gold/10'
                      : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07] hover:border-white/20'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </section>

          {/* Wallpaper Gallery Section */}
          {settings.mode === 'wallpaper' && (
            <section aria-labelledby="wallpaper-heading" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id="wallpaper-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Wallpaper Library ({gallery.length} from imyash0722/Wallpapers)
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Click any image or video loop to set immediately
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShuffle}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold transition-all active:scale-95"
                    title="Randomly pick a wallpaper from the collection"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Shuffle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tinapple-gold/15 hover:bg-tinapple-gold/25 border border-tinapple-gold/30 text-tinapple-gold text-xs font-mono font-semibold transition-all active:scale-95 disabled:opacity-50"
                    title="Upload your own wallpaper image or MP4 loop"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {uploadMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono animate-pulse">
                  {uploadMessage}
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter 120+ wallpapers by name or style..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-tinapple-gold transition-colors"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {WALLPAPER_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold whitespace-nowrap transition-all shrink-0 ${
                        isSelected
                          ? 'bg-tinapple-gold text-slate-950 shadow-sm'
                          : 'bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredWallpapers.map((wallpaper) => {
                  const isSelected =
                    settings.wallpaperUrl === wallpaper.url ||
                    settings.wallpaperUrl.endsWith(wallpaper.file);

                  return (
                    <button
                      key={wallpaper.url}
                      type="button"
                      onClick={() => handleSelectWallpaper(wallpaper)}
                      aria-pressed={isSelected}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-tinapple-gold ring-2 ring-tinapple-gold/70 shadow-lg shadow-tinapple-gold/20'
                          : 'border-white/10 hover:border-white/30 hover:shadow-md'
                      }`}
                    >
                      {wallpaper.isVideo ? (
                        <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
                          <video
                            src={wallpaper.url}
                            muted
                            loop
                            autoPlay
                            playsInline
                            className="aspect-video w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-[9px] font-mono font-bold text-purple-300 backdrop-blur-sm">
                            <Film className="w-2.5 h-2.5" />
                            <span>LOOP</span>
                          </span>
                        </div>
                      ) : (
                        <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
                          <img
                            src={wallpaper.url}
                            alt={wallpaper.name}
                            loading="lazy"
                            className="aspect-video w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-tinapple-gold text-slate-950 flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      <div className="p-2 bg-slate-900/90 border-t border-white/5 backdrop-blur-sm">
                        <span className="block text-[11px] font-mono font-semibold text-zinc-200 truncate group-hover:text-tinapple-gold transition-colors">
                          {wallpaper.name}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400 capitalize">
                          {wallpaper.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredWallpapers.length === 0 && (
                <div className="text-center py-8 text-xs font-mono text-zinc-400 border border-dashed border-white/10 rounded-xl">
                  No wallpapers found matching "{searchQuery}".
                </div>
              )}

              {/* Custom Image URL Form */}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!isWallpaperUrl(url.trim())) {
                    setUrlError('Enter an HTTP(S) image URL or a local image path.');
                    return;
                  }
                  update({ wallpaperUrl: url.trim() });
                  setUrlError('');
                }}
              >
                <label htmlFor="wallpaper-url" className="mb-2 block text-xs text-zinc-400 font-mono">
                  Custom image or video URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="wallpaper-url"
                    type="text"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    className={fieldClass}
                    placeholder="https://…/wallpaper.jpg or /wallpapers/..."
                    aria-describedby={urlError ? 'wallpaper-url-error' : undefined}
                    aria-invalid={!!urlError}
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-white/10 px-4 text-xs font-mono hover:bg-white/10 shrink-0 font-semibold"
                  >
                    Apply
                  </button>
                </div>
                {urlError && (
                  <p id="wallpaper-url-error" role="alert" className="mt-2 text-xs text-red-400 font-mono">
                    {urlError}
                  </p>
                )}
              </form>

              {/* Dark Overlay Slider */}
              <label className="block text-sm" htmlFor="wallpaper-dim">
                <span className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300">Dark Contrast Overlay</span>
                  <span className="font-mono text-tinapple-gold font-bold">
                    {Math.round(settings.wallpaperDim * 100)}%
                  </span>
                </span>
                <input
                  id="wallpaper-dim"
                  type="range"
                  min="0.1"
                  max="0.85"
                  step="0.01"
                  value={settings.wallpaperDim}
                  onChange={(event) => update({ wallpaperDim: Number(event.target.value) })}
                  className="mt-2 w-full accent-tinapple-gold cursor-pointer"
                />
              </label>

              {toggle(
                'syncWallpaperColors',
                'Dynamic Pywal Auto-Color Sampling',
                'Automatically sample dominant accent hues from each selected wallpaper.'
              )}
              {colorStatus && <p role="status" className="text-xs text-zinc-400 font-mono">{colorStatus}</p>}
            </section>
          )}

          {/* Accent Color Palettes */}
          <section aria-labelledby="accent-heading" className="space-y-3">
            <h3 id="accent-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Theme Accent Palette
            </h3>
            <div className="grid grid-cols-5 gap-2.5">
              {THEME_PALETTES.map((palette) => {
                const selected =
                  settings.accentColor === palette.primary && settings.secondaryColor === palette.secondary;
                return (
                  <button
                    type="button"
                    key={palette.name}
                    aria-pressed={selected}
                    onClick={() =>
                      update({
                        accentColor: palette.primary,
                        secondaryColor: palette.secondary,
                        syncWallpaperColors: false,
                      })
                    }
                    className="flex flex-col items-center gap-1.5 rounded-xl p-1.5 hover:bg-white/5 transition-all"
                    title={palette.name}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/20 transition-transform ${
                        selected ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-105' : 'hover:scale-105'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
                    >
                      {selected && <Check className="h-4 w-4 text-black stroke-[3]" />}
                    </span>
                    <span className="text-center text-[9px] font-mono text-zinc-400 line-clamp-1">{palette.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Selecting a palette turns off wallpaper auto-sampling.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (isHexColor(hex)) {
                  setAccent(hex);
                  setHexError('');
                } else setHexError('Use a six-digit hex color, such as #38bdf8.');
              }}
            >
              <label htmlFor="accent-hex" className="mb-2 block text-xs text-zinc-400 font-mono">
                Custom Primary Accent
              </label>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Custom accent color picker"
                  type="color"
                  value={settings.accentColor}
                  onChange={(event) => setAccent(event.target.value)}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                />
                <input
                  id="accent-hex"
                  value={hex}
                  onChange={(event) => setHex(event.target.value)}
                  className={`${fieldClass} font-mono`}
                  aria-invalid={!!hexError}
                  aria-describedby={hexError ? 'accent-error' : undefined}
                />
                <button
                  type="submit"
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-mono font-semibold hover:bg-white/10"
                >
                  Apply
                </button>
              </div>
              {hexError && (
                <p id="accent-error" role="alert" className="mt-2 text-xs text-red-400 font-mono">
                  {hexError}
                </p>
              )}
            </form>

            <label className="flex items-center justify-between text-xs font-mono text-zinc-300">
              Secondary Accent Hue
              <input
                aria-label="Secondary accent color picker"
                type="color"
                value={settings.secondaryColor}
                onChange={(event) => update({ secondaryColor: event.target.value, syncWallpaperColors: false })}
                className="h-8 w-10 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
              />
            </label>
          </section>

          {/* Ambient Effects */}
          <section aria-labelledby="ambient-heading">
            <h3 id="ambient-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Ambient Matrix
            </h3>
            {toggle('enableParticles', 'Constellation Particles', 'Floating ambient particles responding to mouse motion.')}
            {toggle('enableNebula', 'Radial Nebula Glow', 'Atmospheric soft radial glow tuned to primary & secondary accents.')}
          </section>

          {/* Frosted Glass Translucency */}
          <section aria-labelledby="glass-heading" className="space-y-4">
            <h3 id="glass-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Frosted Glassmorphism
            </h3>
            {toggle('enableGlass', 'Frosted Glass Panels', 'Let your wallpaper shine through widgets and control cards.')}
            <div
              className={`space-y-4 pt-1 transition-opacity ${
                settings.enableGlass ? 'opacity-100' : 'opacity-40 pointer-events-none'
              }`}
            >
              <label className="block text-sm" htmlFor="glass-blur">
                <span className="flex justify-between text-xs font-mono">
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
                  onChange={(event) => update({ glassBlur: Number(event.target.value) })}
                  className="mt-2 w-full accent-tinapple-gold cursor-pointer"
                />
              </label>

              <label className="block text-sm" htmlFor="glass-translucency">
                <span className="flex justify-between text-xs font-mono">
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
                  onChange={(event) => update({ glassTranslucency: Number(event.target.value) })}
                  className="mt-2 w-full accent-tinapple-gold cursor-pointer"
                />
              </label>
            </div>
          </section>

          {/* UI Scaling */}
          <section aria-labelledby="scale-heading" className="space-y-3">
            <h3 id="scale-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              UI Display Scaling
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Compact', value: '90%' },
                { label: 'Default', value: '100%' },
                { label: 'Comfortable', value: '108%' },
                { label: 'Large', value: '115%' },
              ].map((preset) => {
                const isSelected = (settings.uiScale || '100%') === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => update({ uiScale: preset.value })}
                    className={`p-2.5 rounded-xl text-xs font-mono transition-all text-center border ${
                      isSelected
                        ? 'border-tinapple-gold/70 bg-tinapple-gold/15 text-tinapple-gold font-bold shadow-sm'
                        : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                    }`}
                  >
                    <span className="block font-bold">{preset.label}</span>
                    <span className="text-[10px] opacity-75">{preset.value}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <p role="status" className="text-xs text-zinc-500 font-mono">
            {storageStatus || 'Preferences stored locally. Instantaneous client persistence.'}
          </p>
        </div>
      </div>
    </dialog>
  );
};

export default AppearanceModal;

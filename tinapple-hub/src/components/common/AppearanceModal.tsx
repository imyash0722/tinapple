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
import { SquishSwitch } from '../reactbits/SquishSwitch';
import { AndroidBridge } from '../../services/androidBridge';

export { BUNDLED_WALLPAPERS, THEME_PALETTES } from '../../theme/appearance';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BackgroundSettings;
  onUpdate: React.Dispatch<React.SetStateAction<BackgroundSettings>>;
  colorStatus?: string;
  storageStatus?: string;
  isSidebarPinned?: boolean;
  onToggleSidebarPinned?: () => void;
  onToggleSidebarDrawer?: () => void;
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
  'Atmospheric',
  'Pixel Art',
  'Anime & Aesthetic',
  'Nature & Scenery',
  'Sci-Fi & Tech',
  'Pineapple',
];

const DEFAULT_WALLPAPERS: WallpaperItem[] = BUNDLED_WALLPAPERS.map((b) => ({
  id: b.name,
  name: b.name,
  file: b.url.replace('/wallpapers/', ''),
  url: b.url,
  isVideo: b.url.endsWith('.mp4') || b.url.endsWith('.webm'),
  category: b.name.includes('Pineapple') ? 'Pineapple' : b.name.includes('Pixel') ? 'Pixel Art' : 'Nature & Scenery',
  extension: '.' + b.url.split('.').pop(),
}));

const fieldClass =
  'w-full min-w-0 rounded-xl border border-outline-variant/50 bg-black/20 px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-tinapple-gold';

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  colorStatus,
  storageStatus,
  isSidebarPinned,
  onToggleSidebarPinned,
  onToggleSidebarDrawer,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorAbortRef = useRef<AbortController | null>(null);

  const [url, setUrl] = useState(settings.wallpaperUrl);
  const [urlError, setUrlError] = useState('');
  const [hex, setHex] = useState(settings.accentColor);
  const [hexError, setHexError] = useState('');

  // Wallpaper Gallery States - pre-populated with bundled items so modal opens instantly without blank state
  const [gallery, setGallery] = useState<WallpaperItem[]>(DEFAULT_WALLPAPERS);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displayLimit, setDisplayLimit] = useState<number>(24);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (colorAbortRef.current) {
        colorAbortRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    setDisplayLimit(24);
  }, [selectedCategory, searchQuery]);

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
        }
      } catch {
        // Keep existing/fallback gallery on error
      } finally {
        if (isMounted) setIsLoadingGallery(false);
      }
    }

    loadWallpapers();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Modal escape key and scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const update = (patch: Partial<BackgroundSettings>) =>
    onUpdate((previous) => ({ ...previous, ...patch }));

  const setAccent = (value: string) => update({ accentColor: value, syncWallpaperColors: false });

  // Handle Wallpaper Select (instant UI response + async non-blocking color sampling)
  const handleSelectWallpaper = (wp: WallpaperItem) => {
    setUrlError('');
    AndroidBridge.performHaptic('light');

    // 1. Immediately apply wallpaper to settings for instantaneous visual feedback
    update({
      mode: 'wallpaper',
      wallpaperUrl: wp.url,
      syncWallpaperColors: true,
    });

    // 2. Notify server session in background
    api.selectWallpaper(wp.file).catch(() => {});

    // 3. Auto extract colors asynchronously without blocking UI or freezing main thread
    if (!wp.isVideo) {
      if (colorAbortRef.current) {
        colorAbortRef.current.abort();
      }
      const abortCtrl = new AbortController();
      colorAbortRef.current = abortCtrl;

      extractWallpaperColors(wp.url, abortCtrl.signal)
        .then(([prim, sec]) => {
          if (!abortCtrl.signal.aborted && prim && sec) {
            update({
              accentColor: prim,
              secondaryColor: sec,
            });
          }
        })
        .catch((e) => {
          if (!abortCtrl.signal.aborted) {
            console.debug('Background color extraction:', e);
          }
        });
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
    <div className="flex items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm text-on-surface">{label}</span>
        {description && <span className="block mt-1 text-xs text-on-surface-variant">{description}</span>}
      </span>
      <SquishSwitch
        label={label}
        checked={settings[key]}
        onChange={async (val) => {
          if (key === 'syncWallpaperColors' && val) {
            update({ syncWallpaperColors: true });
            if (settings.mode === 'wallpaper' && settings.wallpaperUrl) {
              try {
                const abortCtrl = new AbortController();
                const [prim, sec] = await extractWallpaperColors(settings.wallpaperUrl, abortCtrl.signal);
                if (prim && sec) {
                  update({ syncWallpaperColors: true, accentColor: prim, secondaryColor: sec });
                }
              } catch (e) {
                console.debug('Toggle sync extraction:', e);
              }
            }
          } else {
            update({ [key]: val });
          }
        }}
        variant="amber"
        size="sm"
      />
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appearance-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="appearance-drawer relative h-full w-full max-w-xl overflow-y-auto border-l border-outline-variant/50 bg-surface-container-high p-0 text-on-surface backdrop-blur-2xl shadow-2xl overscroll-contain flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-outline-variant/50 bg-surface-container-high p-5 sm:p-6 backdrop-blur-xl">
          <div>
            <h2 id="appearance-title" className="flex items-center gap-2 font-sans text-lg font-bold">
              <Palette className="h-5 w-5 text-tinapple-gold" />
              Appearance & theme
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-variant font-sans">
              Material You colors, wallpapers, and matte surfaces
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              AndroidBridge.performHaptic('light');
              onClose();
            }}
            aria-label="Close appearance"
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-highest/60 hover:bg-surface-container-highest active:bg-primary/20 text-on-surface transition-all touch-manipulation active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-7 p-5 sm:p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
          {/* Background Mode Selection */}
          <section aria-labelledby="background-heading">
            <h3 id="background-heading" className="mb-3 text-xs font-sans uppercase tracking-wider text-on-surface-variant">
              Backdrop Engine
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={settings.mode === mode.id}
                  onClick={() => update({ mode: mode.id })}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-sans transition-all text-center ${
                    settings.mode === mode.id
                      ? 'border-tinapple-gold/70 bg-tinapple-gold/15 text-tinapple-gold font-bold shadow-sm shadow-tinapple-gold/10'
                      : 'border-outline-variant/50 bg-white/[0.03] text-on-surface hover:bg-white/[0.07] hover:border-outline-variant/50'
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
                  <h3 id="wallpaper-heading" className="text-xs font-sans uppercase tracking-wider text-on-surface-variant">
                    Wallpaper Library ({gallery.length} from imyash0722/Wallpapers)
                  </h3>
                  <p className="text-[11px] text-on-surface-variant font-sans mt-0.5">
                    Click any image or video loop to set immediately
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShuffle}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-sans font-semibold transition-all active:scale-95"
                    title="Randomly pick a wallpaper from the collection"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Shuffle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tinapple-gold/15 hover:bg-tinapple-gold/25 border border-tinapple-gold/30 text-tinapple-gold text-xs font-sans font-semibold transition-all active:scale-95 disabled:opacity-50"
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
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-sans animate-pulse">
                  {uploadMessage}
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Filter 120+ wallpapers by name or style..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/30 border border-outline-variant/50 text-xs font-sans text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-tinapple-gold transition-colors"
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
                      className={`px-3 py-1 rounded-lg text-xs font-sans font-semibold whitespace-nowrap transition-all shrink-0 ${
                        isSelected
                          ? 'bg-tinapple-gold text-slate-950 shadow-sm'
                          : 'bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 border border-outline-variant/50'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin overscroll-contain touch-pan-y">
                {filteredWallpapers.slice(0, displayLimit).map((wallpaper) => {
                  const isSelected =
                    settings.wallpaperUrl === wallpaper.url ||
                    settings.wallpaperUrl.endsWith(wallpaper.file);

                  return (
                    <button
                      key={wallpaper.url}
                      type="button"
                      onClick={() => handleSelectWallpaper(wallpaper)}
                      aria-pressed={isSelected}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-all touch-manipulation active:scale-[0.98] ${
                        isSelected
                          ? 'border-tinapple-gold ring-2 ring-tinapple-gold/70 shadow-none shadow-tinapple-gold/20'
                          : 'border-outline-variant/50 hover:border-white/30 hover:shadow-none'
                      }`}
                    >
                      {wallpaper.isVideo ? (
                        <div className="relative aspect-video w-full bg-black/40 overflow-hidden pointer-events-none select-none">
                          <video
                            src={wallpaper.url}
                            muted
                            loop
                            autoPlay={isSelected}
                            preload="none"
                            playsInline
                            className="aspect-video w-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                            onMouseEnter={(e) => {
                              try {
                                e.currentTarget.play().catch(() => {});
                              } catch {}
                            }}
                            onMouseLeave={(e) => {
                              try {
                                if (!isSelected) e.currentTarget.pause();
                              } catch {}
                            }}
                          />
                          <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-[9px] font-sans font-bold text-purple-300 backdrop-blur-sm pointer-events-none">
                            <Film className="w-2.5 h-2.5" />
                            <span>VIDEO</span>
                          </span>
                        </div>
                      ) : (
                        <div className="relative aspect-video w-full bg-black/40 overflow-hidden pointer-events-none select-none">
                          <img
                            src={wallpaper.url}
                            alt={wallpaper.name}
                            loading="lazy"
                            decoding="async"
                            className="aspect-video w-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                          />
                        </div>
                      )}

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-tinapple-gold text-slate-950 flex items-center justify-center shadow-none pointer-events-none">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      <div className="p-2 bg-surface-container-low border-t border-outline-variant/50 backdrop-blur-sm pointer-events-none">
                        <span className="block text-[11px] font-sans font-semibold text-on-surface truncate group-hover:text-tinapple-gold transition-colors">
                          {wallpaper.name}
                        </span>
                        <span className="text-[9px] font-sans text-on-surface-variant capitalize">
                          {wallpaper.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Show more wallpapers button if list exceeds display limit */}
              {filteredWallpapers.length > displayLimit && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setDisplayLimit((prev) => prev + 24)}
                    className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-sans font-semibold text-on-surface transition-all active:scale-95"
                  >
                    Load More Wallpapers ({filteredWallpapers.length - displayLimit} remaining)
                  </button>
                </div>
              )}

              {isLoadingGallery && gallery.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-xs font-sans text-on-surface-variant gap-3 border border-outline-variant/40 rounded-xl bg-black/10">
                  <Loader2 className="w-6 h-6 animate-spin text-tinapple-gold" />
                  <span>Loading wallpaper collection...</span>
                </div>
              ) : filteredWallpapers.length === 0 ? (
                <div className="text-center py-8 text-xs font-sans text-on-surface-variant border border-dashed border-outline-variant/50 rounded-xl">
                  {searchQuery ? `No wallpapers found matching "${searchQuery}".` : 'No wallpapers found in this category.'}
                </div>
              ) : null}

              {/* Custom Image URL Form */}
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const targetUrl = url.trim();
                  if (!isWallpaperUrl(targetUrl)) {
                    setUrlError('Enter an HTTP(S) image URL or a local image path.');
                    return;
                  }
                  setUrlError('');
                  const partial: Partial<BackgroundSettings> = {
                    mode: 'wallpaper',
                    wallpaperUrl: targetUrl,
                  };
                  if (settings.syncWallpaperColors && !targetUrl.match(/\.(mp4|webm)(\?.*)?$/i)) {
                    try {
                      const abortCtrl = new AbortController();
                      const [prim, sec] = await extractWallpaperColors(targetUrl, abortCtrl.signal);
                      if (prim && sec) {
                        partial.accentColor = prim;
                        partial.secondaryColor = sec;
                      }
                    } catch (e) {
                      console.debug('Custom URL color extraction:', e);
                    }
                  }
                  update(partial);
                }}
              >
                <label htmlFor="wallpaper-url" className="mb-2 block text-xs text-on-surface-variant font-sans">
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
                    className="rounded-xl border border-outline-variant/50 px-4 text-xs font-sans hover:bg-white/10 shrink-0 font-semibold"
                  >
                    Apply
                  </button>
                </div>
                {urlError && (
                  <p id="wallpaper-url-error" role="alert" className="mt-2 text-xs text-red-400 font-sans">
                    {urlError}
                  </p>
                )}
              </form>

              {/* Wallpaper Blur Slider */}
              <label className="block text-sm" htmlFor="wallpaper-blur">
                <span className="flex justify-between text-xs font-sans">
                  <span className="text-on-surface">Wallpaper Blur</span>
                  <span className="font-sans text-tinapple-gold font-bold">
                    {settings.wallpaperBlur || 0}px
                  </span>
                </span>
                <input
                  id="wallpaper-blur"
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={settings.wallpaperBlur || 0}
                  onChange={(event) => update({ wallpaperBlur: Number(event.target.value) })}
                  className="mt-2 w-full accent-tinapple-gold cursor-pointer"
                />
              </label>

              {/* Dark Overlay Slider */}
              <label className="block text-sm" htmlFor="wallpaper-dim">
                <span className="flex justify-between text-xs font-sans">
                  <span className="text-on-surface">Dark Contrast Overlay</span>
                  <span className="font-sans text-tinapple-gold font-bold">
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
                'Material 3 (M3) Matugen Wallpaper Sync',
                'Automatically generate full Material You M3 palette from the active wallpaper.'
              )}
              {colorStatus && <p role="status" className="text-xs text-on-surface-variant font-sans">{colorStatus}</p>}

              {/* Live Material 3 Token Chips */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-outline-variant/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans text-tinapple-gold font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Material 3 (M3) Matugen
                  </span>
                  <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    M3 Tokens Active
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 pt-1">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg border border-outline-variant/50 shadow-sm" style={{ backgroundColor: 'var(--md-sys-color-primary, #38bdf8)' }} />
                    <span className="text-[9px] font-sans text-on-surface-variant mt-1">Primary</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg border border-outline-variant/50 shadow-sm" style={{ backgroundColor: 'var(--md-sys-color-primary-container, #004d67)' }} />
                    <span className="text-[9px] font-sans text-on-surface-variant mt-1">Container</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg border border-outline-variant/50 shadow-sm" style={{ backgroundColor: 'var(--md-sys-color-secondary, #b5c9d7)' }} />
                    <span className="text-[9px] font-sans text-on-surface-variant mt-1">Secondary</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg border border-outline-variant/50 shadow-sm" style={{ backgroundColor: 'var(--md-sys-color-tertiary, #cac1e9)' }} />
                    <span className="text-[9px] font-sans text-on-surface-variant mt-1">Tertiary</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg border border-outline-variant/50 shadow-sm" style={{ backgroundColor: 'var(--md-sys-color-surface-container, #101828)' }} />
                    <span className="text-[9px] font-sans text-on-surface-variant mt-1">Surface</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg border border-outline-variant/50 shadow-sm" style={{ backgroundColor: 'var(--md-sys-color-outline-variant, #3f4755)' }} />
                    <span className="text-[9px] font-sans text-on-surface-variant mt-1">Outline</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Accent Color Palettes */}
          <section aria-labelledby="accent-heading" className="space-y-3">
            <h3 id="accent-heading" className="text-xs font-sans uppercase tracking-wider text-on-surface-variant">
              Theme Accent Palette
            </h3>
            <div className="flex gap-2" aria-label="Color mode">
              {(['dark', 'light'] as const).map(mode => (
                <button key={mode} type="button" aria-pressed={(settings.colorMode || 'dark') === mode}
                  onClick={() => update({ colorMode: mode })}
                  className={`m3-button ${(settings.colorMode || 'dark') === mode ? 'm3-button-tonal' : 'm3-button-outlined'}`}>
                  {mode === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
            <div className="flex gap-2" aria-label="Tonal elevation preview">
              {['lowest', 'low', '', 'high', 'highest'].map((level, index) => (
                <span key={level} title={`Surface container ${level || 'default'}`} className="h-8 w-8 rounded-full border border-outline-variant flex items-center justify-center text-xs"
                  style={{ background: `var(--md-sys-color-surface-container${level ? '-' + level : ''})` }}>{index}</span>
              ))}
            </div>
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
                      className={`flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/50 transition-transform ${
                        selected ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-105' : 'hover:scale-105'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
                    >
                      {selected && <Check className="h-4 w-4 text-black stroke-[3]" />}
                    </span>
                    <span className="text-center text-[9px] font-sans text-on-surface-variant line-clamp-1">{palette.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-on-surface-variant font-sans">
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
              <label htmlFor="accent-hex" className="mb-2 block text-xs text-on-surface-variant font-sans">
                Custom Primary Accent
              </label>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Custom accent color picker"
                  type="color"
                  value={settings.accentColor}
                  onChange={(event) => setAccent(event.target.value)}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-outline-variant/50 bg-transparent p-1"
                />
                <input
                  id="accent-hex"
                  value={hex}
                  onChange={(event) => setHex(event.target.value)}
                  className={`${fieldClass} font-sans`}
                  aria-invalid={!!hexError}
                  aria-describedby={hexError ? 'accent-error' : undefined}
                />
                <button
                  type="submit"
                  className="rounded-xl border border-outline-variant/50 px-4 py-2 text-xs font-sans font-semibold hover:bg-white/10"
                >
                  Apply
                </button>
              </div>
              {hexError && (
                <p id="accent-error" role="alert" className="mt-2 text-xs text-red-400 font-sans">
                  {hexError}
                </p>
              )}
            </form>

            <label className="flex items-center justify-between text-xs font-sans text-on-surface">
              Secondary Accent Hue
              <input
                aria-label="Secondary accent color picker"
                type="color"
                value={settings.secondaryColor}
                onChange={(event) => update({ secondaryColor: event.target.value, syncWallpaperColors: false })}
                className="h-8 w-10 cursor-pointer rounded-lg border border-outline-variant/50 bg-transparent p-1"
              />
            </label>
          </section>

          {/* Ambient Effects */}
          <section aria-labelledby="ambient-heading">
            <h3 id="ambient-heading" className="text-xs font-sans uppercase tracking-wider text-on-surface-variant">
              Ambient Matrix
            </h3>
            {toggle('enableParticles', 'Constellation Particles', 'Floating ambient particles responding to mouse motion.')}
            {toggle('enableNebula', 'Radial Nebula Glow', 'Atmospheric soft radial glow tuned to primary & secondary accents.')}
          </section>

          {/* Component Translucency & Liquid Glass */}
          <section aria-labelledby="glass-heading" className="space-y-4">
            <div>
              <h3 id="glass-heading" className="text-xs font-sans uppercase tracking-wider text-on-surface-variant font-bold">
                Component Translucency & Liquid Glass
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5 font-sans">
                Control the liquid-like transparency and frosted diffusion of dashboard cards, tiles, and headers.
              </p>
            </div>
            {toggle('enableGlass', 'Liquid Glass Panels', 'Let your wallpaper shine through widgets and control cards.')}
            <div
              className={`space-y-4 pt-1 transition-opacity ${
                settings.enableGlass ? 'opacity-100' : 'opacity-40 pointer-events-none'
              }`}
            >
              <label className="block text-sm" htmlFor="glass-translucency">
                <span className="flex justify-between text-xs font-sans">
                  <span className="text-on-surface">Component Transparency</span>
                  <span className="font-sans text-tinapple-gold font-bold">{settings.glassTranslucency}%</span>
                </span>
                <input
                  id="glass-translucency"
                  type="range"
                  min="0"
                  max="90"
                  step="1"
                  value={settings.glassTranslucency}
                  onChange={(event) => update({ glassTranslucency: Number(event.target.value) })}
                  className="mt-2 w-full accent-tinapple-gold cursor-pointer"
                />
                <span className="block text-[10px] text-on-surface-variant mt-1 font-sans">
                  0% is solid matte Material 3; higher values produce liquid transparent glass.
                </span>
              </label>

              <label className="block text-sm" htmlFor="glass-blur">
                <span className="flex justify-between text-xs font-sans">
                  <span className="text-on-surface">Frosted Glass Diffusion</span>
                  <span className="font-sans text-tinapple-gold font-bold">{settings.glassBlur}px</span>
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
                <span className="block text-[10px] text-on-surface-variant mt-1 font-sans">
                  Backdrop blur dispersion applied to translucent components.
                </span>
              </label>
            </div>
          </section>

          {/* Navigation & Sidebar Layout */}
          <section aria-labelledby="sidebar-heading" className="space-y-3">
            <h3 id="sidebar-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Sidebar & Navigation Layout
            </h3>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-mono font-bold text-white">Auto-Hide Left Sidebar</span>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Conceals the navigation sidebar for a clean edge-to-edge fullscreen canvas. Glides in smoothly when hovering near the left screen edge or pressing <span className="text-tinapple-gold font-bold">Ctrl+B</span>.
                  </p>
                </div>
                <SquishSwitch
                  checked={Boolean(settings.sidebarAutohide)}
                  onChange={(checked) => {
                    update({ sidebarAutohide: checked });
                    if (onToggleSidebarPinned && ((checked && isSidebarPinned) || (!checked && !isSidebarPinned))) {
                      onToggleSidebarPinned();
                    }
                  }}
                  title="Toggle Sidebar Auto-Hide Mode"
                />
              </div>
            </div>
          </section>

          {/* UI Scaling */}
          <section aria-labelledby="scale-heading" className="space-y-3">
            <h3 id="scale-heading" className="text-xs font-sans uppercase tracking-wider text-on-surface-variant">
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
                    className={`p-2.5 rounded-xl text-xs font-sans transition-all text-center border ${
                      isSelected
                        ? 'border-tinapple-gold/70 bg-tinapple-gold/15 text-tinapple-gold font-bold shadow-sm'
                        : 'border-outline-variant/50 bg-white/[0.03] text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50'
                    }`}
                  >
                    <span className="block font-bold">{preset.label}</span>
                    <span className="text-[10px] opacity-75">{preset.value}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <p role="status" className="text-xs text-on-surface-variant font-sans">
            {storageStatus || 'Preferences stored locally. Instantaneous client persistence.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppearanceModal;

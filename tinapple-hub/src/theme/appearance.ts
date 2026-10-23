import type { BackgroundSettings } from '../components/reactbits/FullWindowBackground';

export const THEME_STORAGE_KEY = 'tinapple_theme_settings';
export const DEFAULT_SETTINGS: BackgroundSettings = {
  mode: 'microslats',
  wallpaperUrl: '/wallpapers/tinapple-orange-wallpaper.png',
  wallpaperDim: 0.5,
  accentColor: '#e5b567',
  secondaryColor: '#7ec789',
  syncWallpaperColors: true,
  enableParticles: true,
  enableNebula: true,
  enableGlass: true,
  glassBlur: 20,
  glassOpacity: 75,
  uiScale: '100%',
};

export const THEME_PALETTES = [
  { name: 'Pineapple Gold', primary: '#e5b567', secondary: '#7ec789' },
  { name: 'Emerald Palm', primary: '#10b981', secondary: '#34d399' },
  { name: 'Cyber Cyan', primary: '#06b6d4', secondary: '#3b82f6' },
  { name: 'Amethyst Purple', primary: '#a855f7', secondary: '#ec4899' },
  { name: 'Sunset Amber', primary: '#f97316', secondary: '#eab308' },
  { name: 'Rose Quartz', primary: '#f43f5e', secondary: '#fb7185' },
  { name: 'Monochrome Frost', primary: '#e4e4e7', secondary: '#a1a1aa' },
];

export const BUNDLED_WALLPAPERS = [
  { name: 'Pineapple Sunset', url: '/wallpapers/tinapple-orange-wallpaper.png', defaultPrimary: '#f59e0b', defaultSecondary: '#7ec789' },
  { name: 'Golden Pineapple HD', url: '/wallpapers/Aesthetic-Pineapple-Wallpaper-HD.jpg', defaultPrimary: '#e5b567', defaultSecondary: '#10b981' },
  { name: 'Tropical Palm', url: '/wallpapers/1205654.jpg', defaultPrimary: '#7ec789', defaultSecondary: '#06b6d4' },
  { name: 'Obsidian Minimal', url: '/wallpapers/tinapple-cinematic-monochrome.png', defaultPrimary: '#e4e4e7', defaultSecondary: '#71717a' },
  { name: 'Pineapple Modern', url: '/wallpapers/Aesthetic-Pineapple-Wallpaper-1920x1080-1.jpg', defaultPrimary: '#facc15', defaultSecondary: '#10b981' },
];

export const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
export const colorChannels = (hex: string) => [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(' ');

export function isWallpaperUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value, 'https://tinapple.local').protocol);
  } catch { return false; }
}

export function normalizeSettings(value: unknown): BackgroundSettings {
  const settings = { ...DEFAULT_SETTINGS };
  if (!value || typeof value !== 'object') return settings;
  const saved = value as Record<string, unknown>;
  if (['microslats', 'waves', 'wallpaper', 'none'].includes(saved.mode as string)) settings.mode = saved.mode as BackgroundSettings['mode'];
  if (isWallpaperUrl(saved.wallpaperUrl)) settings.wallpaperUrl = saved.wallpaperUrl;
  if (typeof saved.wallpaperDim === 'number' && Number.isFinite(saved.wallpaperDim)) settings.wallpaperDim = Math.min(0.8, Math.max(0.2, saved.wallpaperDim));
  for (const key of ['accentColor', 'secondaryColor'] as const) {
    if (isHexColor(saved[key])) settings[key] = saved[key];
  }
  for (const key of ['syncWallpaperColors', 'enableParticles', 'enableNebula', 'enableGlass'] as const) {
    if (typeof saved[key] === 'boolean') settings[key] = saved[key];
  }
  if (typeof saved.glassBlur === 'number' && Number.isFinite(saved.glassBlur)) {
    settings.glassBlur = Math.min(40, Math.max(0, Math.round(saved.glassBlur)));
  } else if (typeof window !== 'undefined') {
    const legacyBlur = Number(localStorage.getItem('tinapple_blur'));
    if (!Number.isNaN(legacyBlur) && legacyBlur >= 0 && legacyBlur <= 40) settings.glassBlur = legacyBlur;
  }
  if (typeof saved.glassOpacity === 'number' && Number.isFinite(saved.glassOpacity)) {
    settings.glassOpacity = Math.min(95, Math.max(20, Math.round(saved.glassOpacity)));
  } else if (typeof window !== 'undefined') {
    const legacyOpacity = Number(localStorage.getItem('tinapple_opacity'));
    if (!Number.isNaN(legacyOpacity) && legacyOpacity >= 20 && legacyOpacity <= 95) settings.glassOpacity = legacyOpacity;
  }
  if (typeof saved.uiScale === 'string' && ['90%', '100%', '108%', '115%'].includes(saved.uiScale)) {
    settings.uiScale = saved.uiScale;
  } else if (typeof window !== 'undefined') {
    const legacyScale = localStorage.getItem('tinapple_scale');
    if (legacyScale && ['90%', '100%', '108%', '115%'].includes(legacyScale)) settings.uiScale = legacyScale;
  }
  return settings;
}

export function loadSettings(): BackgroundSettings {
  try { return normalizeSettings(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) || 'null')); }
  catch { return { ...DEFAULT_SETTINGS }; }
}

// Quantize a small image sample; favor colorful midtones over black backgrounds.
export function dominantColors(pixels: Uint8ClampedArray): [string, string] {
  const bins = new Map<string, { rgb: number[]; weight: number; count: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const max = Math.max(...rgb), min = Math.min(...rgb);
    if (max < 40 || min > 240) continue;
    const key = rgb.map(channel => Math.floor(channel / 32)).join(',');
    const bin = bins.get(key) || { rgb: [0, 0, 0], weight: 0, count: 0 };
    rgb.forEach((channel, index) => { bin.rgb[index] += channel; });
    bin.count++;
    bin.weight += 1 + 2 * (max - min) / Math.max(max, 1);
    bins.set(key, bin);
  }
  const ranked = [...bins.values()].sort((a, b) => b.weight - a.weight).map(bin => bin.rgb.map(channel => Math.round(channel / bin.count)));
  if (!ranked.length) throw new Error('No usable wallpaper colors. Choose a manual palette.');
  const primary = ranked[0];
  const secondary = ranked.find(rgb => rgb.reduce((sum, channel, index) => sum + (channel - primary[index]) ** 2, 0) > 6400) || primary.map(channel => Math.min(255, channel + 45));
  const hex = (rgb: number[]) => '#' + rgb.map(channel => channel.toString(16).padStart(2, '0')).join('');
  return [hex(primary), hex(secondary)];
}

export function extractWallpaperColors(url: string, signal: AbortSignal): Promise<[string, string]> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    let timeout: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', abort);
    };
    const fail = (error: Error) => { cleanup(); image.src = ''; reject(error); };
    const abort = () => fail(new DOMException('Cancelled', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(image, 0, 0, 64, 64);
        const colors = dominantColors(context.getImageData(0, 0, 64, 64).data);
        cleanup();
        resolve(colors);
      } catch { fail(new Error('This wallpaper does not allow color sampling. Choose a manual palette.')); }
    };
    image.onerror = () => fail(new Error('Could not sample this image. Check the URL or choose a manual palette.'));
    timeout = setTimeout(() => fail(new Error('Wallpaper color sampling timed out. Choose a manual palette.')), 10000);
    if (signal.aborted) abort();
    else image.src = url;
  });
}

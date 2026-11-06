import { argbFromHex, hexFromArgb, Hct, TonalPalette } from '@material/material-color-utilities';
import { extractWallpaperColors, isHexColor } from './appearance';

export interface M3Palette {
  source_color: string;
  mode: 'dark' | 'light';
  engine: string;
  colors: Record<string, string>;
}

export function hexToRgbChannels(hex: string): string {
  const value = isHexColor(hex) ? hex : '#38bdf8';
  return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).join(' ');
}
export function hexToRgba(hex: string, alpha: number): string {
  return `rgb(${hexToRgbChannels(hex)} / ${alpha})`;
}

// Material 3 Dynamic Tonal Palette generator derived from active accent seed color.
export function generateLocalM3Palette(seedHex: string, mode: 'dark' | 'light' = 'dark'): M3Palette {
  const seed = isHexColor(seedHex) ? seedHex : '#38bdf8';
  const seedHct = Hct.fromInt(argbFromHex(seed));
  const hue = seedHct.hue;
  const rawChroma = seedHct.chroma;

  // Check if seed is monochrome (low chroma CAM16, low RGB delta, or explicit greyscale)
  const [r, g, b] = [1, 3, 5].map(i => parseInt(seed.slice(i, i + 2), 16));
  const rgbDelta = Math.max(r, g, b) - Math.min(r, g, b);
  const isMonochrome = rawChroma < 14 || rgbDelta < 18 || seed.toLowerCase() === '#e4e4e7' || seed.toLowerCase() === '#ffffff' || seed.toLowerCase() === '#a1a1aa' || seed.toLowerCase() === '#71717a';

  let primaryPalette: TonalPalette;
  let secondaryPalette: TonalPalette;
  let tertiaryPalette: TonalPalette;
  let surfacePalette: TonalPalette;
  let outlinePalette: TonalPalette;
  let textPalette: TonalPalette;

  if (isMonochrome) {
    // Pure neutral monochrome without any hue tint
    primaryPalette = TonalPalette.fromHueAndChroma(0, 0);
    secondaryPalette = TonalPalette.fromHueAndChroma(0, 0);
    tertiaryPalette = TonalPalette.fromHueAndChroma(0, 0);
    surfacePalette = TonalPalette.fromHueAndChroma(0, 0);
    outlinePalette = TonalPalette.fromHueAndChroma(0, 0);
    textPalette = TonalPalette.fromHueAndChroma(0, 0);
  } else {
    // Primary palette: full saturation from seed color
    primaryPalette = TonalPalette.fromHueAndChroma(hue, Math.max(36, rawChroma));

    // Secondary palette: adjacent harmonious tone
    secondaryPalette = TonalPalette.fromHueAndChroma((hue + 14) % 360, Math.max(16, rawChroma * 0.45));

    // Tertiary palette: triadic dynamic harmonic (rotated 60deg)
    tertiaryPalette = TonalPalette.fromHueAndChroma((hue + 60) % 360, Math.max(20, rawChroma * 0.5));

    // Neutral / Surface palette:
    // Dynamically derived from seed hue so cards, tiles, and headers take on the chosen theme's color.
    // In dark mode, a chroma of 10-16 produces a rich, velvety tinted dark surface.
    const surfaceChroma = Math.max(8, Math.min(16, rawChroma * 0.28));
    surfacePalette = TonalPalette.fromHueAndChroma(hue, surfaceChroma);

    // Neutral Variant / Outline palette:
    // Slightly higher chroma gives crisp, tinted card outlines matching the theme.
    const outlineChroma = Math.max(12, Math.min(24, rawChroma * 0.38));
    outlinePalette = TonalPalette.fromHueAndChroma(hue, outlineChroma);

    // Text palette:
    // Low chroma ensures high contrast and clarity.
    const textChroma = Math.max(3, Math.min(8, rawChroma * 0.12));
    textPalette = TonalPalette.fromHueAndChroma(hue, textChroma);
  }

  const colors: Record<string, string> = {};

  if (mode === 'dark') {
    colors.primary = isMonochrome ? '#f4f4f5' : hexFromArgb(primaryPalette.tone(80));
    colors.on_primary = isMonochrome ? '#18181b' : hexFromArgb(primaryPalette.tone(20));
    colors.primary_container = isMonochrome ? '#3f3f46' : hexFromArgb(primaryPalette.tone(30));
    colors.on_primary_container = isMonochrome ? '#fafafa' : hexFromArgb(primaryPalette.tone(90));

    colors.secondary = isMonochrome ? '#d4d4d8' : hexFromArgb(secondaryPalette.tone(78));
    colors.on_secondary = isMonochrome ? '#18181b' : hexFromArgb(secondaryPalette.tone(20));
    colors.secondary_container = isMonochrome ? '#3f3f46' : hexFromArgb(secondaryPalette.tone(30));
    colors.on_secondary_container = isMonochrome ? '#f4f4f5' : hexFromArgb(secondaryPalette.tone(90));

    colors.tertiary = isMonochrome ? '#a1a1aa' : hexFromArgb(tertiaryPalette.tone(80));
    colors.on_tertiary = isMonochrome ? '#18181b' : hexFromArgb(tertiaryPalette.tone(20));
    colors.tertiary_container = isMonochrome ? '#3f3f46' : hexFromArgb(tertiaryPalette.tone(30));
    colors.on_tertiary_container = isMonochrome ? '#f4f4f5' : hexFromArgb(tertiaryPalette.tone(90));

    // M3 Dark Mode Elevation Tones
    colors.surface_container_lowest = isMonochrome ? '#09090b' : hexFromArgb(surfacePalette.tone(4));
    colors.surface = isMonochrome ? '#0f0f11' : hexFromArgb(surfacePalette.tone(6));
    colors.surface_dim = isMonochrome ? '#0f0f11' : hexFromArgb(surfacePalette.tone(6));
    colors.background = isMonochrome ? '#09090b' : hexFromArgb(surfacePalette.tone(4));
    colors.surface_container_low = isMonochrome ? '#141416' : hexFromArgb(surfacePalette.tone(9));
    colors.surface_container = isMonochrome ? '#1c1c1f' : hexFromArgb(surfacePalette.tone(13));
    colors.surface_container_high = isMonochrome ? '#242427' : hexFromArgb(surfacePalette.tone(17));
    colors.surface_container_highest = isMonochrome ? '#2e2e32' : hexFromArgb(surfacePalette.tone(22));
    colors.surface_bright = isMonochrome ? '#3a3a3e' : hexFromArgb(surfacePalette.tone(26));

    colors.outline_variant = isMonochrome ? '#3f3f46' : hexFromArgb(outlinePalette.tone(28));
    colors.outline = isMonochrome ? '#71717a' : hexFromArgb(outlinePalette.tone(55));

    colors.on_surface = isMonochrome ? '#fafafa' : hexFromArgb(textPalette.tone(93));
    colors.on_surface_variant = isMonochrome ? '#d4d4d8' : hexFromArgb(textPalette.tone(80));
    colors.on_background = isMonochrome ? '#fafafa' : hexFromArgb(textPalette.tone(93));

    colors.error = '#ffb4ab';
    colors.on_error = '#690005';
    colors.error_container = '#93000a';
    colors.on_error_container = '#ffdad6';
    colors.success = '#7ec789';
    colors.warning = '#efc166';
  } else {
    // Light Mode
    colors.primary = isMonochrome ? '#18181b' : hexFromArgb(primaryPalette.tone(40));
    colors.on_primary = isMonochrome ? '#ffffff' : hexFromArgb(primaryPalette.tone(100));
    colors.primary_container = isMonochrome ? '#e4e4e7' : hexFromArgb(primaryPalette.tone(90));
    colors.on_primary_container = isMonochrome ? '#18181b' : hexFromArgb(primaryPalette.tone(10));

    colors.secondary = isMonochrome ? '#52525b' : hexFromArgb(secondaryPalette.tone(45));
    colors.on_secondary = isMonochrome ? '#ffffff' : hexFromArgb(secondaryPalette.tone(100));
    colors.secondary_container = isMonochrome ? '#f4f4f5' : hexFromArgb(secondaryPalette.tone(90));
    colors.on_secondary_container = isMonochrome ? '#18181b' : hexFromArgb(secondaryPalette.tone(10));

    colors.tertiary = isMonochrome ? '#71717a' : hexFromArgb(tertiaryPalette.tone(45));
    colors.on_tertiary = isMonochrome ? '#ffffff' : hexFromArgb(tertiaryPalette.tone(100));
    colors.tertiary_container = isMonochrome ? '#f4f4f5' : hexFromArgb(tertiaryPalette.tone(90));
    colors.on_tertiary_container = isMonochrome ? '#18181b' : hexFromArgb(tertiaryPalette.tone(10));

    colors.surface_container_lowest = isMonochrome ? '#ffffff' : hexFromArgb(surfacePalette.tone(100));
    colors.surface = isMonochrome ? '#fafafa' : hexFromArgb(surfacePalette.tone(98));
    colors.surface_dim = isMonochrome ? '#e4e4e7' : hexFromArgb(surfacePalette.tone(87));
    colors.background = isMonochrome ? '#fafafa' : hexFromArgb(surfacePalette.tone(98));
    colors.surface_container_low = isMonochrome ? '#f4f4f5' : hexFromArgb(surfacePalette.tone(96));
    colors.surface_container = isMonochrome ? '#f4f4f5' : hexFromArgb(surfacePalette.tone(94));
    colors.surface_container_high = isMonochrome ? '#e4e4e7' : hexFromArgb(surfacePalette.tone(92));
    colors.surface_container_highest = isMonochrome ? '#d4d4d8' : hexFromArgb(surfacePalette.tone(90));
    colors.surface_bright = isMonochrome ? '#fafafa' : hexFromArgb(surfacePalette.tone(98));

    colors.outline_variant = isMonochrome ? '#d4d4d8' : hexFromArgb(outlinePalette.tone(80));
    colors.outline = isMonochrome ? '#71717a' : hexFromArgb(outlinePalette.tone(50));

    colors.on_surface = isMonochrome ? '#09090b' : hexFromArgb(textPalette.tone(10));
    colors.on_surface_variant = isMonochrome ? '#52525b' : hexFromArgb(textPalette.tone(30));
    colors.on_background = isMonochrome ? '#09090b' : hexFromArgb(textPalette.tone(10));

    colors.error = '#ba1a1a';
    colors.on_error = '#ffffff';
    colors.error_container = '#ffdad6';
    colors.on_error_container = '#410002';
    colors.success = '#006d3b';
    colors.warning = '#755900';
  }

  return { source_color: seed, mode, engine: 'material-color-utilities', colors };
}

export async function fetchMatugenPalette(params: {
  hex?: string; wallpaper?: string; mode?: 'dark' | 'light';
}): Promise<M3Palette> {
  const mode = params.mode || 'dark';
  let seed = params.hex || '#38bdf8';
  const query = new URLSearchParams({ mode });
  if (params.hex) query.set('hex', params.hex);
  if (params.wallpaper) query.set('wallpaper', params.wallpaper);
  try {
    const response = await fetch(`/api/v1/system/matugen?${query}`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      if (isHexColor(data.source_color)) seed = data.source_color;
      if (data.engine === 'matugen-cli' && data.colors && isHexColor(data.colors.primary)) {
        const fallback = generateLocalM3Palette(seed, mode);
        const validated = Object.fromEntries(Object.entries(data.colors).filter(([, value]) => isHexColor(value)));
        const colors = { ...fallback.colors, ...validated } as Record<string, string>;
        return { source_color: seed, mode, engine: 'matugen', colors };
      }
    }
  } catch { /* Offline clients receive local M3 HCT dynamic palette. */ }
  if (params.wallpaper) {
    try { seed = (await extractWallpaperColors(params.wallpaper, AbortSignal.timeout(8000)))[0]; } catch { /* Preserve manual seed on CORS/image failure. */ }
  }
  return generateLocalM3Palette(seed, mode);
}

export function applyMatugenM3(palette: M3Palette, translucency = 45, enableGlass = true, blur = 20): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { colors } = palette;
  root.dataset.colorMode = palette.mode;
  root.style.colorScheme = palette.mode;
  for (const [key, value] of Object.entries(colors)) {
    const name = key.replace(/_/g, '-');
    root.style.setProperty(`--md-sys-color-${name}`, value);
    root.style.setProperty(`--md-sys-color-${name}-rgb`, hexToRgbChannels(value));
  }
  root.style.setProperty('--tinapple-accent', colors.primary);
  root.style.setProperty('--tinapple-accent-rgb', hexToRgbChannels(colors.primary));
  root.style.setProperty('--tinapple-accent-glow', 'transparent');
  root.style.setProperty('--tinapple-accent-secondary', colors.tertiary);
  root.style.setProperty('--tinapple-secondary-rgb', hexToRgbChannels(colors.tertiary));

  // Component Transparency & Liquid Glass Dynamics
  // translucency range: 0% (solid matte) to 90% (ultra sheer liquid)
  const isLiquid = enableGlass && translucency > 0;
  const surfaceAlpha = isLiquid ? Math.max(0.12, Math.min(1, 1 - (translucency / 100))) : 1;
  const surfaceContainerAlpha = isLiquid ? Math.min(1, surfaceAlpha + 0.08) : 1;
  const surfaceHoverAlpha = isLiquid ? Math.min(1, surfaceAlpha + 0.15) : 1;
  const glassFilter = isLiquid && blur > 0 ? `blur(${blur}px) saturate(135%)` : 'none';

  root.style.setProperty('--m3-surface-opacity', surfaceAlpha.toFixed(3));
  root.style.setProperty('--m3-surface-container-opacity', surfaceContainerAlpha.toFixed(3));
  root.style.setProperty('--m3-surface-hover-opacity', surfaceHoverAlpha.toFixed(3));
  root.style.setProperty('--m3-glass-filter', glassFilter);
  root.style.setProperty('--m3-glass-blur', `${blur}px`);

  const lowRgb = hexToRgbChannels(colors.surface_container_low);
  const outlineVarRgb = hexToRgbChannels(colors.outline_variant);

  const glassBg = isLiquid ? `rgb(${lowRgb} / ${surfaceAlpha.toFixed(3)})` : colors.surface_container_low;
  const glassBorder = isLiquid ? `rgb(${outlineVarRgb} / ${Math.min(0.45, surfaceAlpha * 0.4 + 0.12).toFixed(3)})` : colors.outline_variant;
  const glassShadow = isLiquid
    ? `inset 0 1px 0 0 rgb(255 255 255 / 0.07), 0 8px 24px -4px rgb(0 0 0 / 0.35)`
    : 'none';

  root.style.setProperty('--glass-bg', glassBg);
  root.style.setProperty('--glass-filter', glassFilter);
  root.style.setProperty('--glass-border', glassBorder);
  root.style.setProperty('--glass-border-accent', colors.outline);
  root.style.setProperty('--glass-shadow', glassShadow);
}

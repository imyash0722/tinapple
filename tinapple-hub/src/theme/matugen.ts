// Material Design 3 (M3) Matugen Dynamic Color Engine for Tinapple OS

export interface M3Palette {
  source_color: string;
  mode: 'dark' | 'light';
  engine: string;
  colors: Record<string, string>;
}

export function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '56 189 248';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(10, 18, 38, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Client-side fallback generator in case network or backend is unreachable
export function generateLocalM3Palette(seedHex: string, mode: 'dark' | 'light' = 'dark'): M3Palette {
  const clean = seedHex.startsWith('#') ? seedHex : `#${seedHex}`;
  const c = clean.replace('#', '');
  const r = parseInt(c.slice(0, 2) || '38', 16);
  const g = parseInt(c.slice(2, 4) || 'bd', 16);
  const b = parseInt(c.slice(4, 6) || 'f8', 16);

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (r1: number, g1: number, b1: number) =>
    `#${clamp(r1).toString(16).padStart(2, '0')}${clamp(g1).toString(16).padStart(2, '0')}${clamp(b1).toString(16).padStart(2, '0')}`;

  const colors: Record<string, string> = {};

  if (mode === 'dark') {
    colors['primary'] = clean;
    colors['on_primary'] = '#003549';
    colors['primary_container'] = toHex(r * 0.35, g * 0.35, b * 0.35);
    colors['on_primary_container'] = '#c4e7ff';
    colors['secondary'] = toHex(r * 0.75, g * 0.75 + 20, b * 0.75 + 30);
    colors['on_secondary'] = '#1f333e';
    colors['secondary_container'] = toHex(r * 0.25, g * 0.28, b * 0.32);
    colors['on_secondary_container'] = '#d1e5f4';
    colors['tertiary'] = toHex(r * 0.6 + 80, g * 0.5 + 70, b * 0.8 + 80);
    colors['on_tertiary'] = '#322c4c';
    colors['tertiary_container'] = toHex(r * 0.3 + 40, g * 0.25 + 35, b * 0.4 + 40);
    colors['on_tertiary_container'] = '#e6deff';
    colors['surface'] = '#090e18';
    colors['surface_dim'] = '#070a13';
    colors['surface_bright'] = '#2a3242';
    colors['surface_container_lowest'] = '#05070f';
    colors['surface_container_low'] = '#0c121f';
    colors['surface_container'] = '#101828';
    colors['surface_container_high'] = '#152034';
    colors['surface_container_highest'] = '#1c2940';
    colors['on_surface'] = '#e0e5ed';
    colors['on_surface_variant'] = '#c1c8d4';
    colors['outline'] = '#8b939f';
    colors['outline_variant'] = '#3f4755';
    colors['background'] = '#060a12';
    colors['on_background'] = '#e0e5ed';
    colors['error'] = '#ffb4ab';
    colors['error_container'] = '#93000a';
  } else {
    colors['primary'] = clean;
    colors['on_primary'] = '#ffffff';
    colors['primary_container'] = '#c4e7ff';
    colors['on_primary_container'] = '#001e2c';
    colors['secondary'] = '#4e616d';
    colors['on_secondary'] = '#ffffff';
    colors['secondary_container'] = '#d1e5f4';
    colors['on_secondary_container'] = '#0a1e28';
    colors['tertiary'] = '#615a7d';
    colors['on_tertiary'] = '#ffffff';
    colors['tertiary_container'] = '#e6deff';
    colors['on_tertiary_container'] = '#1d1736';
    colors['surface'] = '#f6fafe';
    colors['surface_dim'] = '#d7dbdf';
    colors['surface_bright'] = '#f6fafe';
    colors['surface_container_lowest'] = '#ffffff';
    colors['surface_container_low'] = '#f0f4f8';
    colors['surface_container'] = '#eaeff2';
    colors['surface_container_high'] = '#e5e9ed';
    colors['surface_container_highest'] = '#dfe3e7';
    colors['on_surface'] = '#181c1f';
    colors['on_surface_variant'] = '#41484d';
    colors['outline'] = '#71787d';
    colors['outline_variant'] = '#c0c7cd';
    colors['background'] = '#f6fafe';
    colors['on_background'] = '#181c1f';
    colors['error'] = '#ba1a1a';
    colors['error_container'] = '#ffdad6';
  }

  return {
    source_color: clean,
    mode,
    engine: 'client-m3-fallback',
    colors,
  };
}

// Fetch palette from backend matugen CLI service with client fallback
export async function fetchMatugenPalette(params: {
  hex?: string;
  wallpaper?: string;
  mode?: 'dark' | 'light';
}): Promise<M3Palette> {
  const mode = params.mode || 'dark';
  const query = new URLSearchParams();
  if (params.hex) query.set('hex', params.hex);
  if (params.wallpaper) query.set('wallpaper', params.wallpaper);
  query.set('mode', mode);

  try {
    const res = await fetch(`/api/v1/system/matugen?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.colors && Object.keys(data.colors).length > 0) {
        return data as M3Palette;
      }
    }
  } catch (err) {
    console.debug('Matugen API fetch failed, falling back to local M3 engine:', err);
  }

  return generateLocalM3Palette(params.hex || '#38bdf8', mode);
}

// Inject complete Material Design 3 tokens into documentElement
export function applyMatugenM3(
  palette: M3Palette,
  translucency: number = 45,
  enableGlass: boolean = true
): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const colors = palette.colors;

  // 1. Core Material Design 3 tokens
  for (const [key, val] of Object.entries(colors)) {
    const cssVar = `--md-sys-color-${key.replace(/_/g, '-')}`;
    root.style.setProperty(cssVar, val);
  }

  // 2. High-contrast accent variables
  const primaryHex = colors.primary || '#38bdf8';
  const secondaryHex = colors.tertiary || colors.secondary || '#3b82f6';
  const surfaceLow = colors.surface_container_low || '#0c121f';
  const outlineVar = colors.outline_variant || '#3f4755';

  root.style.setProperty('--tinapple-accent', primaryHex);
  root.style.setProperty('--tinapple-accent-rgb', hexToRgbChannels(primaryHex));
  root.style.setProperty('--tinapple-accent-glow', `${primaryHex}55`);
  root.style.setProperty('--tinapple-accent-secondary', secondaryHex);
  root.style.setProperty('--tinapple-secondary-rgb', hexToRgbChannels(secondaryHex));

  // 3. Dynamic Material 3 Glass Styling
  const alpha = Math.max(0.08, Math.min(0.95, (100 - translucency) / 100));
  root.style.setProperty(
    '--glass-bg',
    enableGlass ? hexToRgba(surfaceLow, alpha) : (colors.surface_container || '#101828')
  );
  root.style.setProperty(
    '--glass-border',
    hexToRgba(outlineVar, 0.35)
  );
  root.style.setProperty(
    '--glass-border-accent',
    hexToRgba(primaryHex, 0.4)
  );

  // Surface and card backgrounds
  root.style.setProperty('--tinapple-surface', colors.surface_container || '#101828');
  root.style.setProperty('--tinapple-card', colors.surface_container_high || '#152034');
  root.style.setProperty('--tinapple-dark', colors.surface || '#090e18');
  root.style.setProperty('--tinapple-border', hexToRgba(outlineVar, 0.25));

  // Persist current palette in localStorage
  try {
    localStorage.setItem('tinapple_m3_palette', JSON.stringify(palette));
  } catch {}
}

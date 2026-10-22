import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// The theme utilities have no runtime imports and can be tested without a DOM.
const source = await readFile(new URL('../src/theme/appearance.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { normalizeSettings, DEFAULT_SETTINGS, dominantColors, isWallpaperUrl, colorChannels } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('stored settings reject invalid values and merge older settings with defaults', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  const restored = normalizeSettings({ mode: 'wallpaper', wallpaperDim: 4, accentColor: '#abc', secondaryColor: '#123456', enableGlass: 'false', enableParticles: false, wallpaperUrl: 'javascript:alert(1)' });
  assert.equal(restored.mode, 'wallpaper');
  assert.equal(restored.wallpaperDim, 0.8);
  assert.equal(restored.accentColor, DEFAULT_SETTINGS.accentColor);
  assert.equal(restored.secondaryColor, '#123456');
  assert.equal(restored.enableGlass, true);
  assert.equal(restored.enableParticles, false);
  assert.equal(restored.wallpaperUrl, DEFAULT_SETTINGS.wallpaperUrl);
  assert.equal(normalizeSettings({ wallpaperDim: NaN, mode: 'broken' }).wallpaperDim, 0.5);
});

test('wallpaper URLs allow image paths and HTTPS but reject executable protocols', () => {
  assert.ok(isWallpaperUrl('/wallpapers/palm.jpg'));
  assert.ok(isWallpaperUrl('https://example.com/palm.jpg'));
  assert.equal(isWallpaperUrl('javascript:alert(1)'), false);
  assert.equal(isWallpaperUrl('data:text/html,hello'), false);
  assert.equal(isWallpaperUrl(''), false);
});

test('color extraction ignores dark/transparent pixels and finds distinct image colors', () => {
  const pixels = new Uint8ClampedArray([
    ...Array(100).fill([0, 0, 0, 255]).flat(),
    ...Array(20).fill([240, 120, 20, 255]).flat(),
    ...Array(10).fill([20, 170, 90, 255]).flat(),
    ...Array(50).fill([255, 0, 255, 0]).flat(),
  ]);
  assert.deepEqual(dominantColors(pixels), ['#f07814', '#14aa5a']);
  assert.deepEqual(dominantColors(new Uint8ClampedArray([100, 100, 100, 255])), ['#646464', '#919191']);
  assert.throws(() => dominantColors(new Uint8ClampedArray([0, 0, 0, 255])));
  assert.equal(colorChannels('#e5b567'), '229 181 103');
});

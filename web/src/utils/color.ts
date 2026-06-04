import chroma from 'chroma-js';
import type { ColorScheme } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * 基于主色程序化生成色彩方案
 */
export function generateColorScheme(primary: string, name?: string): ColorScheme {
  const hsl = chroma(primary).hsl();
  const hue = isNaN(hsl[0]) ? 0 : hsl[0];

  // 辅色：同类色，主色 ±15° 色相偏移
  const secondaryHue = (hue + 15) % 360;
  const secondary = chroma.hsl(secondaryHue, 0.3, 0.92).hex();

  // 背景色：主色低饱和度 + 高明度
  const background = '#ffffff';
  const blockBackground = chroma.hsl(hue, 0.1, 0.97).hex();

  // 文字色：基于背景色明度
  const textPrimary = '#1f2937';
  const textSecondary = '#4b5563';
  const textMuted = '#9ca3af';

  // 强调色：互补色
  const accentHue = (hue + 180) % 360;
  const accent = chroma.hsl(accentHue, 0.7, 0.5).hex();

  return {
    id: uuid(),
    name: name || `自定义-${primary}`,
    primary,
    secondary,
    background,
    blockBackground,
    textPrimary,
    textSecondary,
    textMuted,
    accent,
    isPreset: false,
  };
}

/**
 * 互补色生成
 */
export function generateComplementary(primary: string): string {
  const hsl = chroma(primary).hsl();
  const hue = isNaN(hsl[0]) ? 0 : hsl[0];
  return chroma.hsl((hue + 180) % 360, 0.7, 0.5).hex();
}

/**
 * 三角色生成
 */
export function generateTriadic(primary: string): [string, string, string] {
  const hsl = chroma(primary).hsl();
  const hue = isNaN(hsl[0]) ? 0 : hsl[0];
  return [
    primary,
    chroma.hsl((hue + 120) % 360, 0.7, 0.5).hex(),
    chroma.hsl((hue + 240) % 360, 0.7, 0.5).hex(),
  ];
}

/**
 * 分裂互补色
 */
export function generateSplitComplementary(primary: string): [string, string, string] {
  const hsl = chroma(primary).hsl();
  const hue = isNaN(hsl[0]) ? 0 : hsl[0];
  return [
    primary,
    chroma.hsl((hue + 150) % 360, 0.7, 0.5).hex(),
    chroma.hsl((hue + 210) % 360, 0.7, 0.5).hex(),
  ];
}

/**
 * 批量生成候选方案
 */
export function generateBatchSchemes(primary: string, count = 6): ColorScheme[] {
  const hsl = chroma(primary).hsl();
  const hue = isNaN(hsl[0]) ? 0 : hsl[0];

  const strategies = [
    // 同类色
    () => chroma.hsl((hue + 15) % 360, 0.3, 0.92).hex(),
    // 互补色
    () => chroma.hsl((hue + 180) % 360, 0.6, 0.9).hex(),
    // 三角色偏移1
    () => chroma.hsl((hue + 120) % 360, 0.4, 0.92).hex(),
    // 三角色偏移2
    () => chroma.hsl((hue + 240) % 360, 0.4, 0.92).hex(),
    // 分裂互补1
    () => chroma.hsl((hue + 150) % 360, 0.35, 0.92).hex(),
    // 分裂互补2
    () => chroma.hsl((hue + 210) % 360, 0.35, 0.92).hex(),
  ];

  return strategies.slice(0, count).map((fn, i) => {
    const secondary = fn();
    const accentHue = (hue + 180) % 360;
    return {
      id: uuid(),
      name: `候选方案 ${i + 1}`,
      primary,
      secondary,
      background: '#ffffff',
      blockBackground: chroma.hsl(hue, 0.1, 0.97).hex(),
      textPrimary: '#1f2937',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af',
      accent: chroma.hsl(accentHue, 0.7, 0.5).hex(),
      isPreset: false,
    };
  });
}

/**
 * WCAG 对比度检测
 */
export function getContrastRatio(color1: string, color2: string): number {
  return chroma.contrast(color1, color2);
}

/**
 * WCAG AA 评级
 */
export function getWCAGLevel(color1: string, color2: string): 'AAA' | 'AA' | 'Fail' {
  const ratio = getContrastRatio(color1, color2);
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'Fail';
}

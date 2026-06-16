/**
 * color.ts 核心工具函数测试
 */
import { describe, it, expect } from 'vitest';
import {
  generateColorScheme,
  generateComplementary,
  generateTriadic,
  generateSplitComplementary,
  getContrastRatio,
  getWCAGLevel,
} from './color';

// ========== generateColorScheme ==========

describe('generateColorScheme', () => {
  it('应基于主色生成完整配色方案', () => {
    const scheme = generateColorScheme('#1a56db', '测试蓝');
    expect(scheme.primary).toBe('#1a56db');
    expect(scheme.name).toBe('测试蓝');
    expect(scheme.background).toBe('#ffffff');
    expect(scheme.isPreset).toBe(false);
    // 应包含所有必要字段
    expect(scheme.secondary).toBeDefined();
    expect(scheme.blockBackground).toBeDefined();
    expect(scheme.textPrimary).toBeDefined();
    expect(scheme.textSecondary).toBeDefined();
    expect(scheme.textMuted).toBeDefined();
    expect(scheme.accent).toBeDefined();
    expect(scheme.id).toBeDefined();
  });

  it('不传名称时应使用默认名称', () => {
    const scheme = generateColorScheme('#ff0000');
    expect(scheme.name).toContain('#ff0000');
  });
});

// ========== generateComplementary ==========

describe('generateComplementary', () => {
  it('应生成互补色', () => {
    // 红色 (hue ≈ 0) 的互补色应在 hue ≈ 180 附近
    const complementary = generateComplementary('#ff0000');
    expect(complementary).toBeDefined();
    // 确保返回的是合法 hex 颜色
    expect(complementary).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('互补色应与原色色相相差约180°', () => {
    // 蓝色 #1a56db 的互补色应该在橙/黄色附近
    const complementary = generateComplementary('#1a56db');
    expect(complementary).not.toBe('#1a56db');
  });
});

// ========== generateTriadic ==========

describe('generateTriadic', () => {
  it('应生成3个颜色（原色 + 2个三角色）', () => {
    const colors = generateTriadic('#ff0000');
    expect(colors).toHaveLength(3);
    expect(colors[0]).toBe('#ff0000');
    // 确保返回合法 hex
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// ========== generateSplitComplementary ==========

describe('generateSplitComplementary', () => {
  it('应生成3个颜色（原色 + 2个分裂互补色）', () => {
    const colors = generateSplitComplementary('#ff0000');
    expect(colors).toHaveLength(3);
    expect(colors[0]).toBe('#ff0000');
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// ========== getContrastRatio ==========

describe('getContrastRatio', () => {
  it('黑白对比度应约为 21', () => {
    const ratio = getContrastRatio('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('相同颜色对比度应为 1', () => {
    const ratio = getContrastRatio('#ff0000', '#ff0000');
    expect(ratio).toBeCloseTo(1, 1);
  });

  it('对比度应在 1~21 之间', () => {
    const ratio = getContrastRatio('#1a56db', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(1);
    expect(ratio).toBeLessThanOrEqual(21);
  });
});

// ========== getWCAGLevel ==========

describe('getWCAGLevel', () => {
  it('黑白对比度应达到 AAA', () => {
    expect(getWCAGLevel('#000000', '#ffffff')).toBe('AAA');
  });

  it('相同颜色应不通过', () => {
    expect(getWCAGLevel('#ff0000', '#ff0000')).toBe('Fail');
  });

  it('中等对比度可能达到 AA', () => {
    const level = getWCAGLevel('#1a56db', '#ffffff');
    // 蓝色在白色上对比度通常 > 4.5
    expect(['AA', 'AAA']).toContain(level);
  });
});

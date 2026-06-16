/**
 * block.ts 核心工具函数测试
 */
import { describe, it, expect } from 'vitest';
import {
  getNextZIndex,
  getUniqueName,
  getBlockBounds,
} from './block';
import type { BlockInstance } from '@/types';

// ========== getNextZIndex ==========

describe('getNextZIndex', () => {
  it('空块列表应返回 1', () => {
    expect(getNextZIndex([])).toBe(1);
  });

  it('应返回最大 zIndex + 1', () => {
    const blocks = [
      { zIndex: 1 } as BlockInstance,
      { zIndex: 5 } as BlockInstance,
      { zIndex: 3 } as BlockInstance,
    ];
    expect(getNextZIndex(blocks)).toBe(6);
  });

  it('缺少 zIndex 的块应视为 0', () => {
    const blocks = [
      { zIndex: 2 } as BlockInstance,
      {} as BlockInstance,
    ];
    expect(getNextZIndex(blocks)).toBe(3);
  });
});

// ========== getUniqueName ==========

describe('getUniqueName', () => {
  it('不重复的名称应原样返回', () => {
    expect(getUniqueName('标题', ['文本', '链接'])).toBe('标题');
  });

  it('重复名称应添加数字后缀', () => {
    // maxSuffix 初始为 0，第一次重复添加后缀 1
    expect(getUniqueName('标题', ['标题', '文本'])).toBe('标题 1');
  });

  it('已存在 "名称 2" 时应递增到 3', () => {
    expect(getUniqueName('标题', ['标题', '标题 2'])).toBe('标题 3');
  });

  it('已存在 "名称 2" 和 "名称 3" 时应递增到 4', () => {
    expect(getUniqueName('标题', ['标题', '标题 2', '标题 3'])).toBe('标题 4');
  });

  it('空名称列表应直接返回', () => {
    expect(getUniqueName('标题', [])).toBe('标题');
  });

  it('名称含特殊正则字符时应正确转义', () => {
    expect(getUniqueName('a.b', ['a.b'])).toBe('a.b 1');
    expect(getUniqueName('a+b', ['a+b'])).toBe('a+b 1');
  });

  it('名称中有 "2" 但不是后缀模式不应干扰', () => {
    // "标题2" 不匹配 "标题 2" 的 " 数字" 模式，所以 maxSuffix 仍为 0
    expect(getUniqueName('标题', ['标题', '标题2'])).toBe('标题 1');
  });
});

// ========== getBlockBounds ==========

describe('getBlockBounds', () => {
  it('应正确计算块的边界框', () => {
    const block = {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    } as BlockInstance;

    const bounds = getBlockBounds(block);
    expect(bounds.left).toBe(10);
    expect(bounds.top).toBe(20);
    expect(bounds.right).toBe(110);
    expect(bounds.bottom).toBe(70);
    expect(bounds.centerX).toBe(60);
    expect(bounds.centerY).toBe(45);
  });

  it('原点位置的块应正确计算', () => {
    const block = {
      x: 0,
      y: 0,
      width: 200,
      height: 300,
    } as BlockInstance;

    const bounds = getBlockBounds(block);
    expect(bounds.left).toBe(0);
    expect(bounds.top).toBe(0);
    expect(bounds.right).toBe(200);
    expect(bounds.bottom).toBe(300);
    expect(bounds.centerX).toBe(100);
    expect(bounds.centerY).toBe(150);
  });
});

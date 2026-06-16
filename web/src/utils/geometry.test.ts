/**
 * geometry.ts 核心工具函数测试
 */
import { describe, it, expect } from 'vitest';
import {
  rectsOverlap,
  getGroupBounds,
  buildDecoPathD,
  generateShapeAnchors,
  generateRectangle,
  generateTriangle,
  generateDiamond,
  generateStar,
  generateHexagon,
  generateArrowRight,
} from './geometry';
import type { DecorationAnchor, BlockGroup } from '@/types';

// ========== rectsOverlap ==========

describe('rectsOverlap', () => {
  it('两个重叠的矩形应返回 true', () => {
    const r1 = { x: 0, y: 0, width: 100, height: 100 };
    const r2 = { x: 50, y: 50, width: 100, height: 100 };
    expect(rectsOverlap(r1, r2)).toBe(true);
  });

  it('完全包含的矩形应返回 true', () => {
    const r1 = { x: 0, y: 0, width: 200, height: 200 };
    const r2 = { x: 50, y: 50, width: 50, height: 50 };
    expect(rectsOverlap(r1, r2)).toBe(true);
  });

  it('完全不相交的矩形应返回 false', () => {
    const r1 = { x: 0, y: 0, width: 100, height: 100 };
    const r2 = { x: 200, y: 200, width: 100, height: 100 };
    expect(rectsOverlap(r1, r2)).toBe(false);
  });

  it('仅边缘相邻（不重叠）应返回 false', () => {
    const r1 = { x: 0, y: 0, width: 100, height: 100 };
    const r2 = { x: 100, y: 0, width: 100, height: 100 };
    expect(rectsOverlap(r1, r2)).toBe(false);
  });

  it('仅角落相邻应返回 false', () => {
    const r1 = { x: 0, y: 0, width: 100, height: 100 };
    const r2 = { x: 100, y: 100, width: 100, height: 100 };
    expect(rectsOverlap(r1, r2)).toBe(false);
  });

  it('微小重叠应返回 true', () => {
    const r1 = { x: 0, y: 0, width: 100, height: 100 };
    const r2 = { x: 99, y: 99, width: 100, height: 100 };
    expect(rectsOverlap(r1, r2)).toBe(true);
  });
});

// ========== getGroupBounds ==========

describe('getGroupBounds', () => {
  const group: BlockGroup = {
    id: 'g1',
    name: '测试分组',
    blockIds: ['b1', 'b2'],
    rotation: 0,
    createdAt: 0,
    updatedAt: 0,
  };

  it('应正确计算分组边界框', () => {
    const blocks = [
      { id: 'b1', x: 10, y: 20, width: 100, height: 50 },
      { id: 'b2', x: 50, y: 80, width: 80, height: 60 },
    ];
    const result = getGroupBounds(group, blocks);
    expect(result).not.toBeNull();
    expect(result!.x).toBe(10);
    expect(result!.y).toBe(20);
    expect(result!.width).toBe(120); // max(10+100, 50+80) - min(10, 50) = 130 - 10
    expect(result!.height).toBe(120); // max(20+50, 80+60) - min(20, 80) = 140 - 20
    expect(result!.centerX).toBe(70); // (10 + 130) / 2
    expect(result!.centerY).toBe(80); // (20 + 140) / 2
  });

  it('分组内无匹配块时应返回 null', () => {
    const blocks = [
      { id: 'b3', x: 10, y: 20, width: 100, height: 50 },
    ];
    const result = getGroupBounds(group, blocks);
    expect(result).toBeNull();
  });

  it('空 blocks 数组应返回 null', () => {
    const result = getGroupBounds(group, []);
    expect(result).toBeNull();
  });
});

// ========== buildDecoPathD ==========

describe('buildDecoPathD', () => {
  it('空锚点列表应返回空字符串', () => {
    expect(buildDecoPathD([], false)).toBe('');
  });

  it('单个锚点应生成 M 命令', () => {
    const anchors: DecorationAnchor[] = [
      { x: 10, y: 20, handleIn: null, handleOut: null },
    ];
    expect(buildDecoPathD(anchors, false)).toBe('M 10 20');
  });

  it('两个锚点直线连接应生成 M + L', () => {
    const anchors: DecorationAnchor[] = [
      { x: 0, y: 0, handleIn: null, handleOut: null },
      { x: 100, y: 0, handleIn: null, handleOut: null },
    ];
    expect(buildDecoPathD(anchors, false)).toBe('M 0 0 L 100 0');
  });

  it('带控制柄应生成 Q 命令（优先 handleOut）', () => {
    const anchors: DecorationAnchor[] = [
      { x: 0, y: 0, handleIn: null, handleOut: { x: 50, y: -30 } },
      { x: 100, y: 0, handleIn: null, handleOut: null },
    ];
    expect(buildDecoPathD(anchors, false)).toBe('M 0 0 Q 50 -30 100 0');
  });

  it('handleOut 不存在时使用 handleIn', () => {
    const anchors: DecorationAnchor[] = [
      { x: 0, y: 0, handleIn: null, handleOut: null },
      { x: 100, y: 0, handleIn: { x: 50, y: -30 }, handleOut: null },
    ];
    expect(buildDecoPathD(anchors, false)).toBe('M 0 0 Q 50 -30 100 0');
  });

  it('闭合路径（>= 3 锚点）应生成 Z', () => {
    const anchors: DecorationAnchor[] = [
      { x: 0, y: 0, handleIn: null, handleOut: null },
      { x: 100, y: 0, handleIn: null, handleOut: null },
      { x: 50, y: 80, handleIn: null, handleOut: null },
    ];
    const result = buildDecoPathD(anchors, true);
    expect(result).toContain('Z');
    expect(result).toBe('M 0 0 L 100 0 L 50 80 L 0 0 Z');
  });

  it('闭合路径不足3个锚点不应闭合', () => {
    const anchors: DecorationAnchor[] = [
      { x: 0, y: 0, handleIn: null, handleOut: null },
      { x: 100, y: 0, handleIn: null, handleOut: null },
    ];
    const result = buildDecoPathD(anchors, true);
    expect(result).not.toContain('Z');
  });
});

// ========== 形状生成器 ==========

describe('generateShapeAnchors', () => {
  it('select 类型应返回空数组', () => {
    expect(generateShapeAnchors('select', 0, 0, 100, 100)).toEqual([]);
  });

  it('未知类型应返回空数组', () => {
    expect(generateShapeAnchors('unknown' as any, 0, 0, 100, 100)).toEqual([]);
  });
});

describe('generateRectangle', () => {
  it('应生成4个锚点（矩形四角）', () => {
    const anchors = generateRectangle(0, 0, 100, 50);
    expect(anchors).toHaveLength(4);
    expect(anchors[0]).toEqual({ x: 0, y: 0 });
    expect(anchors[1]).toEqual({ x: 100, y: 0 });
    expect(anchors[2]).toEqual({ x: 100, y: 50 });
    expect(anchors[3]).toEqual({ x: 0, y: 50 });
  });
});

describe('generateTriangle', () => {
  it('应生成3个锚点', () => {
    const anchors = generateTriangle(0, 0, 100, 80);
    expect(anchors).toHaveLength(3);
    // 顶点在顶部中心
    expect(anchors[0].x).toBe(50);
    expect(anchors[0].y).toBe(0);
  });
});

describe('generateDiamond', () => {
  it('应生成4个锚点（上右下左）', () => {
    const anchors = generateDiamond(0, 0, 100, 100);
    expect(anchors).toHaveLength(4);
    expect(anchors[0]).toEqual({ x: 50, y: 0 });
    expect(anchors[1]).toEqual({ x: 100, y: 50 });
    expect(anchors[2]).toEqual({ x: 50, y: 100 });
    expect(anchors[3]).toEqual({ x: 0, y: 50 });
  });
});

describe('generateStar', () => {
  it('应生成10个锚点（5外+5内）', () => {
    const anchors = generateStar(0, 0, 100, 100);
    expect(anchors).toHaveLength(10);
  });
});

describe('generateHexagon', () => {
  it('应生成6个锚点', () => {
    const anchors = generateHexagon(0, 0, 100, 100);
    expect(anchors).toHaveLength(6);
  });
});

describe('generateArrowRight', () => {
  it('应生成7个锚点', () => {
    const anchors = generateArrowRight(0, 0, 100, 50);
    expect(anchors).toHaveLength(7);
    // 第一个点在左侧中上方
    expect(anchors[0].y).toBeGreaterThan(0);
    expect(anchors[0].y).toBeLessThan(50);
  });
});

import type { BlockGroup } from '@/types';

/** 矩形数据结构 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 含中心点的矩形 */
export interface RectWithCenter extends Rect {
  centerX: number;
  centerY: number;
}

/**
 * 判断两个矩形是否相交
 */
export function rectsOverlap(r1: Rect, r2: Rect): boolean {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

/**
 * 计算分组的边界框
 */
export function getGroupBounds(
  group: BlockGroup,
  blocks: { id: string; x: number; y: number; width: number; height: number }[]
): RectWithCenter | null {
  const groupBlocks = blocks.filter((b) => group.blockIds.includes(b.id));
  if (groupBlocks.length === 0) return null;
  const minX = Math.min(...groupBlocks.map((b) => b.x));
  const minY = Math.min(...groupBlocks.map((b) => b.y));
  const maxX = Math.max(...groupBlocks.map((b) => b.x + b.width));
  const maxY = Math.max(...groupBlocks.map((b) => b.y + b.height));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

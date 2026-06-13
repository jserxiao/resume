import type { BlockInstance, CanvasConfig } from '@/types';
import { ALIGN_THRESHOLD } from './constants';

/**
 * 块相关的工具函数
 * 从 store 中抽取，便于在组件中独立使用
 */

/** 获取下一个可用的 zIndex */
export function getNextZIndex(blocks: BlockInstance[]): number {
  if (blocks.length === 0) return 1;
  return Math.max(...blocks.map((b) => b.zIndex || 0)) + 1;
}

/**
 * 生成唯一名称：如果 baseName 在 existingNames 中已存在，
 * 则自动添加数字后缀（如 "标题 2"、"标题 3"）避免重复
 *
 * @param baseName - 期望的名称
 * @param existingNames - 已有的名称列表
 * @returns 不重复的唯一名称
 *
 * @example
 * getUniqueName('标题', ['标题', '文本', '标题 2']) // => '标题 3'
 * getUniqueName('文本', ['标题', '文本块'])         // => '文本'
 */
export function getUniqueName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) return baseName;

  // 去掉 baseName 本身如果已存在类似 "标题 2" 的模式，提取基础名
  // 先找出所有以 baseName 开头、后跟 " 数字" 模式的名称
  const suffixPattern = new RegExp(`^${escapeRegExp(baseName)} (\\d+)$`);
  let maxSuffix = 0;
  for (const name of existingNames) {
    const match = name.match(suffixPattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSuffix) maxSuffix = num;
    }
  }

  return `${baseName} ${maxSuffix + 1}`;
}

/** 转义正则表达式中的特殊字符 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 计算块的边界框 */
export function getBlockBounds(block: BlockInstance) {
  return {
    left: block.x,
    right: block.x + block.width,
    top: block.y,
    bottom: block.y + block.height,
    centerX: block.x + block.width / 2,
    centerY: block.y + block.height / 2,
  };
}

/** 计算对齐线 */
export function calculateAlignGuides(
  draggedBlock: BlockInstance,
  otherBlocks: BlockInstance[],
  canvas: CanvasConfig,
): { x: number | null; y: number | null; guides: Array<{ type: 'horizontal' | 'vertical'; position: number; start: number; end: number }> } {
  const guides: Array<{ type: 'horizontal' | 'vertical'; position: number; start: number; end: number }> = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  const dragBounds = getBlockBounds(draggedBlock);

  // 画布边界对齐点
  const canvasAlignPoints = {
    left: canvas.padding,
    right: canvas.width - canvas.padding,
    top: canvas.padding,
    bottom: canvas.height - canvas.padding,
    centerX: canvas.width / 2,
    centerY: canvas.height / 2,
  };

  // 检查画布对齐
  // 左对齐
  if (Math.abs(dragBounds.left - canvasAlignPoints.left) < ALIGN_THRESHOLD) {
    snapX = canvasAlignPoints.left;
    guides.push({ type: 'vertical', position: canvasAlignPoints.left, start: 0, end: canvas.height });
  }
  // 右对齐
  if (Math.abs(dragBounds.right - canvasAlignPoints.right) < ALIGN_THRESHOLD) {
    snapX = canvasAlignPoints.right - draggedBlock.width;
    guides.push({ type: 'vertical', position: canvasAlignPoints.right, start: 0, end: canvas.height });
  }
  // 顶部对齐
  if (Math.abs(dragBounds.top - canvasAlignPoints.top) < ALIGN_THRESHOLD) {
    snapY = canvasAlignPoints.top;
    guides.push({ type: 'horizontal', position: canvasAlignPoints.top, start: 0, end: canvas.width });
  }
  // 底部对齐
  if (Math.abs(dragBounds.bottom - canvasAlignPoints.bottom) < ALIGN_THRESHOLD) {
    snapY = canvasAlignPoints.bottom - draggedBlock.height;
    guides.push({ type: 'horizontal', position: canvasAlignPoints.bottom, start: 0, end: canvas.width });
  }
  // 水平居中
  if (Math.abs(dragBounds.centerX - canvasAlignPoints.centerX) < ALIGN_THRESHOLD) {
    snapX = canvasAlignPoints.centerX - draggedBlock.width / 2;
    guides.push({ type: 'vertical', position: canvasAlignPoints.centerX, start: 0, end: canvas.height });
  }
  // 垂直居中
  if (Math.abs(dragBounds.centerY - canvasAlignPoints.centerY) < ALIGN_THRESHOLD) {
    snapY = canvasAlignPoints.centerY - draggedBlock.height / 2;
    guides.push({ type: 'horizontal', position: canvasAlignPoints.centerY, start: 0, end: canvas.width });
  }

  // 检查其他块对齐
  for (const other of otherBlocks) {
    const otherBounds = getBlockBounds(other);

    // 左-左对齐
    if (Math.abs(dragBounds.left - otherBounds.left) < ALIGN_THRESHOLD) {
      if (snapX === null) snapX = otherBounds.left;
      guides.push({ type: 'vertical', position: otherBounds.left, start: Math.min(dragBounds.top, otherBounds.top), end: Math.max(dragBounds.bottom, otherBounds.bottom) });
    }
    // 右-右对齐
    if (Math.abs(dragBounds.right - otherBounds.right) < ALIGN_THRESHOLD) {
      if (snapX === null) snapX = otherBounds.right - draggedBlock.width;
      guides.push({ type: 'vertical', position: otherBounds.right, start: Math.min(dragBounds.top, otherBounds.top), end: Math.max(dragBounds.bottom, otherBounds.bottom) });
    }
    // 左-右对齐
    if (Math.abs(dragBounds.left - otherBounds.right) < ALIGN_THRESHOLD) {
      if (snapX === null) snapX = otherBounds.right;
      guides.push({ type: 'vertical', position: otherBounds.right, start: Math.min(dragBounds.top, otherBounds.top), end: Math.max(dragBounds.bottom, otherBounds.bottom) });
    }
    // 右-左对齐
    if (Math.abs(dragBounds.right - otherBounds.left) < ALIGN_THRESHOLD) {
      if (snapX === null) snapX = otherBounds.left - draggedBlock.width;
      guides.push({ type: 'vertical', position: otherBounds.left, start: Math.min(dragBounds.top, otherBounds.top), end: Math.max(dragBounds.bottom, otherBounds.bottom) });
    }
    // 顶部-顶部对齐
    if (Math.abs(dragBounds.top - otherBounds.top) < ALIGN_THRESHOLD) {
      if (snapY === null) snapY = otherBounds.top;
      guides.push({ type: 'horizontal', position: otherBounds.top, start: Math.min(dragBounds.left, otherBounds.left), end: Math.max(dragBounds.right, otherBounds.right) });
    }
    // 底部-底部对齐
    if (Math.abs(dragBounds.bottom - otherBounds.bottom) < ALIGN_THRESHOLD) {
      if (snapY === null) snapY = otherBounds.bottom - draggedBlock.height;
      guides.push({ type: 'horizontal', position: otherBounds.bottom, start: Math.min(dragBounds.left, otherBounds.left), end: Math.max(dragBounds.right, otherBounds.right) });
    }
    // 顶部-底部对齐
    if (Math.abs(dragBounds.top - otherBounds.bottom) < ALIGN_THRESHOLD) {
      if (snapY === null) snapY = otherBounds.bottom;
      guides.push({ type: 'horizontal', position: otherBounds.bottom, start: Math.min(dragBounds.left, otherBounds.left), end: Math.max(dragBounds.right, otherBounds.right) });
    }
    // 底部-顶部对齐
    if (Math.abs(dragBounds.bottom - otherBounds.top) < ALIGN_THRESHOLD) {
      if (snapY === null) snapY = otherBounds.top - draggedBlock.height;
      guides.push({ type: 'horizontal', position: otherBounds.top, start: Math.min(dragBounds.left, otherBounds.left), end: Math.max(dragBounds.right, otherBounds.right) });
    }
    // 水平居中对齐
    if (Math.abs(dragBounds.centerX - otherBounds.centerX) < ALIGN_THRESHOLD) {
      if (snapX === null) snapX = otherBounds.centerX - draggedBlock.width / 2;
      guides.push({ type: 'vertical', position: otherBounds.centerX, start: Math.min(dragBounds.top, otherBounds.top), end: Math.max(dragBounds.bottom, otherBounds.bottom) });
    }
    // 垂直居中对齐
    if (Math.abs(dragBounds.centerY - otherBounds.centerY) < ALIGN_THRESHOLD) {
      if (snapY === null) snapY = otherBounds.centerY - draggedBlock.height / 2;
      guides.push({ type: 'horizontal', position: otherBounds.centerY, start: Math.min(dragBounds.left, otherBounds.left), end: Math.max(dragBounds.right, otherBounds.right) });
    }
  }

  return { x: snapX, y: snapY, guides };
}

/** 计算到最近元素或边距的距离 */
export function calculateDistances(
  block: BlockInstance,
  otherBlocks: BlockInstance[],
  canvas: CanvasConfig,
): Array<{ direction: 'horizontal' | 'vertical'; from: number; to: number; value: number }> {
  const distances: Array<{ direction: 'horizontal' | 'vertical'; from: number; to: number; value: number }> = [];
  const bounds = getBlockBounds(block);

  // 到画布内边距的距离（从 padding 线到元素边界）
  if (bounds.left >= canvas.padding) {
    distances.push({ direction: 'horizontal', from: canvas.padding, to: bounds.left, value: bounds.left - canvas.padding });
  }
  if (bounds.right <= canvas.width - canvas.padding) {
    distances.push({ direction: 'horizontal', from: bounds.right, to: canvas.width - canvas.padding, value: canvas.width - canvas.padding - bounds.right });
  }
  if (bounds.top >= canvas.padding) {
    distances.push({ direction: 'vertical', from: canvas.padding, to: bounds.top, value: bounds.top - canvas.padding });
  }
  if (bounds.bottom <= canvas.height - canvas.padding) {
    distances.push({ direction: 'vertical', from: bounds.bottom, to: canvas.height - canvas.padding, value: canvas.height - canvas.padding - bounds.bottom });
  }

  // 到其他块的距离
  for (const other of otherBlocks) {
    const otherBounds = getBlockBounds(other);

    // 水平距离（块在垂直方向上有重叠）
    if (bounds.top < otherBounds.bottom && bounds.bottom > otherBounds.top) {
      if (otherBounds.left >= bounds.right && bounds.right <= canvas.width - canvas.padding) {
        distances.push({ direction: 'horizontal', from: bounds.right, to: otherBounds.left, value: otherBounds.left - bounds.right });
      } else if (otherBounds.right <= bounds.left && bounds.left >= canvas.padding) {
        distances.push({ direction: 'horizontal', from: otherBounds.right, to: bounds.left, value: bounds.left - otherBounds.right });
      }
    }

    // 垂直距离（块在水平方向上有重叠）
    if (bounds.left < otherBounds.right && bounds.right > otherBounds.left) {
      if (otherBounds.top >= bounds.bottom && bounds.bottom <= canvas.height - canvas.padding) {
        distances.push({ direction: 'vertical', from: bounds.bottom, to: otherBounds.top, value: otherBounds.top - bounds.bottom });
      } else if (otherBounds.bottom <= bounds.top && bounds.top >= canvas.padding) {
        distances.push({ direction: 'vertical', from: otherBounds.bottom, to: bounds.top, value: bounds.top - otherBounds.bottom });
      }
    }
  }

  return distances;
}

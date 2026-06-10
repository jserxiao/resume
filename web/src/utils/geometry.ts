import type { BlockGroup, DecorationAnchor } from '@/types';

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

/**
 * 从装饰锚点列表构建 SVG path d 属性字符串
 * 支持直线（L）和二次贝塞尔曲线（Q），根据 handleOut / handleIn 决定
 * 优先使用 handleOut，若不存在则使用 handleIn，两者都没有则直线连接
 */
export function buildDecoPathD(
  anchors: DecorationAnchor[],
  isClosed: boolean,
): string {
  if (anchors.length === 0) return '';

  let d = `M ${anchors[0].x} ${anchors[0].y}`;
  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1];
    const curr = anchors[i];
    const control = prev.handleOut || curr.handleIn;
    if (control) {
      d += ` Q ${control.x} ${control.y} ${curr.x} ${curr.y}`;
    } else {
      d += ` L ${curr.x} ${curr.y}`;
    }
  }

  // 闭合路径
  if (isClosed && anchors.length >= 3) {
    const last = anchors[anchors.length - 1];
    const first = anchors[0];
    const control = last.handleOut || first.handleIn;
    if (control) {
      d += ` Q ${control.x} ${control.y} ${first.x} ${first.y}`;
    } else {
      d += ` L ${first.x} ${first.y}`;
    }
    d += ' Z';
  }

  return d;
}

/**
 * 对二次贝塞尔曲线进行采样，返回曲线上的点
 * @param p0 起点
 * @param p1 控制点
 * @param p2 终点
 * @param steps 采样步数
 */
function sampleQuadraticBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  steps: number,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    points.push({ x, y });
  }
  return points;
}

/**
 * 计算装饰路径的实际边界框（基于贝塞尔曲线采样点）
 * 比直接用控制柄坐标更精确，避免控制柄远离曲线导致大片空白
 */
export function getDecoPathBounds(
  anchors: DecorationAnchor[],
  isClosed: boolean,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (anchors.length === 0) return null;

  const allPoints: { x: number; y: number }[] = [{ x: anchors[0].x, y: anchors[0].y }];
  const bezierSteps = 8; // 每段贝塞尔曲线采样8个点，足够精确

  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1];
    const curr = anchors[i];
    const control = prev.handleOut || curr.handleIn;
    if (control) {
      allPoints.push(...sampleQuadraticBezier(prev, control, curr, bezierSteps));
    } else {
      allPoints.push({ x: curr.x, y: curr.y });
    }
  }

  // 闭合段
  if (isClosed && anchors.length >= 3) {
    const last = anchors[anchors.length - 1];
    const first = anchors[0];
    const control = last.handleOut || first.handleIn;
    if (control) {
      allPoints.push(...sampleQuadraticBezier(last, control, first, bezierSteps));
    } else {
      allPoints.push({ x: first.x, y: first.y });
    }
  }

  return {
    minX: Math.min(...allPoints.map(p => p.x)),
    minY: Math.min(...allPoints.map(p => p.y)),
    maxX: Math.max(...allPoints.map(p => p.x)),
    maxY: Math.max(...allPoints.map(p => p.y)),
  };
}

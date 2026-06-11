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

// ========== 装饰形状生成器 ==========
// 所有函数接受 (x, y, w, h) 表示外接矩形，返回 AnchorPixel[] 供编辑器使用

/** 形状锚点（与 AnchorPixel 兼容） */
export interface ShapeAnchor {
  x: number;
  y: number;
  handleOut?: { x: number; y: number } | null;
  handleIn?: { x: number; y: number } | null;
}

/** 形状工厂类型 */
export type ShapeType = 'select' | 'rectangle' | 'rounded-rect' | 'circle' | 'ellipse' | 'triangle' | 'diamond' | 'star' | 'heart' | 'arrow-right' | 'hexagon';

/** 为两点之间生成对称的贝塞尔控制柄 */
function symmetricHandles(p1: ShapeAnchor, p2: ShapeAnchor, curvature = 0.3): [ShapeAnchor, ShapeAnchor] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return [p1, p2];
  const nx = dx / dist;
  const ny = dy / dist;
  const handleLen = dist * curvature;
  return [
    { ...p1, handleOut: { x: p1.x + nx * handleLen, y: p1.y + ny * handleLen } },
    { ...p2, handleIn: { x: p2.x - nx * handleLen, y: p2.y - ny * handleLen } },
  ];
}

/** 矩形 */
export function generateRectangle(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** 圆角矩形 */
export function generateRoundedRect(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  const r = Math.min(w, h) * 0.15; // 圆角半径
  return [
    { x: x + r, y, handleOut: { x: x + r + r * 0.55, y }, handleIn: { x: x + r - r * 0.55, y } },
    { x: x + w - r, y, handleOut: { x: x + w - r + r * 0.55, y }, handleIn: { x: x + w - r - r * 0.55, y } },
    { x: x + w, y: y + r, handleOut: { x: x + w, y: y + r + r * 0.55 }, handleIn: { x: x + w, y: y + r - r * 0.55 } },
    { x: x + w, y: y + h - r, handleOut: { x: x + w, y: y + h - r + r * 0.55 }, handleIn: { x: x + w, y: y + h - r - r * 0.55 } },
    { x: x + w - r, y: y + h, handleOut: { x: x + w - r + r * 0.55, y: y + h }, handleIn: { x: x + w - r - r * 0.55, y: y + h } },
    { x: x + r, y: y + h, handleOut: { x: x + r + r * 0.55, y: y + h }, handleIn: { x: x + r - r * 0.55, y: y + h } },
    { x, y: y + h - r, handleOut: { x, y: y + h - r + r * 0.55 }, handleIn: { x, y: y + h - r - r * 0.55 } },
    { x, y: y + r, handleOut: { x, y: y + r + r * 0.55 }, handleIn: { x, y: y + r - r * 0.55 } },
  ];
}

/** 圆形（用8个锚点+二次贝塞尔控制柄近似） */
export function generateCircle(cx: number, cy: number, _w: number, _h: number): ShapeAnchor[] {
  const r = Math.min(_w, _h) / 2;
  // 8个等分点，从顶部开始顺时针
  // 中间角度直接用 i*π/4 + π/8 - π/2 计算避免角度环绕问题
  const controlR = r / Math.cos(Math.PI / 8); // 控制点到圆心的距离
  const points: ShapeAnchor[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    const midAngle = -Math.PI / 2 + (i * Math.PI) / 4 + Math.PI / 8;
    const controlX = cx + Math.cos(midAngle) * controlR;
    const controlY = cy + Math.sin(midAngle) * controlR;
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      handleOut: { x: controlX, y: controlY },
    });
    // 为下一个点设置 handleIn（指向同一个控制点）
    // 下一个点的 handleIn 在下一轮迭代中通过展开运算符保留
  }
  // 设置每个点的 handleIn（指向前一段弧线的控制点）
  for (let i = 0; i < 8; i++) {
    const prevMidAngle = -Math.PI / 2 + ((i - 1 + 8) * Math.PI) / 4 + Math.PI / 8;
    points[i] = {
      ...points[i],
      handleIn: { x: cx + Math.cos(prevMidAngle) * controlR, y: cy + Math.sin(prevMidAngle) * controlR },
    };
  }
  return points;
}

/** 椭圆（用8个锚点+二次贝塞尔控制柄近似） */
export function generateEllipse(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  // 8个等分点，从顶部开始顺时针
  // 中间角度直接用 i*π/4 + π/8 - π/2 计算避免角度环绕问题
  const controlDist = 1 / Math.cos(Math.PI / 8); // 倍率
  const points: ShapeAnchor[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    const midAngle = -Math.PI / 2 + (i * Math.PI) / 4 + Math.PI / 8;
    const controlX = cx + Math.cos(midAngle) * rx * controlDist;
    const controlY = cy + Math.sin(midAngle) * ry * controlDist;
    points.push({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
      handleOut: { x: controlX, y: controlY },
    });
  }
  // 设置每个点的 handleIn
  for (let i = 0; i < 8; i++) {
    const prevMidAngle = -Math.PI / 2 + ((i - 1 + 8) * Math.PI) / 4 + Math.PI / 8;
    points[i] = {
      ...points[i],
      handleIn: { x: cx + Math.cos(prevMidAngle) * rx * controlDist, y: cy + Math.sin(prevMidAngle) * ry * controlDist },
    };
  }
  return points;
}

/** 三角形 */
export function generateTriangle(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  return [
    { x: x + w / 2, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** 菱形 */
export function generateDiamond(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  return [
    { x: x + w / 2, y },
    { x: x + w, y: y + h / 2 },
    { x: x + w / 2, y: y + h },
    { x, y: y + h / 2 },
  ];
}

/** 五角星 */
export function generateStar(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outerRx = w / 2;
  const outerRy = h / 2;
  const innerRx = outerRx * 0.38;
  const innerRy = outerRy * 0.38;
  const points: ShapeAnchor[] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    points.push({ x: cx + Math.cos(outerAngle) * outerRx, y: cy + Math.sin(outerAngle) * outerRy });
    points.push({ x: cx + Math.cos(innerAngle) * innerRx, y: cy + Math.sin(innerAngle) * innerRy });
  }
  return points;
}

/** 心形（经典参数方程 + 二次贝塞尔拟合）
 *  x(t) = 16 sin³(t)
 *  y(t) = 13 cos(t) − 5 cos(2t) − 2 cos(3t) − cos(4t)
 *  用16段二次贝塞尔曲线拟合，弧顶圆润自然
 */
export function generateHeart(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  // 经典心形参数方程
  const hx = (t: number) => 16 * Math.pow(Math.sin(t), 3);
  const hy = (t: number) =>
    13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

  // 先采样计算心形边界，以便缩放和居中到 (x, y, w, h) 矩形内
  const samples = 200;
  let rawMinX = Infinity, rawMaxX = -Infinity;
  let rawMinY = Infinity, rawMaxY = -Infinity;
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * 2 * Math.PI;
    const rx = hx(t);
    const ry = hy(t);
    rawMinX = Math.min(rawMinX, rx);
    rawMaxX = Math.max(rawMaxX, rx);
    rawMinY = Math.min(rawMinY, ry);
    rawMaxY = Math.max(rawMaxY, ry);
  }
  const rawW = rawMaxX - rawMinX;
  const rawH = rawMaxY - rawMinY;

  // 缩放到目标矩形，保持宽高比（取较小缩放比以完全放入矩形）
  const scaleX = w / rawW;
  const scaleY = h / rawH;
  const scale = Math.min(scaleX, scaleY);

  // 居中偏移
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rawCx = (rawMinX + rawMaxX) / 2;
  const rawCy = (rawMinY + rawMaxY) / 2;

  /** 参数方程坐标 → 屏幕像素坐标 */
  const toScreen = (t: number) => ({
    px: cx + (hx(t) - rawCx) * scale,
    py: cy - (hy(t) - rawCy) * scale, // SVG y 轴翻转
  });

  // 用16段二次贝塞尔曲线拟合
  const n = 16;
  const anchors: { px: number; py: number }[] = [];
  const controls: { px: number; py: number }[] = [];

  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * 2 * Math.PI;
    const tMid = ((i + 0.5) / n) * 2 * Math.PI;

    const p0 = toScreen(t0);
    const pMid = toScreen(tMid);
    anchors.push(p0);

    // 拟合控制点：Q(0.5) = 0.25·P0 + 0.5·C + 0.25·P1
    // 在下一轮迭代才能知道 P1，但可以用中点近似：
    // C ≈ 2·Pmid − 0.5·P0 − 0.5·P1，用 Pmid 代替 (P0+P1)/2 得到：
    // 简化：C = 2·Pmid − (P0 + P1)/2
    // 先用 Pmid 预估 P1（即假设 P1 ≈ 2·Pmid − P0，线性外推）
    const p1Est = { px: 2 * pMid.px - p0.px, py: 2 * pMid.py - p0.py };
    const controlPx = 2 * pMid.px - 0.5 * p0.px - 0.5 * p1Est.px;
    const controlPy = 2 * pMid.py - 0.5 * p0.py - 0.5 * p1Est.py;
    controls.push({ px: controlPx, py: controlPy });
  }

  // 更精确：用已知的真实锚点重新计算控制点
  const finalControls = controls.map((c, i) => {
    const nextI = (i + 1) % n;
    const p0 = anchors[i];
    const p1 = anchors[nextI];
    const tMid = ((i + 0.5) / n) * 2 * Math.PI;
    const pMid = toScreen(tMid);
    return {
      px: 2 * pMid.px - 0.5 * p0.px - 0.5 * p1.px,
      py: 2 * pMid.py - 0.5 * p0.py - 0.5 * p1.py,
    };
  });

  // 构建 ShapeAnchor[]
  const points: ShapeAnchor[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      x: anchors[i].px,
      y: anchors[i].py,
      handleOut: { x: finalControls[i].px, y: finalControls[i].py },
    });
  }
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    points[i] = {
      ...points[i],
      handleIn: { x: finalControls[prevIdx].px, y: finalControls[prevIdx].py },
    };
  }
  return points;
}

/** 右箭头 */
export function generateArrowRight(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  const shaftH = h * 0.35;
  const headW = w * 0.4;
  return [
    { x, y: y + (h - shaftH) / 2 },
    { x: x + w - headW, y: y + (h - shaftH) / 2 },
    { x: x + w - headW, y },
    { x: x + w, y: y + h / 2 },
    { x: x + w - headW, y: y + h },
    { x: x + w - headW, y: y + (h + shaftH) / 2 },
    { x, y: y + (h + shaftH) / 2 },
  ];
}

/** 六边形 */
export function generateHexagon(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const points: ShapeAnchor[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
    points.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  }
  return points;
}

/** 根据形状类型生成锚点 */
export function generateShapeAnchors(shape: ShapeType, x: number, y: number, w: number, h: number): ShapeAnchor[] {
  switch (shape) {
    case 'rectangle': return generateRectangle(x, y, w, h);
    case 'rounded-rect': return generateRoundedRect(x, y, w, h);
    case 'circle': return generateCircle(x + w / 2, y + h / 2, w, h);
    case 'ellipse': return generateEllipse(x, y, w, h);
    case 'triangle': return generateTriangle(x, y, w, h);
    case 'diamond': return generateDiamond(x, y, w, h);
    case 'star': return generateStar(x, y, w, h);
    case 'heart': return generateHeart(x, y, w, h);
    case 'arrow-right': return generateArrowRight(x, y, w, h);
    case 'hexagon': return generateHexagon(x, y, w, h);
    default: return [];
  }
}

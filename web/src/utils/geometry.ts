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

/** 心形（用10个锚点+二次贝塞尔控制柄近似）
 *  5个关键点定义左半部分（含控制点），右半通过镜像生成，确保完美对称
 */
export function generateHeart(x: number, y: number, w: number, h: number): ShapeAnchor[] {
  const cx = x + w / 2;

  // 左半5个点（从底部尖角顺时针到顶部凹陷）
  // 锚点坐标使用 (dx, dy) 相对于 (cx, y)
  const leftAnchors = [
    { dx: 0,     dy: h * 1.0  },  // 底部尖角
    { dx: -0.44, dy: h * 0.55 },  // 左侧最宽处
    { dx: -0.46, dy: h * 0.22 },  // 左上弧线
    { dx: -0.24, dy: h * 0.02 },  // 左弧顶
    { dx: 0,     dy: h * 0.18  },  // 顶部凹陷
  ];

  // 每段曲线的二次贝塞尔控制点（左半4段 + 闭合1段）
  // 控制点在曲线外侧
  const leftControls = [
    // P0→P1: 尖角到最宽处，控制点在左下外侧
    { dx: -0.02, dy: h * 0.88 },
    // P1→P2: 最宽处到左上，控制点在左外侧
    { dx: -0.58, dy: h * 0.38 },
    // P2→P3: 左上弧线，控制点在左上外侧
    { dx: -0.52, dy: h * 0.06 },
    // P3→P4: 弧顶到凹陷，控制点在上方
    { dx: -0.22, dy: -h * 0.12 },
  ];

  // 右半镜像点（逆序，从凹陷回到底部）
  // 不包含凹陷点（已在左半末尾）和底部尖角（已在左半开头）
  const rightAnchors = leftAnchors.slice(1, -1).map(a => ({
    dx: -a.dx,
    dy: a.dy,
  })).reverse();

  // 右半镜像控制点（逆序，从P4→P5的控制点开始）
  const rightControls = leftControls.slice().reverse().map(c => ({
    dx: -c.dx,
    dy: c.dy,
  }));

  // 闭合段控制点（P9→P0: 从右下弯曲回尖角）
  const closeControl = { dx: 0.02, dy: h * 0.88 };

  // 合并所有点
  const allAnchors = [...leftAnchors, ...rightAnchors];
  const allControls = [...leftControls, ...rightControls, closeControl];

  // 转换为像素坐标
  const pts = allAnchors.map(a => ({
    x: cx + a.dx * w,
    y: y + a.dy,
  }));
  const controls = allControls.map(c => ({
    x: cx + c.dx * w,
    y: y + c.dy,
  }));

  const points: ShapeAnchor[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    points.push({
      x: pts[i].x,
      y: pts[i].y,
      handleOut: { x: controls[i].x, y: controls[i].y },
    });
  }
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    points[i] = {
      ...points[i],
      handleIn: { x: controls[prevIdx].x, y: controls[prevIdx].y },
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

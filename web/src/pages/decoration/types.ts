/**
 * 装饰编辑器内部类型定义
 */

/** 锚点坐标（像素），可选包含控制柄 */
export interface AnchorPixel {
  x: number;
  y: number;
  /** 出控制柄：控制当前锚点到下一个锚点之间的曲线弯曲 */
  handleOut?: { x: number; y: number } | null;
  /** 入控制柄：控制上一个锚点到当前锚点之间的曲线弯曲 */
  handleIn?: { x: number; y: number } | null;
}

/** 编辑态路径 */
export interface EditablePath {
  id: string;
  anchors: AnchorPixel[];
  isClosed: boolean;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  visible: boolean;
  /** 裁剪矩形（像素），仅显示该矩形范围内的图形 */
  clipRect?: { x: number; y: number; width: number; height: number } | null;
  /** 逐边颜色：edgeColors[i] 为第 i 条边（从锚点 i 到锚点 i+1）的描边色 */
  edgeColors?: string[];
}

/** 辅助线 */
export interface GuideLine {
  type: 'horizontal' | 'vertical';
  position: number;
}

/** 距离标注 */
export interface DistanceLabel {
  id: string;
  x: number;
  y: number;
  text: string;
}

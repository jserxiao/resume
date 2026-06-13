// ========== 画布默认配置 ==========
/** A4 210mm @96dpi */
export const CANVAS_DEFAULT_WIDTH = 794;
/** A4 297mm @96dpi */
export const CANVAS_DEFAULT_HEIGHT = 1123;
/** 约10mm内边距 */
export const CANVAS_DEFAULT_PADDING = 40;
/** 默认画布背景色 */
export const CANVAS_DEFAULT_BACKGROUND = '#ffffff';

// ========== 水印默认配置 ==========
/** 水印默认文字 */
export const WATERMARK_DEFAULT_TEXT = '';
/** 水印默认字号(px) */
export const WATERMARK_DEFAULT_FONT_SIZE = 16;
/** 水印默认旋转角度(度) */
export const WATERMARK_DEFAULT_ROTATION = -22;
/** 水印默认颜色 */
export const WATERMARK_DEFAULT_COLOR = 'rgba(0, 0, 0, 0.08)';
/** 水印默认透明度 */
export const WATERMARK_DEFAULT_OPACITY = 1;
/** 水印默认水平间距(px) */
export const WATERMARK_DEFAULT_GAP_X = 120;
/** 水印默认垂直间距(px) */
export const WATERMARK_DEFAULT_GAP_Y = 80;

// ========== 对齐与吸附 ==========
/** 对齐吸附阈值(px) - 元素边界与参考线距离小于此值时触发吸附 */
export const ALIGN_THRESHOLD = 5;
/** 默认网格大小(px) */
export const GRID_SIZE = 8;
/** 块最小宽度(px) */
export const BLOCK_MIN_WIDTH = 50;
/** 块最小高度(px) */
export const BLOCK_MIN_HEIGHT = 30;
/** 调整大小最小宽度(px) */
export const RESIZE_MIN_WIDTH = 100;
/** 调整大小最小高度(px) */
export const RESIZE_MIN_HEIGHT = 40;

// ========== 距离标注样式 ==========
/** 距离标注线颜色 */
export const DISTANCE_LINE_COLOR = '#8b5cf6';
/** 距离标注文字颜色 */
export const DISTANCE_TEXT_COLOR = '#8b5cf6';
/** 距离标注文字背景 */
export const DISTANCE_TEXT_BG = 'rgba(139, 92, 246, 0.08)';
/** 距离标注文字大小(px) */
export const DISTANCE_TEXT_FONT_SIZE = 10;

// ========== 对齐线样式 ==========
/** 对齐线颜色 */
export const ALIGN_GUIDE_COLOR = '#f43f5e';

// ========== 块样式默认值 ==========
/** 块默认外边距 (上/右/下/左) */
export const BLOCK_DEFAULT_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };
/** 块默认内边距 (上/右/下/左) */
export const BLOCK_DEFAULT_PADDING = { top: 0, right: 0, bottom: 0, left: 0 };
/** 块默认背景色（空字符串表示跟随主题） */
export const BLOCK_DEFAULT_BACKGROUND = '';
/** 块默认背景图片 */
export const BLOCK_DEFAULT_BACKGROUND_IMAGE = '';
/** 外边距区域显示颜色（编辑模式下的暗色标记） */
export const MARGIN_INDICATOR_COLOR = 'rgba(59, 130, 246, 0.08)';
/** 外边距区域边框颜色 */
export const MARGIN_INDICATOR_BORDER_COLOR = 'rgba(59, 130, 246, 0.15)';

// ========== 画布内边距显示 ==========
/** 画布内边距区域显示颜色（编辑模式下的暗色标记） */
export const CANVAS_PADDING_INDICATOR_COLOR = 'rgba(139, 92, 246, 0.04)';
/** 画布内边距区域边框颜色 */
export const CANVAS_PADDING_INDICATOR_BORDER_COLOR = 'rgba(139, 92, 246, 0.18)';

// ========== 默认块尺寸 ==========
/** 根据分类获取块默认宽度 */
export function getDefaultBlockWidth(category: string): number {
  switch (category) {
    case '基础组件': return 240;
    case '组合组件': return 400;
    case '布局组件': return 400;
    default: return 350;
  }
}

/** 根据模板名称获取块默认高度 */
export function getDefaultBlockHeight(name: string): number {
  switch (name) {
    // 基础组件
    case '文本框': return 60;
    case '链接': return 40;
    case '日期': return 40;
    case '评分': return 50;
    case '头像': return 100;
    // 布局组件
    case '弹性盒子': return 200;
    // 组合组件
    case '头部信息': return 120;
    case '基本信息': return 100;
    case '工作经历': return 180;
    case '教育背景': return 140;
    case '项目经验': return 180;
    case '技能': return 120;
    case '自我总结': return 100;
    case '证书': return 80;
    case '语言': return 80;
    case '兴趣爱好': return 60;
    default: return 120;
  }
}

// ========== 装饰编辑器常量 ==========
/** 装饰编辑器网格大小(px) */
export const DECO_GRID_SIZE = 20;
/** 装饰编辑器吸附阈值(px) */
export const DECO_SNAP_THRESHOLD = 5;
/** 装饰编辑器闭合路径阈值(px) - 鼠标靠近第一个锚点多近时闭合路径 */
export const DECO_CLOSE_THRESHOLD = 12;
/** 路径颜色标识 - 用于区分不同路径 */
export const PATH_COLORS = ['#1a56db', '#c026d3', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// ========== 默认颜色值 ==========
/** 默认主色（与 CSS --color-primary 一致） */
export const DEFAULT_PRIMARY_COLOR = '#1a56db';
/** 默认边框颜色（与 CSS --color-border 一致） */
export const DEFAULT_BORDER_COLOR = '#e5e7eb';
/** 完成状态色（与 CSS --color-success 一致） */
export const COMPLETE_COLOR = '#22c55e';
/** 分组色（与 CSS --color-warning 一致） */
export const GROUP_COLOR = '#f59e0b';
/** 默认画布背景色（与 CSS --color-border 一致，用于预览抽屉背景） */
export const PREVIEW_BG_COLOR = '#e5e7eb';
/** 辅助文字色 */
export const TEXT_SECONDARY_COLOR = '#666';
/** 占位/提示文字色 */
export const TEXT_HINT_COLOR = '#999';
/** 块默认圆角(px) */
export const BLOCK_DEFAULT_BORDER_RADIUS = 6;

// ========== 版本号 ==========
export const CURRENT_DATA_VERSION = 4;

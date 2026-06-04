// ========== 字段类型 ==========
export enum FieldType {
  Text = 'text',               // 单行文本
  TextArea = 'textarea',        // 多行文本
  RichText = 'richtext',       // 富文本
  Date = 'date',               // 日期
  Image = 'image',             // 图片
  TagList = 'taglist',         // 标签列表
  Link = 'link',               // 链接
  Select = 'select',           // 下拉选择
  Switch = 'switch',           // 开关
  Rating = 'rating',           // 星级评分
  SubBlock = 'subblock',       // 子块组
  Number = 'number',           // 数字
  Percentage = 'percentage',   // 百分比
  Color = 'color',             // 颜色
  Decoration = 'decoration',   // 装饰元素（不规则图形）
}

// ========== 字段定义（块模板中的字段） ==========
export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  order: number;
  defaultValue: string;
  required: boolean;
  placeholder: string;
  options?: string[];           // Select 类型的选项列表
}

// ========== 块模板 ==========
export interface BlockTemplate {
  id: string;
  name: string;
  fields: FieldDefinition[];
  category: string;             // 分类标签，如 "教育类"、"经历类"
  isPreset: boolean;            // 是否是系统预设
  createdAt: number;
  updatedAt: number;
}

// ========== 块实例 ==========
export interface BlockInstance {
  id: string;
  templateId: string;
  templateName: string;           // 模板名称冗余，用于导入时模板ID匹配失败的降级识别
  name: string;                   // 可从模板继承，也可单独重命名
  fields: Record<string, string>; // fieldId -> value
  fieldNamesMap?: Record<string, string>; // fieldId -> fieldName 映射，用于导入时字段ID变更后按名称恢复数据
  decorations: DecorationElement[]; // 块内的装饰元素列表
  visible: boolean;               // 是否可见（导出时是否包含）
  locked: boolean;                // 是否锁定
  order: number;                  // 同一栏位内的排序权重，值越小越靠前
  colorTag?: string;              // 颜色标记
  column: 'header' | 'left' | 'right';   // 布局中的位置：头部 / 左栏 / 右栏
}

// ========== 简历 ==========
export interface Resume {
  id: string;                   // 简历唯一ID
  name: string;                 // 简历名称（展示用）
  title: string;                // 简历标题（PDF导出用）
  layoutId: string;             // 当前使用的布局模板ID（如 'classic-single', 'tech-double'）
  blocks: BlockInstance[];
  colorScheme: ColorScheme;
  layout: LayoutConfig;
  createdAt: number;
  updatedAt: number;
  lastSavedAt: number | null;
  version: number;              // 数据版本号，便于后续迁移（当前为 2）
}

// ========== 色彩方案 ==========
export interface ColorScheme {
  id: string;
  name: string;
  primary: string;              // 主色
  secondary: string;            // 辅色
  background: string;           // 背景色
  blockBackground: string;      // 块背景色
  textPrimary: string;          // 正文色
  textSecondary: string;        // 副文字色
  textMuted: string;            // 标注色
  accent: string;               // 强调色
  isPreset: boolean;
}

// ========== 布局配置 ==========
export interface LayoutConfig {
  type: 'single' | 'double' | 'triple' | 'mixed';
  columnRatio: [number, number]; // 双栏比例，如 [30, 70]
  headerStyle: HeaderStyle;
  density: 'compact' | 'standard' | 'spacious';
  pageSize: PageSize;
  pageMargin: PageMargin;
  pageBreakStrategy: 'force-one' | 'auto' | 'manual';
}

export type HeaderStyle = 'center' | 'left-align' | 'two-line' | 'with-avatar';

export interface PageSize {
  name: string;
  width: number;  // mm
  height: number; // mm
}

export interface PageMargin {
  top: number;    // mm
  right: number;
  bottom: number;
  left: number;
}

// ========== 导出配置 ==========
export interface ExportOptions {
  format: 'pdf' | 'png' | 'jpg' | 'json';
  range: 'all' | 'selected';
  watermark: boolean;
  fileName: string;
}

// ========== 编辑器状态 ==========
export interface EditorState {
  selectedBlockId: string | null;
  isFullscreen: boolean;
  zoom: number;                  // 75 / 100 / 150
  theme: 'light' | 'dark' | 'system';
  leftPanelWidth: number;
  rightPanelWidth: number;
  autoSave: boolean;
  autoSaveInterval: number;     // 秒
  previewOpen: boolean;          // 预览抽屉是否打开
}

// ========== 装饰元素 ==========
export enum DecorationType {
  Triangle = 'triangle',         // 三角形
  Circle = 'circle',             // 圆形
  Diamond = 'diamond',           // 菱形
  Pentagon = 'pentagon',         // 五边形
  Hexagon = 'hexagon',           // 六边形
  Star = 'star',                 // 五角星
  Arrow = 'arrow',               // 箭头
  Wave = 'wave',                 // 波浪线
  Bracket = 'bracket',           // 花括号装饰
  Divider = 'divider',           // 分割线装饰
  Ribbon = 'ribbon',             // 缎带
  CustomSvg = 'custom-svg',      // 自定义SVG路径
}

/** 装饰元素定义 — 描述一种可放置的装饰图形 */
export interface DecorationDefinition {
  id: string;                     // 装饰类型ID（如 'deco-triangle'）
  name: string;                   // 显示名称
  type: DecorationType;
  svgPath: string;                // SVG path data（不规则图形的路径描述）
  defaultWidth: number;           // 默认宽度（px）
  defaultHeight: number;          // 默认高度（px）
  defaultColor: string;           // 默认填充色
  defaultStrokeColor: string;     // 默认描边色
  defaultStrokeWidth: number;     // 默认描边宽度
  defaultOpacity: number;         // 默认透明度 0-1
  category: string;               // 分类，如 "几何"、"线条"、"标签"
  isPreset: boolean;
}

/** 装饰元素实例 — 放置在块中的具体装饰 */
export interface DecorationElement {
  id: string;                     // 实例唯一ID
  decorationId: string;           // 引用 DecorationDefinition.id
  x: number;                      // 在块内的X偏移（相对于块左上角）
  y: number;                      // 在块内的Y偏移
  width: number;                  // 宽度
  height: number;                 // 高度
  rotation: number;               // 旋转角度（度）
  color: string;                  // 填充色
  strokeColor: string;            // 描边色
  strokeWidth: number;            // 描边宽度
  opacity: number;                // 透明度 0-1
  zIndex: number;                 // 层级
}

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
  category: string;             // 分类标签，如 "基础组件"、"组合组件"
  isPreset: boolean;            // 是否是系统预设
  createdAt: number;
  updatedAt: number;
}

// ========== 块边距/内边距 ==========
export interface BoxSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ========== 块样式 ==========
export interface BlockStyle {
  margin?: BoxSides;              // 外边距（编辑模式以暗色显示）
  padding?: BoxSides;             // 内边距
  backgroundColor?: string;       // 背景颜色（空字符串跟随主题）
  color?: string;                  // 文字颜色（空字符串跟随主题）
  backgroundImage?: string;       // 背景图片URL
  backgroundSize?: 'cover' | 'contain' | 'auto'; // 背景图片适配方式
  borderRadius?: number;          // 圆角(px)
  borderColor?: string;           // 边框颜色
  borderWidth?: number;           // 边框宽度(px)
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double'; // 边框样式
  opacity?: number;               // 透明度 0-1
}

// ========== 块实例（自由定位元素） ==========
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
  colorTag?: string;              // 颜色标记
  // ---- 自由定位属性 ----
  x: number;                      // 在画布上的X坐标（px）
  y: number;                      // 在画布上的Y坐标（px）
  width: number;                  // 块宽度（px）
  height: number;                 // 块高度（px）
  zIndex: number;                 // 层级
  // ---- 样式属性 ----
  style?: BlockStyle;             // 块样式（外边距、内边距、背景等）
  // ---- 旋转属性 ----
  rotation?: number;              // 旋转角度（度），默认0
  // ---- 分组信息 ----
  groupId?: string;               // 所属分组ID（可选）
}

// ========== 分组定义 ==========
export interface BlockGroup {
  id: string;
  name: string;                   // 分组名称
  blockIds: string[];             // 分组内块实例ID列表
  rotation?: number;              // 分组旋转角度（度），默认0
  createdAt: number;
  updatedAt: number;
}

// ========== 自定义元素模板（由分组保存而来） ==========
export interface CustomElementTemplate {
  id: string;
  name: string;                   // 元素模板名称
  category: string;               // 分类
  isPreset: boolean;              // 是否预设
  createdAt: number;
  updatedAt: number;
  // 分组内各块的相对布局
  blocks: {
    templateId: string;
    templateName: string;
    name: string;
    fields: Record<string, string>;
    fieldNamesMap?: Record<string, string>;
    decorations: DecorationElement[];
    relativeX: number;            // 相对于分组左上角的X偏移
    relativeY: number;            // 相对于分组左上角的Y偏移
    width: number;
    height: number;
    zIndex: number;
  }[];
}

// ========== 简历 ==========
export interface Resume {
  id: string;                   // 简历唯一ID
  name: string;                 // 简历名称（展示用）
  title: string;                // 简历标题（PDF导出用）
  blocks: BlockInstance[];
  groups: BlockGroup[];         // 分组信息
  colorScheme: ColorScheme;
  canvas: CanvasConfig;         // 画布配置（替代旧的LayoutConfig）
  createdAt: number;
  updatedAt: number;
  lastSavedAt: number | null;
  version: number;              // 数据版本号，便于后续迁移（当前为 4）
}

// ========== 画布配置 ==========
export interface CanvasConfig {
  width: number;                // 画布宽度（px），默认794（A4 210mm@96dpi）
  height: number;               // 画布高度（px），默认1123（A4 297mm@96dpi）
  padding: number;              // 内边距（px）
  background: string;           // 画布背景色
  backgroundImage?: string;     // 画布背景图片URL
  backgroundSize?: 'cover' | 'contain' | 'auto'; // 背景图片适配方式
  watermark?: WatermarkConfig;  // 水印配置
}

// ========== 水印配置 ==========
export interface WatermarkConfig {
  text: string;                 // 水印文字内容
  fontSize: number;             // 字号（px）
  rotation: number;             // 旋转角度（度，负值表示逆时针）
  color: string;                // 水印颜色（含透明度）
  opacity: number;              // 整体透明度 0~1
  gapX: number;                 // 水平间距（px）
  gapY: number;                 // 垂直间距（px）
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

// ========== 旧布局配置（兼容迁移） ==========
export interface LayoutConfig {
  type: 'single' | 'double' | 'triple' | 'mixed';
  columnRatio: [number, number];
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
  selectedBlockIds: string[];     // 多选的块ID列表（Shift多选）
  selectedGroupId: string | null; // 选中的分组ID
  isFullscreen: boolean;
  theme: 'light' | 'dark' | 'system';
  leftPanelWidth: number;
  rightPanelWidth: number;
  autoSave: boolean;
  autoSaveInterval: number;     // 秒
  previewOpen: boolean;          // 预览抽屉是否打开
  showAlignGuides: boolean;      // 是否显示对齐线
  snapToGrid: boolean;           // 是否吸附网格
  gridSize: number;              // 网格大小（px）
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

/** 自定义装饰的 SVG 路径数据 */
export interface CustomSvgPathData {
  pathD: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  isClosed: boolean;
  clipRect?: { x: number; y: number; width: number; height: number } | null;
  /** 逐边颜色：edgeColors[i] 为第 i 条边（从锚点 i 到锚点 i+1）的描边色，未设置时使用 strokeColor */
  edgeColors?: string[];
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
  // ---- 自定义装饰扩展字段（可选） ----
  customSvgPaths?: CustomSvgPathData[];  // 多路径自定义装饰（新格式）
  customSvgPath?: string;               // 单路径自定义装饰（旧格式兼容）
  customIsClosed?: boolean;              // 旧格式自定义装饰是否闭合
}

// ========== 自定义装饰元素定义（用户通过锚点绘制的装饰图形） ==========
/** 装饰锚点，坐标为 0-100 的百分比，可选包含控制柄用于曲线 */
export interface DecorationAnchor {
  x: number;
  y: number;
  /** 控制柄（可选），用于控制该锚点到下一个锚点之间的曲线弯曲 */
  handleOut?: { x: number; y: number } | null;
  /** 控制柄（可选），用于控制上一个锚点到该锚点之间的曲线弯曲 */
  handleIn?: { x: number; y: number } | null;
}

/** 自定义装饰的一条路径 */
export interface DecorationPath {
  id: string;
  /** 锚点列表，坐标为 0-100 的百分比 */
  anchors: DecorationAnchor[];
  /** 路径是否已闭合 */
  isClosed: boolean;
  /** 填充色 */
  fillColor: string;
  /** 描边色 */
  strokeColor: string;
  /** 描边宽度 */
  strokeWidth: number;
  /** 裁剪矩形（0-100 百分比），仅显示该矩形范围内的图形 */
  clipRect?: { x: number; y: number; width: number; height: number } | null;
  /** 逐边颜色：edgeColors[i] 为第 i 条边（从锚点 i 到锚点 i+1）的描边色，未设置时使用 strokeColor */
  edgeColors?: string[];
}

export interface CustomDecorationDefinition {
  id: string;
  name: string;
  /** 路径列表，一个装饰可包含多条路径 */
  paths: DecorationPath[];
  /** 裁剪后的实际宽度（px），用于放置时的默认块尺寸和编辑还原 */
  stageWidth?: number;
  /** 裁剪后的实际高度（px），用于放置时的默认块尺寸和编辑还原 */
  stageHeight?: number;
  createdAt: number;
  updatedAt: number;
}

// ========== 对齐线 ==========
export interface AlignGuide {
  type: 'horizontal' | 'vertical';
  position: number;              // 对齐线的位置（px）
  start: number;                 // 线段起点
  end: number;                   // 线段终点
}

// ========== 距离标注 ==========
export interface DistanceIndicator {
  direction: 'horizontal' | 'vertical';
  from: number;                  // 起始位置（px）
  to: number;                    // 终止位置（px）
  value: number;                 // 距离值（px）
}

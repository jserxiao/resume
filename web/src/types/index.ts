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
  name: string;                 // 可从模板继承，也可单独重命名
  fields: Record<string, string>; // fieldId -> value
  visible: boolean;             // 是否可见（导出时是否包含）
  locked: boolean;              // 是否锁定
  colorTag?: string;            // 颜色标记
  column?: 'header' | 'left' | 'right';   // 布局中的位置：头部 / 左栏 / 右栏
}

// ========== 简历 ==========
export interface Resume {
  id: string;
  title: string;
  templateId: string;           // 当前使用的布局模板ID
  blocks: BlockInstance[];
  colorScheme: ColorScheme;
  layout: LayoutConfig;
  createdAt: number;
  updatedAt: number;
  lastSavedAt: number | null;
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

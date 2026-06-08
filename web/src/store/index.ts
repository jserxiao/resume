import { create } from 'zustand';
import { produce } from 'immer';
import { v4 as uuid } from 'uuid';
import type {
  Resume,
  BlockInstance,
  BlockTemplate,
  BlockStyle,
  ColorScheme,
  CanvasConfig,
  EditorState,
  DecorationElement,
  BlockGroup,
  CustomElementTemplate,
  LayoutConfig,
} from '../types';
import { presetBlockTemplates, presetColorSchemes } from '../utils/presets';
import {
  CANVAS_DEFAULT_WIDTH,
  CANVAS_DEFAULT_HEIGHT,
  CANVAS_DEFAULT_PADDING,
  CANVAS_DEFAULT_BACKGROUND,
  ALIGN_THRESHOLD,
  CURRENT_DATA_VERSION,
  getDefaultBlockWidth,
  getDefaultBlockHeight,
} from '../utils/constants';

// ========== 默认画布配置 ==========
const DEFAULT_CANVAS: CanvasConfig = {
  width: CANVAS_DEFAULT_WIDTH,
  height: CANVAS_DEFAULT_HEIGHT,
  padding: CANVAS_DEFAULT_PADDING,
  background: CANVAS_DEFAULT_BACKGROUND,
};

// ========== 辅助函数 ==========

/** 获取下一个可用的 zIndex */
function getNextZIndex(blocks: BlockInstance[]): number {
  if (blocks.length === 0) return 1;
  return Math.max(...blocks.map((b) => b.zIndex || 0)) + 1;
}

/** 计算块的边界框 */
function getBlockBounds(block: BlockInstance) {
  return {
    left: block.x,
    right: block.x + block.width,
    top: block.y,
    bottom: block.y + block.height,
    centerX: block.x + block.width / 2,
    centerY: block.y + block.height / 2,
  };
}

// ========== 版本迁移 ==========

const CURRENT_VERSION = CURRENT_DATA_VERSION;

/** 将旧版本 Resume 数据迁移到当前版本 */
function migrateResume(data: Record<string, unknown>): Resume {
  let version = (data.version as number) || 1;

  // v1 → v2: 增加 order、templateName，column 从可选变为必填
  if (version < 2) {
    const blocks = (data.blocks as BlockInstance[]) || [];
    const columns: ('header' | 'left' | 'right')[] = ['header', 'left', 'right'];
    for (const col of columns) {
      const colBlocks = blocks
        .filter((b) => ((b as unknown as Record<string, unknown>).column || 'right') === col)
        .sort(() => 0);
      colBlocks.forEach((b, i) => {
        (b as any).column = (b as any).column || 'right';
        (b as any).order = i;
        b.templateName = b.templateName || b.name || '';
      });
    }
    data.blocks = blocks;
    data.version = 2;
    version = 2;
  }

  // v2 → v3: 增加 decorations 字段
  if (version < 3) {
    const blocks = (data.blocks as BlockInstance[]) || [];
    for (const block of blocks) {
      if (!block.decorations) {
        block.decorations = [];
      }
    }
    data.blocks = blocks;
    data.version = 3;
    version = 3;
  }

  // v3 → v4: 移除布局概念，改为自由定位
  if (version < 4) {
    const blocks = (data.blocks as any[]) || [];
    const layout = data.layout as LayoutConfig | undefined;

    const canvasWidth = CANVAS_DEFAULT_WIDTH;
    const canvasHeight = CANVAS_DEFAULT_HEIGHT;
    const padding = CANVAS_DEFAULT_PADDING;

    // 将旧的column布局转为自由定位
    let currentY = padding;

    // 先处理header块
    const headerBlocks = blocks.filter((b) => b.column === 'header');
    for (const block of headerBlocks) {
      block.x = padding;
      block.y = currentY;
      block.width = canvasWidth - padding * 2;
      block.height = 100; // 默认头部高度
      block.zIndex = 1;
      currentY += 100 + 12;
    }

    if (layout && (layout.type === 'double' || layout.type === 'mixed')) {
      // 双栏布局 → 自由定位
      const leftRatio = layout.columnRatio[0] / 100;
      const leftWidth = (canvasWidth - padding * 2 - 20) * leftRatio;
      const rightWidth = (canvasWidth - padding * 2 - 20) * (1 - leftRatio);
      const leftX = padding;
      const rightX = padding + leftWidth + 20;

      let leftY = currentY;
      let rightY = currentY;

      const leftBlocks = blocks.filter((b) => b.column === 'left');
      for (const block of leftBlocks) {
        block.x = leftX;
        block.y = leftY;
        block.width = leftWidth;
        block.height = 120; // 默认块高度
        block.zIndex = 1;
        leftY += 120 + 8;
      }

      const rightBlocks = blocks.filter((b) => b.column === 'right');
      for (const block of rightBlocks) {
        block.x = rightX;
        block.y = rightY;
        block.width = rightWidth;
        block.height = 120;
        block.zIndex = 1;
        rightY += 120 + 8;
      }
    } else {
      // 单栏布局
      const rightBlocks = blocks.filter((b) => b.column === 'right');
      for (const block of rightBlocks) {
        block.x = padding;
        block.y = currentY;
        block.width = canvasWidth - padding * 2;
        block.height = 120;
        block.zIndex = 1;
        currentY += 120 + 8;
      }
    }

    // 清除旧的column和order属性
    for (const block of blocks) {
      delete (block as any).column;
      delete (block as any).order;
      if (!block.x) block.x = padding;
      if (!block.y) block.y = padding;
      if (!block.width) block.width = 300;
      if (!block.height) block.height = 120;
      if (!block.zIndex) block.zIndex = 1;
    }

    data.blocks = blocks;
    data.canvas = {
      width: canvasWidth,
      height: canvasHeight,
      padding,
      background: CANVAS_DEFAULT_BACKGROUND,
    };
    data.groups = [];
    delete data.layout;
    delete data.layoutId;
    data.version = 4;
    version = 4;
  }

  // 未来版本迁移写在这里：
  // if (version < 5) { ... }

  return data as unknown as Resume;
}

/** 从导入的 JSON 中恢复 Resume，同时尝试映射旧模板/字段 ID */
function restoreFromJSON(json: Record<string, unknown>): Resume {
  const migrated = migrateResume(json);
  const templates = presetBlockTemplates;

  // 尝试修复：如果 templateId 在当前模板中找不到，通过 templateName 模糊匹配
  for (const block of migrated.blocks) {
    const matched = templates.find((t) => t.id === block.templateId);
    if (!matched) {
      // 优先按 templateName 匹配
      const byName = templates.find((t) => t.name === block.templateName);
      if (byName) {
        block.templateId = byName.id;
        // 利用 fieldNamesMap 按名称映射字段
        block.fields = remapFields(block.fields, byName, block.fieldNamesMap);
      }
    } else {
      // 模板 ID 存在，但字段 ID 可能已变
      block.fields = remapFields(block.fields, matched, block.fieldNamesMap);
    }
  }

  return migrated;
}

/** 按字段名称将旧字段值映射到新模板字段 ID */
function remapFields(
  oldFields: Record<string, string>,
  template: BlockTemplate,
  fieldNamesMap?: Record<string, string>,
): Record<string, string> {
  const newFields: Record<string, string> = {};

  // 初始化所有字段的默认值
  for (const f of template.fields) {
    newFields[f.id] = f.defaultValue || '';
  }

  // 构建新模板的 fieldName -> fieldId 映射
  const nameToNewId: Record<string, string> = {};
  for (const f of template.fields) {
    nameToNewId[f.name] = f.id;
  }

  // 如果有 fieldNamesMap（fieldId -> fieldName），利用它进行名称映射
  if (fieldNamesMap) {
    for (const [oldFieldId, value] of Object.entries(oldFields)) {
      const fieldName = fieldNamesMap[oldFieldId];
      if (fieldName && nameToNewId[fieldName] !== undefined) {
        newFields[nameToNewId[fieldName]] = value;
      }
    }
    return newFields;
  }

  // 没有 fieldNamesMap 时，先按 ID 直接匹配
  for (const f of template.fields) {
    if (oldFields[f.id] !== undefined) {
      newFields[f.id] = oldFields[f.id];
    }
  }

  return newFields;
}

// ========== 对齐辅助 ==========

// ALIGN_THRESHOLD 已从 constants.ts 导入

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
  // 元素出了编辑区域的哪一边，那一边就不显示距离；另一边仍然可以显示
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

// ========== Store 类型 ==========
interface ResumeStore {
  // 数据
  resume: Resume | null;
  blockTemplates: BlockTemplate[];
  customElementTemplates: CustomElementTemplate[];
  customColorSchemes: ColorScheme[];

  // 编辑器状态
  editor: EditorState;

  // 简历初始化
  initResume: (title: string, colorScheme: ColorScheme) => void;
  clearResume: () => void;

  // 简历操作
  setResumeTitle: (title: string) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setCanvasConfig: (config: Partial<CanvasConfig>) => void;
  markSaved: () => void;

  // JSON 导入
  importFromJSON: (json: Record<string, unknown>) => void;

  // 块实例操作
  addBlock: (templateId: string, x: number, y: number, width?: number, height?: number) => void;
  addBlockFromCustomTemplate: (templateId: string, x: number, y: number) => void;
  removeBlock: (blockId: string) => void;
  removeBlocks: (blockIds: string[]) => void;
  cloneBlock: (blockId: string) => void;
  updateBlockField: (blockId: string, fieldId: string, value: string) => void;
  updateBlockPosition: (blockId: string, x: number, y: number) => void;
  updateBlockSize: (blockId: string, width: number, height: number) => void;
  updateBlockZIndex: (blockId: string, zIndex: number) => void;
  toggleBlockVisibility: (blockId: string) => void;
  toggleBlockLock: (blockId: string) => void;
  setBlockColorTag: (blockId: string, color: string | undefined) => void;
  renameBlock: (blockId: string, name: string) => void;
  updateBlockStyle: (blockId: string, style: Partial<BlockStyle>) => void;

  // 多选操作
  selectBlocks: (blockIds: string[]) => void;
  addToSelection: (blockId: string) => void;
  removeFromSelection: (blockId: string) => void;
  clearSelection: () => void;

  // 分组操作
  createGroup: (name: string) => string;
  addBlocksToGroup: (groupId: string, blockIds: string[]) => void;
  removeGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  updateGroupRotation: (groupId: string, rotation: number) => void;
  updateGroupPosition: (groupId: string, dx: number, dy: number) => void;
  selectGroup: (groupId: string | null) => void;
  groupSelectedBlocks: () => string | null;

  // 自定义元素模板操作
  saveAsCustomTemplate: (name: string, blockIds: string[]) => void;
  removeCustomTemplate: (templateId: string) => void;

  // 块模板操作
  updateBlockTemplate: (templateId: string, updates: Partial<BlockTemplate>) => void;
  removeBlockTemplate: (templateId: string) => void;

  // 配色方案操作
  addCustomColorScheme: (scheme: ColorScheme) => void;
  removeCustomColorScheme: (schemeId: string) => void;

  // 块旋转操作
  updateBlockRotation: (blockId: string, rotation: number) => void;

  // 层级调整操作
  moveBlockZIndex: (blockId: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;

  // 编辑器操作
  selectBlock: (blockId: string | null) => void;
  toggleFullscreen: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setEditorTheme: (theme: 'light' | 'dark' | 'system') => void;
  setPreviewOpen: (open: boolean) => void;
  setShowAlignGuides: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;

  // 装饰元素操作
  addDecoration: (blockId: string, decoration: Omit<DecorationElement, 'id'>) => void;
  removeDecoration: (blockId: string, decorationId: string) => void;
  updateDecoration: (blockId: string, decorationId: string, updates: Partial<DecorationElement>) => void;

  // 选择器
  getSelectedBlock: () => BlockInstance | undefined;
  getBlockTemplate: (templateId: string) => BlockTemplate | undefined;
  getGroupBlocks: (groupId: string) => BlockInstance[];
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  // ========== 初始状态 ==========
  resume: null,
  blockTemplates: [...presetBlockTemplates],
  customElementTemplates: [],
  customColorSchemes: [],

  editor: {
    selectedBlockId: null,
    selectedBlockIds: [],
    selectedGroupId: null,
    isFullscreen: false,
    theme: 'light',
    leftPanelWidth: 280,
    rightPanelWidth: 320,
    autoSave: true,
    autoSaveInterval: 30,
    previewOpen: false,
    showAlignGuides: true,
    snapToGrid: true,
    gridSize: 8,
  },

  // ========== 简历初始化 ==========
  initResume: (title, colorScheme) =>
    set(produce<ResumeStore>((state) => {
      const resumeId = uuid();
      state.resume = {
        id: resumeId,
        name: title,
        title,
        blocks: [],
        groups: [],
        colorScheme,
        canvas: { ...DEFAULT_CANVAS },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSavedAt: null,
        version: CURRENT_VERSION,
      };
      state.editor.selectedBlockId = null;
      state.editor.selectedBlockIds = [];
    })),

  clearResume: () =>
    set(produce<ResumeStore>((state) => {
      state.resume = null;
      state.editor.selectedBlockId = null;
      state.editor.selectedBlockIds = [];
    })),

  // ========== 简历操作 ==========
  setResumeTitle: (title) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      state.resume.title = title;
      state.resume.updatedAt = Date.now();
    })),

  setColorScheme: (scheme) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      state.resume.colorScheme = scheme;
      state.resume.updatedAt = Date.now();
    })),

  setCanvasConfig: (config) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      // 合并配置，undefined 值会从对象中删除对应属性
      for (const [key, value] of Object.entries(config)) {
        if (value === undefined) {
          delete (state.resume.canvas as Record<string, unknown>)[key];
        } else {
          (state.resume.canvas as Record<string, unknown>)[key] = value;
        }
      }
      state.resume.updatedAt = Date.now();
    })),

  markSaved: () =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      state.resume.lastSavedAt = Date.now();
    })),

  // ========== JSON 导入 ==========
  importFromJSON: (json) =>
    set(produce<ResumeStore>((state) => {
      try {
        const resume = restoreFromJSON(json);
        state.resume = resume;
        state.editor.selectedBlockId = null;
        state.editor.selectedBlockIds = [];
      } catch (e) {
        console.error('导入 JSON 失败:', e);
      }
    })),

  // ========== 块实例操作 ==========
  addBlock: (templateId, x, y, width, height) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const template = state.blockTemplates.find((t) => t.id === templateId);
      if (!template) return;

      const fields: Record<string, string> = {};
      template.fields.forEach((f) => {
        fields[f.id] = f.defaultValue || '';
      });

      const fieldNamesMap: Record<string, string> = {};
      template.fields.forEach((f) => {
        fieldNamesMap[f.id] = f.name;
      });

      // 根据模板类型设置默认尺寸
      const defaultWidth = width || getDefaultBlockWidth(template.category);
      const defaultHeight = height || getDefaultBlockHeight(template.name);

      const block: BlockInstance = {
        id: `${state.resume.id}-${templateId}-${uuid().slice(0, 8)}`,
        templateId,
        templateName: template.name,
        name: template.name,
        fields,
        fieldNamesMap,
        decorations: [],
        visible: true,
        locked: false,
        x,
        y,
        width: defaultWidth,
        height: defaultHeight,
        zIndex: getNextZIndex(state.resume.blocks),
      };

      state.resume.blocks.push(block);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = block.id;
      state.editor.selectedBlockIds = [block.id];
    })),

  addBlockFromCustomTemplate: (templateId, x, y) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const template = state.customElementTemplates.find((t) => t.id === templateId);
      if (!template) return;

      for (const blockDef of template.blocks) {
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries(blockDef.fields)) {
          fields[k] = v;
        }

        const block: BlockInstance = {
          id: `${state.resume.id}-custom-${uuid().slice(0, 8)}`,
          templateId: blockDef.templateId,
          templateName: blockDef.templateName,
          name: blockDef.name,
          fields,
          fieldNamesMap: blockDef.fieldNamesMap,
          decorations: blockDef.decorations ? [...blockDef.decorations] : [],
          visible: true,
          locked: false,
          x: x + blockDef.relativeX,
          y: y + blockDef.relativeY,
          width: blockDef.width,
          height: blockDef.height,
          zIndex: getNextZIndex(state.resume.blocks),
        };

        state.resume.blocks.push(block);
      }

      state.resume.updatedAt = Date.now();
    })),

  removeBlock: (blockId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      state.resume.blocks = state.resume.blocks.filter((b) => b.id !== blockId);
      state.resume.updatedAt = Date.now();
      if (state.editor.selectedBlockId === blockId) {
        state.editor.selectedBlockId = null;
      }
      state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter((id) => id !== blockId);
    })),

  removeBlocks: (blockIds) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const blockIdSet = new Set(blockIds);
      state.resume.blocks = state.resume.blocks.filter((b) => !blockIdSet.has(b.id));
      state.resume.updatedAt = Date.now();
      if (blockIdSet.has(state.editor.selectedBlockId || '')) {
        state.editor.selectedBlockId = null;
      }
      state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter((id) => !blockIdSet.has(id));
    })),

  cloneBlock: (blockId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const source = state.resume.blocks.find((b) => b.id === blockId);
      if (!source) return;

      const cloned: BlockInstance = {
        ...JSON.parse(JSON.stringify(source)),
        id: `${state.resume.id}-${source.templateId}-copy-${uuid().slice(0, 8)}`,
        name: `${source.name} (副本)`,
        x: source.x + 20,
        y: source.y + 20,
        zIndex: getNextZIndex(state.resume.blocks),
      };

      state.resume.blocks.push(cloned);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = cloned.id;
      state.editor.selectedBlockIds = [cloned.id];
    })),

  updateBlockField: (blockId, fieldId, value) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.fields[fieldId] = value;
        state.resume.updatedAt = Date.now();
      }
    })),

  updateBlockPosition: (blockId, x, y) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.x = x;
        block.y = y;
        state.resume.updatedAt = Date.now();
      }
    })),

  updateBlockSize: (blockId, width, height) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.width = width;
        block.height = height;
        state.resume.updatedAt = Date.now();
      }
    })),

  updateBlockZIndex: (blockId, zIndex) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.zIndex = zIndex;
        state.resume.updatedAt = Date.now();
      }
    })),

  toggleBlockVisibility: (blockId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.visible = !block.visible;
        state.resume.updatedAt = Date.now();
      }
    })),

  toggleBlockLock: (blockId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.locked = !block.locked;
        state.resume.updatedAt = Date.now();
      }
    })),

  setBlockColorTag: (blockId, color) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.colorTag = color;
        state.resume.updatedAt = Date.now();
      }
    })),

  renameBlock: (blockId, name) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.name = name;
        state.resume.updatedAt = Date.now();
      }
    })),

  updateBlockStyle: (blockId, style) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.style = { ...block.style, ...style };
        state.resume.updatedAt = Date.now();
      }
    })),

  // ========== 多选操作 ==========
  selectBlocks: (blockIds) =>
    set(produce<ResumeStore>((state) => {
      state.editor.selectedBlockIds = blockIds;
      state.editor.selectedBlockId = blockIds.length > 0 ? blockIds[0] : null;
      // 清除分组选中（如果只是选择块，不是通过 selectGroup 选中的）
      state.editor.selectedGroupId = null;
    })),

  addToSelection: (blockId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.editor.selectedBlockIds.includes(blockId)) {
        state.editor.selectedBlockIds.push(blockId);
      }
      state.editor.selectedBlockId = blockId;
    })),

  removeFromSelection: (blockId) =>
    set(produce<ResumeStore>((state) => {
      state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter((id) => id !== blockId);
      if (state.editor.selectedBlockId === blockId) {
        state.editor.selectedBlockId = state.editor.selectedBlockIds.length > 0 ? state.editor.selectedBlockIds[0] : null;
      }
    })),

  clearSelection: () =>
    set(produce<ResumeStore>((state) => {
      state.editor.selectedBlockId = null;
      state.editor.selectedBlockIds = [];
      state.editor.selectedGroupId = null;
    })),

  // ========== 分组操作 ==========
  createGroup: (name) => {
    const groupId = uuid();
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const group: BlockGroup = {
        id: groupId,
        name,
        blockIds: [],
        rotation: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.resume.groups.push(group);
      state.resume.updatedAt = Date.now();
    }));
    return groupId;
  },

  addBlocksToGroup: (groupId, blockIds) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (group) {
        for (const id of blockIds) {
          if (!group.blockIds.includes(id)) {
            group.blockIds.push(id);
          }
          const block = state.resume.blocks.find((b) => b.id === id);
          if (block) {
            block.groupId = groupId;
          }
        }
        group.updatedAt = Date.now();
        state.resume.updatedAt = Date.now();
      }
    })),

  removeGroup: (groupId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (group) {
        // 清除块上的groupId
        for (const blockId of group.blockIds) {
          const block = state.resume.blocks.find((b) => b.id === blockId);
          if (block) {
            block.groupId = undefined;
          }
        }
      }
      state.resume.groups = state.resume.groups.filter((g) => g.id !== groupId);
      state.resume.updatedAt = Date.now();
    })),

  renameGroup: (groupId, name) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (group) {
        group.name = name;
        group.updatedAt = Date.now();
        state.resume.updatedAt = Date.now();
      }
    })),

  updateGroupRotation: (groupId, rotation) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (group) {
        group.rotation = rotation;
        group.updatedAt = Date.now();
        state.resume.updatedAt = Date.now();
      }
    })),

  updateGroupPosition: (groupId, dx, dy) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (group) {
        for (const blockId of group.blockIds) {
          const block = state.resume.blocks.find((b) => b.id === blockId);
          if (block) {
            block.x += dx;
            block.y += dy;
          }
        }
        state.resume.updatedAt = Date.now();
      }
    })),

  selectGroup: (groupId) =>
    set(produce<ResumeStore>((state) => {
      state.editor.selectedGroupId = groupId;
      if (groupId) {
        // 选中分组时，同时选中分组内的所有块
        const group = state.resume?.groups.find((g) => g.id === groupId);
        if (group) {
          state.editor.selectedBlockIds = [...group.blockIds];
          state.editor.selectedBlockId = group.blockIds.length > 0 ? group.blockIds[0] : null;
        }
      }
    })),

  groupSelectedBlocks: () => {
    const state = get();
    if (!state.resume || state.editor.selectedBlockIds.length < 2) return null;
    const groupId = state.createGroup(`分组 ${state.resume.groups.length + 1}`);
    state.addBlocksToGroup(groupId, state.editor.selectedBlockIds);
    set(produce<ResumeStore>((s) => {
      s.editor.selectedGroupId = groupId;
    }));
    return groupId;
  },

  // ========== 自定义元素模板操作 ==========
  saveAsCustomTemplate: (name, blockIds) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const blocks = state.resume.blocks.filter((b) => blockIds.includes(b.id));
      if (blocks.length === 0) return;

      // 找到块的边界框左上角作为参考点
      const minX = Math.min(...blocks.map((b) => b.x));
      const minY = Math.min(...blocks.map((b) => b.y));

      const template: CustomElementTemplate = {
        id: `cet-${uuid().slice(0, 8)}`,
        name,
        category: '自定义元素',
        isPreset: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        blocks: blocks.map((b) => ({
          templateId: b.templateId,
          templateName: b.templateName,
          name: b.name,
          fields: { ...b.fields },
          fieldNamesMap: b.fieldNamesMap ? { ...b.fieldNamesMap } : undefined,
          decorations: b.decorations ? JSON.parse(JSON.stringify(b.decorations)) : [],
          relativeX: b.x - minX,
          relativeY: b.y - minY,
          width: b.width,
          height: b.height,
          zIndex: b.zIndex,
        })),
      };

      state.customElementTemplates.push(template);
    })),

  removeCustomTemplate: (templateId) =>
    set(produce<ResumeStore>((state) => {
      state.customElementTemplates = state.customElementTemplates.filter((t) => t.id !== templateId);
    })),

  // ========== 块模板操作 ==========
  updateBlockTemplate: (templateId, updates) =>
    set(produce<ResumeStore>((state) => {
      const idx = state.blockTemplates.findIndex((t) => t.id === templateId);
      if (idx !== -1) {
        state.blockTemplates[idx] = { ...state.blockTemplates[idx], ...updates, updatedAt: Date.now() };
      }
    })),

  removeBlockTemplate: (templateId) =>
    set(produce<ResumeStore>((state) => {
      state.blockTemplates = state.blockTemplates.filter((t) => t.id !== templateId);
    })),

  // ========== 配色方案操作 ==========
  addCustomColorScheme: (scheme) =>
    set(produce<ResumeStore>((state) => {
      state.customColorSchemes.push(scheme);
    })),

  removeCustomColorScheme: (schemeId) =>
    set(produce<ResumeStore>((state) => {
      state.customColorSchemes = state.customColorSchemes.filter((s) => s.id !== schemeId);
    })),

  // ========== 块旋转操作 ==========
  updateBlockRotation: (blockId, rotation) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.rotation = rotation;
        state.resume.updatedAt = Date.now();
      }
    })),

  // ========== 层级调整操作 ==========
  moveBlockZIndex: (blockId, direction) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (!block) return;

      // 获取同层级的块（同一分组内的块，或舞台上的无分组块）
      const siblings = block.groupId
        ? state.resume.blocks.filter((b) => b.groupId === block.groupId && b.visible)
        : state.resume.blocks.filter((b) => !b.groupId && b.visible);

      if (siblings.length <= 1) return;

      const sortedSiblings = [...siblings].sort((a, b) => a.zIndex - b.zIndex);
      const currentIdx = sortedSiblings.findIndex((b) => b.id === blockId);

      if (currentIdx === -1) return;

      switch (direction) {
        case 'up': {
          // 上移一层：与下一个更高层级的块交换
          if (currentIdx < sortedSiblings.length - 1) {
            const above = sortedSiblings[currentIdx + 1];
            const tempZ = block.zIndex;
            const aboveBlock = state.resume.blocks.find((b) => b.id === above.id);
            if (aboveBlock) {
              block.zIndex = aboveBlock.zIndex;
              aboveBlock.zIndex = tempZ;
            }
          }
          break;
        }
        case 'down': {
          // 下移一层：与下一个更低层级的块交换
          if (currentIdx > 0) {
            const below = sortedSiblings[currentIdx - 1];
            const tempZ = block.zIndex;
            const belowBlock = state.resume.blocks.find((b) => b.id === below.id);
            if (belowBlock) {
              block.zIndex = belowBlock.zIndex;
              belowBlock.zIndex = tempZ;
            }
          }
          break;
        }
        case 'top': {
          // 置顶
          const maxZ = Math.max(...sortedSiblings.map((b) => b.zIndex));
          block.zIndex = maxZ + 1;
          break;
        }
        case 'bottom': {
          // 置底
          const minZ = Math.min(...sortedSiblings.map((b) => b.zIndex));
          block.zIndex = minZ - 1;
          break;
        }
      }
      state.resume.updatedAt = Date.now();
    })),

  // ========== 编辑器操作 ==========
  selectBlock: (blockId) =>
    set(produce<ResumeStore>((state) => {
      state.editor.selectedBlockId = blockId;
      state.editor.selectedBlockIds = blockId ? [blockId] : [];
      state.editor.selectedGroupId = null;
    })),

  toggleFullscreen: () =>
    set(produce<ResumeStore>((state) => {
      state.editor.isFullscreen = !state.editor.isFullscreen;
    })),

  setLeftPanelWidth: (width) =>
    set(produce<ResumeStore>((state) => {
      state.editor.leftPanelWidth = width;
    })),

  setRightPanelWidth: (width) =>
    set(produce<ResumeStore>((state) => {
      state.editor.rightPanelWidth = width;
    })),

  setEditorTheme: (theme) =>
    set(produce<ResumeStore>((state) => {
      state.editor.theme = theme;
    })),

  setPreviewOpen: (open) =>
    set(produce<ResumeStore>((state) => {
      state.editor.previewOpen = open;
    })),

  setShowAlignGuides: (show) =>
    set(produce<ResumeStore>((state) => {
      state.editor.showAlignGuides = show;
    })),

  setSnapToGrid: (snap) =>
    set(produce<ResumeStore>((state) => {
      state.editor.snapToGrid = snap;
    })),

  // ========== 装饰元素操作 ==========
  addDecoration: (blockId, decoration) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.decorations.push({ ...decoration, id: uuid() });
        state.resume.updatedAt = Date.now();
      }
    })),

  removeDecoration: (blockId, decorationId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.decorations = block.decorations.filter((d) => d.id !== decorationId);
        state.resume.updatedAt = Date.now();
      }
    })),

  updateDecoration: (blockId, decorationId, updates) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        const deco = block.decorations.find((d) => d.id === decorationId);
        if (deco) {
          Object.assign(deco, updates);
          state.resume.updatedAt = Date.now();
        }
      }
    })),

  // ========== 选择器 ==========
  getSelectedBlock: () => {
    const state = get();
    if (!state.resume) return undefined;
    return state.resume.blocks.find((b) => b.id === state.editor.selectedBlockId);
  },

  getBlockTemplate: (templateId) => {
    return get().blockTemplates.find((t) => t.id === templateId);
  },

  getGroupBlocks: (groupId) => {
    const state = get();
    if (!state.resume) return [];
    const group = state.resume.groups.find((g) => g.id === groupId);
    if (!group) return [];
    return state.resume.blocks.filter((b) => group.blockIds.includes(b.id));
  },
}));

// getDefaultBlockWidth / getDefaultBlockHeight 已移至 utils/constants.ts

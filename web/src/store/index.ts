import { create } from 'zustand';
import { produce } from 'immer';
import { v4 as uuid } from 'uuid';
import type {
  Resume,
  BlockInstance,
  BlockTemplate,
  ColorScheme,
  LayoutConfig,
  EditorState,
  DecorationElement,
} from '../types';
import { presetBlockTemplates, presetColorSchemes } from '../utils/presets';

// ========== 辅助函数 ==========

/** 获取同一栏位内下一个可用的 order 值 */
function getNextOrder(blocks: BlockInstance[], column: 'header' | 'left' | 'right'): number {
  const columnBlocks = blocks.filter((b) => b.column === column);
  if (columnBlocks.length === 0) return 0;
  return Math.max(...columnBlocks.map((b) => b.order)) + 1;
}

/** 按 column + order 对 blocks 排序 */
function sortBlocks(blocks: BlockInstance[]): BlockInstance[] {
  return [...blocks].sort((a, b) => {
    if (a.column === 'header' && b.column !== 'header') return -1;
    if (a.column !== 'header' && b.column === 'header') return 1;
    if (a.column !== b.column) return a.column.localeCompare(b.column);
    return a.order - b.order;
  });
}

/** 重新计算同一栏位内所有块的 order（使其连续递增） */
function recalculateOrders(blocks: BlockInstance[]): void {
  const columns: ('header' | 'left' | 'right')[] = ['header', 'left', 'right'];
  for (const col of columns) {
    const colBlocks = blocks
      .filter((b) => b.column === col)
      .sort((a, b) => a.order - b.order);
    colBlocks.forEach((b, i) => {
      b.order = i;
    });
  }
}

// ========== 版本迁移 ==========

const CURRENT_VERSION = 3;

/** 将旧版本 Resume 数据迁移到当前版本 */
function migrateResume(data: Record<string, unknown>): Resume {
  let version = (data.version as number) || 1;

  // v1 → v2: 增加 order、templateName，column 从可选变为必填
  if (version < 2) {
    const blocks = (data.blocks as BlockInstance[]) || [];
    const columns: ('header' | 'left' | 'right')[] = ['header', 'left', 'right'];
    for (const col of columns) {
      const colBlocks = blocks
        .filter((b) => (b.column || 'right') === col)
        .sort((a, b) => {
          // v1 没有order字段，按数组原顺序
          return blocks.indexOf(a) - blocks.indexOf(b);
        });
      colBlocks.forEach((b, i) => {
        b.column = b.column || 'right';
        b.order = i;
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

  // 未来版本迁移写在这里：
  // if (version < 4) { ... }

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
      // 模板 ID 存在，但字段 ID 可能已变（v1 的随机 ID → v2 的固定 ID）
      // 利用 fieldNamesMap 按名称映射
      block.fields = remapFields(block.fields, matched, block.fieldNamesMap);
    }
  }

  // 确保排序
  migrated.blocks = sortBlocks(migrated.blocks);
  recalculateOrders(migrated.blocks);

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

// ========== Store 类型 ==========
interface ResumeStore {
  // 数据
  resume: Resume | null;
  blockTemplates: BlockTemplate[];
  customColorSchemes: ColorScheme[];

  // 编辑器状态
  editor: EditorState;

  // 简历初始化
  initResume: (title: string, layout: LayoutConfig, colorScheme: ColorScheme, layoutId?: string) => void;
  clearResume: () => void;

  // 简历操作
  setResumeTitle: (title: string) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setLayout: (layout: LayoutConfig) => void;
  markSaved: () => void;

  // JSON 导入
  importFromJSON: (json: Record<string, unknown>) => void;

  // 块实例操作
  addBlock: (templateId: string, column?: 'left' | 'right') => void;
  addBlockToSlot: (templateId: string, column: 'header' | 'left' | 'right', index?: number) => void;
  removeBlock: (blockId: string) => void;
  cloneBlock: (blockId: string) => void;
  updateBlockField: (blockId: string, fieldId: string, value: string) => void;
  reorderBlocks: (activeId: string, overId: string) => void;
  toggleBlockVisibility: (blockId: string) => void;
  toggleBlockLock: (blockId: string) => void;
  setBlockColorTag: (blockId: string, color: string | undefined) => void;
  setBlockColumn: (blockId: string, column: 'header' | 'left' | 'right') => void;
  renameBlock: (blockId: string, name: string) => void;

  // 块模板操作
  addBlockTemplate: (template: Omit<BlockTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBlockTemplate: (templateId: string, updates: Partial<BlockTemplate>) => void;
  removeBlockTemplate: (templateId: string) => void;

  // 配色方案操作
  addCustomColorScheme: (scheme: ColorScheme) => void;
  removeCustomColorScheme: (schemeId: string) => void;

  // 编辑器操作
  selectBlock: (blockId: string | null) => void;
  toggleFullscreen: () => void;
  setZoom: (zoom: number) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setEditorTheme: (theme: 'light' | 'dark' | 'system') => void;
  setPreviewOpen: (open: boolean) => void;

  // 装饰元素操作
  addDecoration: (blockId: string, decoration: Omit<DecorationElement, 'id'>) => void;
  removeDecoration: (blockId: string, decorationId: string) => void;
  updateDecoration: (blockId: string, decorationId: string, updates: Partial<DecorationElement>) => void;

  // 选择器
  getSelectedBlock: () => BlockInstance | undefined;
  getBlockTemplate: (templateId: string) => BlockTemplate | undefined;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  // ========== 初始状态 ==========
  resume: null,
  blockTemplates: [...presetBlockTemplates],
  customColorSchemes: [],

  editor: {
    selectedBlockId: null,
    isFullscreen: false,
    zoom: 100,
    theme: 'light',
    leftPanelWidth: 280,
    rightPanelWidth: 320,
    autoSave: true,
    autoSaveInterval: 30,
    previewOpen: false,
  },

  // ========== 简历初始化 ==========
  initResume: (title, layout, colorScheme, layoutId = 'custom') =>
    set(produce<ResumeStore>((state) => {
      const resumeId = uuid();
      state.resume = {
        id: resumeId,
        name: title,
        title,
        layoutId,
        blocks: [],
        colorScheme,
        layout,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSavedAt: null,
        version: CURRENT_VERSION,
      };
      state.editor.selectedBlockId = null;
    })),

  clearResume: () =>
    set(produce<ResumeStore>((state) => {
      state.resume = null;
      state.editor.selectedBlockId = null;
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

  setLayout: (layout) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      state.resume.layout = layout;
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
      } catch (e) {
        console.error('导入 JSON 失败:', e);
      }
    })),

  // ========== 块实例操作 ==========
  addBlock: (templateId, column) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const template = state.blockTemplates.find((t) => t.id === templateId);
      if (!template) return;

      const resolvedColumn = column || (template.category === '基础' || template.category === '其他' ? 'left' : 'right');
      const fields: Record<string, string> = {};
      template.fields.forEach((f) => {
        fields[f.id] = f.defaultValue || '';
      });

      // 构建字段名称映射表，导出JSON时用于字段ID变更后的名称恢复
      const fieldNamesMap: Record<string, string> = {};
      template.fields.forEach((f) => {
        fieldNamesMap[f.id] = f.name;
      });

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
        order: getNextOrder(state.resume.blocks, resolvedColumn),
        column: resolvedColumn,
      };

      state.resume.blocks.push(block);
      // 按 column + order 排序确保数组顺序正确
      state.resume.blocks = sortBlocks(state.resume.blocks);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = block.id;
    })),

  addBlockToSlot: (templateId, column, index) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const template = state.blockTemplates.find((t) => t.id === templateId);
      if (!template) return;

      const fields: Record<string, string> = {};
      template.fields.forEach((f) => {
        fields[f.id] = f.defaultValue || '';
      });

      // 构建字段名称映射表
      const fieldNamesMap: Record<string, string> = {};
      template.fields.forEach((f) => {
        fieldNamesMap[f.id] = f.name;
      });

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
        order: 0, // 临时值，下面会重新计算
        column,
      };

      // 先插入到 blocks 数组
      if (column === 'header') {
        const firstNonHeaderIdx = state.resume.blocks.findIndex((b) => b.column !== 'header');
        const insertIdx = firstNonHeaderIdx === -1 ? state.resume.blocks.length : firstNonHeaderIdx;

        if (index !== undefined) {
          const headerBlocks = state.resume.blocks.filter((b) => b.column === 'header');
          const insertAt = Math.min(index, headerBlocks.length);
          let count = 0;
          for (let i = 0; i < state.resume.blocks.length; i++) {
            if (state.resume.blocks[i].column === 'header') {
              if (count === insertAt) {
                state.resume.blocks.splice(i, 0, block);
                break;
              }
              count++;
            }
          }
          if (count < insertAt) {
            state.resume.blocks.splice(insertIdx, 0, block);
          }
        } else {
          state.resume.blocks.splice(insertIdx, 0, block);
        }
      } else {
        const columnBlocks = state.resume.blocks.filter((b) => b.column === column);
        const insertAt = index !== undefined ? Math.min(index, columnBlocks.length) : columnBlocks.length;

        let actualIndex = 0;
        let count = 0;
        for (let i = 0; i < state.resume.blocks.length; i++) {
          if (state.resume.blocks[i].column === column) {
            if (count === insertAt) {
              actualIndex = i;
              break;
            }
            count++;
          }
          actualIndex = i + 1;
        }

        state.resume.blocks.splice(actualIndex, 0, block);
      }

      // 重新计算同栏位 order
      recalculateOrders(state.resume.blocks);
      state.resume.blocks = sortBlocks(state.resume.blocks);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = block.id;
    })),

  removeBlock: (blockId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      state.resume.blocks = state.resume.blocks.filter((b) => b.id !== blockId);
      if (block) {
        recalculateOrders(state.resume.blocks);
      }
      state.resume.updatedAt = Date.now();
      if (state.editor.selectedBlockId === blockId) {
        state.editor.selectedBlockId = null;
      }
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
        order: getNextOrder(state.resume.blocks, source.column),
      };

      state.resume.blocks.push(cloned);
      state.resume.blocks = sortBlocks(state.resume.blocks);
      recalculateOrders(state.resume.blocks);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = cloned.id;
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

  reorderBlocks: (activeId, overId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const blocks = state.resume.blocks;
      const activeIdx = blocks.findIndex((b) => b.id === activeId);
      const overIdx = blocks.findIndex((b) => b.id === overId);
      if (activeIdx === -1 || overIdx === -1) return;

      const activeBlock = blocks[activeIdx];
      const overBlock = blocks[overIdx];

      // 只允许同栏位内排序
      if (activeBlock.column !== overBlock.column) return;

      // 交换 order 值
      const tempOrder = activeBlock.order;
      activeBlock.order = overBlock.order;
      overBlock.order = tempOrder;

      // 重新排序数组
      state.resume.blocks = sortBlocks(blocks);
      recalculateOrders(state.resume.blocks);
      state.resume.updatedAt = Date.now();
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

  setBlockColumn: (blockId, column) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      if (block) {
        block.column = column;
        block.order = getNextOrder(state.resume.blocks.filter((b) => b.id !== blockId), column);
        state.resume.blocks = sortBlocks(state.resume.blocks);
        recalculateOrders(state.resume.blocks);
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

  // ========== 块模板操作 ==========
  addBlockTemplate: (template) =>
    set(produce<ResumeStore>((state) => {
      state.blockTemplates.push({
        ...template,
        id: uuid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    })),

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

  // ========== 编辑器操作 ==========
  selectBlock: (blockId) =>
    set(produce<ResumeStore>((state) => {
      state.editor.selectedBlockId = blockId;
    })),

  toggleFullscreen: () =>
    set(produce<ResumeStore>((state) => {
      state.editor.isFullscreen = !state.editor.isFullscreen;
    })),

  setZoom: (zoom) =>
    set(produce<ResumeStore>((state) => {
      state.editor.zoom = zoom;
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
}));

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
} from '../types';
import { presetBlockTemplates, presetColorSchemes } from '../utils/presets';

// ========== Store 类型 ==========
interface ResumeStore {
  // 数据
  resume: Resume | null;
  blockTemplates: BlockTemplate[];
  customColorSchemes: ColorScheme[];

  // 编辑器状态
  editor: EditorState;

  // 简历初始化
  initResume: (title: string, layout: LayoutConfig, colorScheme: ColorScheme) => void;
  clearResume: () => void;

  // 简历操作
  setResumeTitle: (title: string) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setLayout: (layout: LayoutConfig) => void;
  markSaved: () => void;

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
  initResume: (title, layout, colorScheme) =>
    set(produce<ResumeStore>((state) => {
      state.resume = {
        id: uuid(),
        title,
        templateId: uuid(),
        blocks: [],
        colorScheme,
        layout,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSavedAt: null,
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

  // ========== 块实例操作 ==========
  addBlock: (templateId, column) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const template = state.blockTemplates.find((t) => t.id === templateId);
      if (!template) return;

      const fields: Record<string, string> = {};
      template.fields.forEach((f) => {
        fields[f.id] = f.defaultValue || '';
      });

      const block: BlockInstance = {
        id: uuid(),
        templateId,
        name: template.name,
        fields,
        visible: true,
        locked: false,
        column: column || (template.category === '基础' || template.category === '其他' ? 'left' : 'right'),
      };

      state.resume.blocks.push(block);
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

      const block: BlockInstance = {
        id: uuid(),
        templateId,
        name: template.name,
        fields,
        visible: true,
        locked: false,
        column,
      };

      // header 块始终插入到 blocks 数组最前面
      if (column === 'header') {
        // 找到第一个非 header 块的位置
        const firstNonHeaderIdx = state.resume.blocks.findIndex((b) => b.column !== 'header');
        const insertIdx = firstNonHeaderIdx === -1 ? state.resume.blocks.length : firstNonHeaderIdx;

        if (index !== undefined) {
          // 在 header 块中指定位置插入
          const headerBlocks = state.resume.blocks.filter((b) => b.column === 'header');
          const insertAt = Math.min(index, headerBlocks.length);
          let count = 0;
          for (let i = 0; i < state.resume.blocks.length; i++) {
            if (state.resume.blocks[i].column === 'header') {
              if (count === insertAt) {
                state.resume.blocks.splice(i, 0, block);
                state.resume.updatedAt = Date.now();
                state.editor.selectedBlockId = block.id;
                return;
              }
              count++;
            }
          }
          state.resume.blocks.splice(insertIdx, 0, block);
        } else {
          state.resume.blocks.splice(insertIdx, 0, block);
        }
      } else {
        // 按栏位过滤现有块，找到插入位置
        const columnBlocks = state.resume.blocks.filter((b) => b.column === column);
        const insertAt = index !== undefined ? Math.min(index, columnBlocks.length) : columnBlocks.length;

        // 计算在总 blocks 数组中的实际位置
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

      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = block.id;
    })),

  removeBlock: (blockId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      state.resume.blocks = state.resume.blocks.filter((b) => b.id !== blockId);
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
        id: uuid(),
        name: `${source.name} (副本)`,
      };

      const idx = state.resume.blocks.findIndex((b) => b.id === blockId);
      state.resume.blocks.splice(idx + 1, 0, cloned);
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

      const [moved] = blocks.splice(activeIdx, 1);
      blocks.splice(overIdx, 0, moved);
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

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
  CustomDecorationDefinition,
} from '../types';
import { presetBlockTemplates, presetColorSchemes } from '../utils/presets';
import {
  CANVAS_DEFAULT_WIDTH,
  CANVAS_DEFAULT_HEIGHT,
  CANVAS_DEFAULT_PADDING,
  CANVAS_DEFAULT_BACKGROUND,
  CURRENT_DATA_VERSION,
  getDefaultBlockWidth,
  getDefaultBlockHeight,
} from '../utils/constants';
import { getNextZIndex, calculateAlignGuides, calculateDistances } from '../utils/block';
import { restoreFromJSON } from '../utils/migration';

// ========== 默认画布配置 ==========
const DEFAULT_CANVAS: CanvasConfig = {
  width: CANVAS_DEFAULT_WIDTH,
  height: CANVAS_DEFAULT_HEIGHT,
  padding: CANVAS_DEFAULT_PADDING,
  background: CANVAS_DEFAULT_BACKGROUND,
};
// ========== 对齐与距离计算已抽取到 utils/block.ts ==========
export { calculateAlignGuides, calculateDistances } from '../utils/block';

// ========== Store 类型 ==========
interface ResumeStore {
  // 数据
  resume: Resume | null;
  blockTemplates: BlockTemplate[];
  customElementTemplates: CustomElementTemplate[];
  customColorSchemes: ColorScheme[];
  customDecorations: CustomDecorationDefinition[];

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

  // 自定义装饰元素操作
  saveCustomDecoration: (decoration: CustomDecorationDefinition) => void;
  removeCustomDecoration: (decorationId: string) => void;
  addBlockFromCustomDecoration: (decorationId: string, x: number, y: number) => void;

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
  customDecorations: [],

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
        version: CURRENT_DATA_VERSION,
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

      // 自动创建分组，使自定义元素作为一个整体
      const groupId = uuid();
      const group: BlockGroup = {
        id: groupId,
        name: template.name,
        blockIds: [],
        rotation: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.resume.groups.push(group);

      for (const blockDef of template.blocks) {
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries(blockDef.fields)) {
          fields[k] = v;
        }

        const blockId = `${state.resume.id}-custom-${uuid().slice(0, 8)}`;
        const block: BlockInstance = {
          id: blockId,
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
          groupId,
        };

        state.resume.blocks.push(block);
        group.blockIds.push(blockId);
      }

      // 选中新创建的分组
      state.editor.selectedGroupId = groupId;
      state.editor.selectedBlockIds = [...group.blockIds];
      state.editor.selectedBlockId = group.blockIds.length > 0 ? group.blockIds[0] : null;

      state.resume.updatedAt = Date.now();
    })),

  removeBlock: (blockId) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b) => b.id === blockId);
      state.resume.blocks = state.resume.blocks.filter((b) => b.id !== blockId);
      state.resume.updatedAt = Date.now();
      if (state.editor.selectedBlockId === blockId) {
        state.editor.selectedBlockId = null;
      }
      state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter((id) => id !== blockId);

      // 清理空分组（当分组内块被删除后可能变空）
      if (block?.groupId) {
        const group = state.resume.groups.find((g) => g.id === block.groupId);
        if (group) {
          group.blockIds = group.blockIds.filter((id) => id !== blockId);
          // 如果分组为空，则自动删除该分组
          if (group.blockIds.length === 0) {
            state.resume.groups = state.resume.groups.filter((g) => g.id !== block.groupId);
            if (state.editor.selectedGroupId === block.groupId) {
              state.editor.selectedGroupId = null;
            }
          }
        }
      }
    })),

  removeBlocks: (blockIds) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const blockIdSet = new Set(blockIds);

      // 先找出被删除块的分组信息
      const affectedGroupIds = new Set<string>();
      for (const bId of blockIds) {
        const b = state.resume.blocks.find((bl) => bl.id === bId);
        if (b?.groupId) {
          affectedGroupIds.add(b.groupId);
        }
      }

      state.resume.blocks = state.resume.blocks.filter((b) => !blockIdSet.has(b.id));
      state.resume.updatedAt = Date.now();
      if (blockIdSet.has(state.editor.selectedBlockId || '')) {
        state.editor.selectedBlockId = null;
      }
      state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter((id) => !blockIdSet.has(id));

      // 清理受影响分组中的被删除块ID，删除空分组
      for (const gId of affectedGroupIds) {
        const group = state.resume.groups.find((g) => g.id === gId);
        if (group) {
          group.blockIds = group.blockIds.filter((id) => !blockIdSet.has(id));
          if (group.blockIds.length === 0) {
            state.resume.groups = state.resume.groups.filter((g) => g.id !== gId);
            if (state.editor.selectedGroupId === gId) {
              state.editor.selectedGroupId = null;
            }
          }
        }
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

  // ========== 自定义装饰元素操作 ==========
  saveCustomDecoration: (decoration) =>
    set(produce<ResumeStore>((state) => {
      const idx = state.customDecorations.findIndex((d) => d.id === decoration.id);
      if (idx !== -1) {
        state.customDecorations[idx] = { ...decoration, updatedAt: Date.now() };
      } else {
        state.customDecorations.push({ ...decoration, createdAt: Date.now(), updatedAt: Date.now() });
      }
    })),

  removeCustomDecoration: (decorationId) =>
    set(produce<ResumeStore>((state) => {
      state.customDecorations = state.customDecorations.filter((d) => d.id !== decorationId);
    })),

  addBlockFromCustomDecoration: (decorationId, x, y) =>
    set(produce<ResumeStore>((state) => {
      if (!state.resume) return;
      const decoration = state.customDecorations.find((d) => d.id === decorationId);
      if (!decoration) return;

      // 计算所有路径的边界框来确定默认尺寸
      const allAnchors = decoration.paths.flatMap((p) => p.anchors);
      const minX = allAnchors.length > 0 ? Math.min(...allAnchors.map((a) => a.x)) : 0;
      const minY = allAnchors.length > 0 ? Math.min(...allAnchors.map((a) => a.y)) : 0;
      const maxX = allAnchors.length > 0 ? Math.max(...allAnchors.map((a) => a.x)) : 100;
      const maxY = allAnchors.length > 0 ? Math.max(...allAnchors.map((a) => a.y)) : 100;

      // 锚点坐标是百分比(0-100)，计算装饰的实际显示尺寸
      // 确保宽高比与内容一致，避免 preserveAspectRatio 留白
      const rangeX = maxX - minX;
      const rangeY = maxY - minY;
      const aspectRatio = rangeX > 0 && rangeY > 0 ? rangeX / rangeY : 1;
      const baseSize = Math.max(60, Math.round(Math.max(rangeX, rangeY) * 2));
      const defaultWidth = Math.round(aspectRatio >= 1 ? baseSize : baseSize * aspectRatio);
      const defaultHeight = Math.round(aspectRatio >= 1 ? baseSize / aspectRatio : baseSize);

      // 为每条路径生成 SVG path data
      // strokeWidth 已在装饰编辑器保存时转为 viewBox 0-100 空间的比例值，无需再次转换
      const svgPaths = decoration.paths.map((p) => ({
        pathD: p.anchors.map((a, i) => `${i === 0 ? 'M' : 'L'} ${a.x} ${a.y}`).join(' ') + (p.isClosed ? ' Z' : ''),
        fillColor: p.fillColor,
        strokeColor: p.strokeColor,
        strokeWidth: Math.max(0.5, p.strokeWidth),
        isClosed: p.isClosed,
      }));

      const blockId = `${state.resume.id}-cdeco-${uuid().slice(0, 8)}`;
      const block: BlockInstance = {
        id: blockId,
        templateId: `custom-decoration`,
        templateName: '自定义装饰',
        name: decoration.name,
        fields: {},
        decorations: [{
          id: uuid(),
          decorationId: decorationId,
          x: 0,
          y: 0,
          width: defaultWidth,
          height: defaultHeight,
          rotation: 0,
          color: decoration.paths[0]?.fillColor || '#1a56db',
          strokeColor: decoration.paths[0]?.strokeColor || '#1a56db',
          strokeWidth: decoration.paths[0]?.strokeWidth ?? 2,
          opacity: 1,
          zIndex: 1,
          // 自定义装饰特有字段：存储多路径 SVG 数据
          customSvgPaths: svgPaths,
        } as any],
        visible: true,
        locked: false,
        x,
        y,
        width: defaultWidth,
        height: defaultHeight,
        zIndex: getNextZIndex(state.resume.blocks),
        style: {
          backgroundColor: 'transparent',
          borderRadius: 0,
          borderWidth: 0,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      };

      state.resume.blocks.push(block);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = block.id;
      state.editor.selectedBlockIds = [block.id];
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

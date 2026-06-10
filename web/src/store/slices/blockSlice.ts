/**
 * 块实例操作 Slice
 * 管理块的增删改查、位置、尺寸、层级、旋转、样式、装饰元素
 */
import { produce } from 'immer';
import { v4 as uuid } from 'uuid';
import type {
  BlockInstance,
  BlockTemplate,
  BlockStyle,
  DecorationElement,
  CustomElementTemplate,
  CustomDecorationDefinition,
} from '../../types';
import { getNextZIndex } from '../../utils/block';
import { getDefaultBlockWidth, getDefaultBlockHeight } from '../../utils/constants';
import { buildDecoPathD, getDecoPathBounds } from '../../utils/geometry';
import { presetBlockTemplates } from '../../utils/presets';

// ========== Slice 类型 ==========
export interface BlockSlice {
  // 数据
  blockTemplates: BlockTemplate[];
  customElementTemplates: CustomElementTemplate[];

  // 块实例操作
  addBlock: (templateId: string, x: number, y: number, width?: number, height?: number) => void;
  addBlockFromCustomTemplate: (templateId: string, x: number, y: number) => void;
  addBlockFromCustomDecoration: (decorationId: string, x: number, y: number) => void;
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
  updateBlockRotation: (blockId: string, rotation: number) => void;
  moveBlockZIndex: (blockId: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;

  // 装饰元素操作
  addDecoration: (blockId: string, decoration: Omit<DecorationElement, 'id'>) => void;
  removeDecoration: (blockId: string, decorationId: string) => void;
  updateDecoration: (blockId: string, decorationId: string, updates: Partial<DecorationElement>) => void;

  // 自定义元素模板操作
  saveAsCustomTemplate: (name: string, blockIds: string[]) => void;
  removeCustomTemplate: (templateId: string) => void;

  // 块模板操作
  updateBlockTemplate: (templateId: string, updates: Partial<BlockTemplate>) => void;
  removeBlockTemplate: (templateId: string) => void;

  // 选择器
  getSelectedBlock: () => BlockInstance | undefined;
  getBlockTemplate: (templateId: string) => BlockTemplate | undefined;
}

// ========== 内部辅助：获取 resume 引用 ==========
// 由于 produce 中 state 跨 slice 共享，直接访问 state.resume
// 需要在 produce 回调中通过完整的 store state 访问

// ========== Slice 实现 ==========
export const createBlockSlice = (set: any, get: any): BlockSlice => ({
  blockTemplates: [...presetBlockTemplates],
  customElementTemplates: [],

  addBlock: (templateId, x, y, width, height) =>
    set(produce<BlockSlice & { resume: any; editor: any }>((state) => {
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
    set(produce<BlockSlice & { resume: any; editor: any }>((state) => {
      if (!state.resume) return;
      const template = state.customElementTemplates.find((t) => t.id === templateId);
      if (!template) return;

      const groupId = uuid();
      const group = {
        id: groupId,
        name: template.name,
        blockIds: [] as string[],
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

      state.editor.selectedGroupId = groupId;
      state.editor.selectedBlockIds = [...group.blockIds];
      state.editor.selectedBlockId = group.blockIds.length > 0 ? group.blockIds[0] : null;
      state.resume.updatedAt = Date.now();
    })),

  addBlockFromCustomDecoration: (decorationId, x, y) =>
    set(produce<BlockSlice & { resume: any; editor: any; customDecorations: CustomDecorationDefinition[] }>((state) => {
      if (!state.resume) return;
      const decoration = state.customDecorations.find((d) => d.id === decorationId);
      if (!decoration) return;

      const allAnchors = decoration.paths.flatMap((p) => p.anchors);
      // 基于贝塞尔曲线实际采样点计算边界框，避免控制柄远离曲线导致大片空白
      const pathBounds = decoration.paths.map((p) => getDecoPathBounds(p.anchors, p.isClosed)).filter(Boolean) as { minX: number; minY: number; maxX: number; maxY: number }[];
      const minX = pathBounds.length > 0 ? Math.min(...pathBounds.map((b) => b.minX)) : 0;
      const minY = pathBounds.length > 0 ? Math.min(...pathBounds.map((b) => b.minY)) : 0;
      const maxX = pathBounds.length > 0 ? Math.max(...pathBounds.map((b) => b.maxX)) : 100;
      const maxY = pathBounds.length > 0 ? Math.max(...pathBounds.map((b) => b.maxY)) : 100;

      const rangeX = maxX - minX;
      const rangeY = maxY - minY;
      const aspectRatio = rangeX > 0 && rangeY > 0 ? rangeX / rangeY : 1;
      const baseSize = Math.max(60, Math.round(Math.max(rangeX, rangeY) * 2));
      const defaultWidth = Math.round(aspectRatio >= 1 ? baseSize : baseSize * aspectRatio);
      const defaultHeight = Math.round(aspectRatio >= 1 ? baseSize / aspectRatio : baseSize);

      const svgPaths = decoration.paths.map((p) => ({
        pathD: buildDecoPathD(p.anchors, p.isClosed),
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

  removeBlock: (blockId) =>
    set(produce<BlockSlice & { resume: any; editor: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      state.resume.blocks = state.resume.blocks.filter((b: BlockInstance) => b.id !== blockId);
      state.resume.updatedAt = Date.now();
      if (state.editor.selectedBlockId === blockId) {
        state.editor.selectedBlockId = null;
      }
      state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter((id: string) => id !== blockId);

      if (block?.groupId) {
        const group = state.resume.groups.find((g: any) => g.id === block.groupId);
        if (group) {
          group.blockIds = group.blockIds.filter((id: string) => id !== blockId);
          if (group.blockIds.length === 0) {
            state.resume.groups = state.resume.groups.filter((g: any) => g.id !== block.groupId);
            if (state.editor.selectedGroupId === block.groupId) {
              state.editor.selectedGroupId = null;
            }
          }
        }
      }
    })),

  removeBlocks: (blockIds) =>
    set(produce<BlockSlice & { resume: any; editor: any }>((state) => {
      if (!state.resume) return;
      const blockIdSet = new Set(blockIds);

      const affectedGroupIds = new Set<string>();
      for (const bId of blockIds) {
        const b = state.resume.blocks.find((bl: BlockInstance) => bl.id === bId);
        if (b?.groupId) {
          affectedGroupIds.add(b.groupId);
        }
      }

      state.resume.blocks = state.resume.blocks.filter((b: BlockInstance) => !blockIdSet.has(b.id));
      state.resume.updatedAt = Date.now();
      if (blockIdSet.has(state.editor.selectedBlockId || '')) {
        state.editor.selectedBlockId = null;
      }
      state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter((id: string) => !blockIdSet.has(id));

      for (const gId of affectedGroupIds) {
        const group = state.resume.groups.find((g: any) => g.id === gId);
        if (group) {
          group.blockIds = group.blockIds.filter((id: string) => !blockIdSet.has(id));
          if (group.blockIds.length === 0) {
            state.resume.groups = state.resume.groups.filter((g: any) => g.id !== gId);
            if (state.editor.selectedGroupId === gId) {
              state.editor.selectedGroupId = null;
            }
          }
        }
      }
    })),

  cloneBlock: (blockId) =>
    set(produce<BlockSlice & { resume: any; editor: any }>((state) => {
      if (!state.resume) return;
      const source = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
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
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.fields[fieldId] = value;
        state.resume.updatedAt = Date.now();
      }
    })),

  updateBlockPosition: (blockId, x, y) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.x = x;
        block.y = y;
        state.resume.updatedAt = Date.now();
      }
    })),

  updateBlockSize: (blockId, width, height) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.width = width;
        block.height = height;
        state.resume.updatedAt = Date.now();
      }
    })),

  updateBlockZIndex: (blockId, zIndex) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.zIndex = zIndex;
        state.resume.updatedAt = Date.now();
      }
    })),

  toggleBlockVisibility: (blockId) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.visible = !block.visible;
        state.resume.updatedAt = Date.now();
      }
    })),

  toggleBlockLock: (blockId) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.locked = !block.locked;
        state.resume.updatedAt = Date.now();
      }
    })),

  setBlockColorTag: (blockId, color) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.colorTag = color;
        state.resume.updatedAt = Date.now();
      }
    })),

  renameBlock: (blockId, name) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.name = name;
        state.resume.updatedAt = Date.now();
      }
    })),

  updateBlockStyle: (blockId, style) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.style = { ...block.style, ...style };
        state.resume.updatedAt = Date.now();
      }
    })),

  updateBlockRotation: (blockId, rotation) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.rotation = rotation;
        state.resume.updatedAt = Date.now();
      }
    })),

  moveBlockZIndex: (blockId, direction) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (!block) return;

      const siblings = block.groupId
        ? state.resume.blocks.filter((b: BlockInstance) => b.groupId === block.groupId && b.visible)
        : state.resume.blocks.filter((b: BlockInstance) => !b.groupId && b.visible);

      if (siblings.length <= 1) return;

      const sortedSiblings = [...siblings].sort((a, b) => a.zIndex - b.zIndex);
      const currentIdx = sortedSiblings.findIndex((b) => b.id === blockId);

      if (currentIdx === -1) return;

      switch (direction) {
        case 'up': {
          if (currentIdx < sortedSiblings.length - 1) {
            const above = sortedSiblings[currentIdx + 1];
            const tempZ = block.zIndex;
            const aboveBlock = state.resume.blocks.find((b: BlockInstance) => b.id === above.id);
            if (aboveBlock) {
              block.zIndex = aboveBlock.zIndex;
              aboveBlock.zIndex = tempZ;
            }
          }
          break;
        }
        case 'down': {
          if (currentIdx > 0) {
            const below = sortedSiblings[currentIdx - 1];
            const tempZ = block.zIndex;
            const belowBlock = state.resume.blocks.find((b: BlockInstance) => b.id === below.id);
            if (belowBlock) {
              block.zIndex = belowBlock.zIndex;
              belowBlock.zIndex = tempZ;
            }
          }
          break;
        }
        case 'top': {
          const maxZ = Math.max(...sortedSiblings.map((b) => b.zIndex));
          block.zIndex = maxZ + 1;
          break;
        }
        case 'bottom': {
          const minZ = Math.min(...sortedSiblings.map((b) => b.zIndex));
          block.zIndex = minZ - 1;
          break;
        }
      }
      state.resume.updatedAt = Date.now();
    })),

  addDecoration: (blockId, decoration) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.decorations.push({ ...decoration, id: uuid() });
        state.resume.updatedAt = Date.now();
      }
    })),

  removeDecoration: (blockId, decorationId) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        block.decorations = block.decorations.filter((d: DecorationElement) => d.id !== decorationId);
        state.resume.updatedAt = Date.now();
      }
    })),

  updateDecoration: (blockId, decorationId, updates) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const block = state.resume.blocks.find((b: BlockInstance) => b.id === blockId);
      if (block) {
        const deco = block.decorations.find((d: DecorationElement) => d.id === decorationId);
        if (deco) {
          Object.assign(deco, updates);
          state.resume.updatedAt = Date.now();
        }
      }
    })),

  saveAsCustomTemplate: (name, blockIds) =>
    set(produce<BlockSlice & { resume: any }>((state) => {
      if (!state.resume) return;
      const blocks: BlockInstance[] = state.resume.blocks.filter((b: BlockInstance) => blockIds.includes(b.id));
      if (blocks.length === 0) return;

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
    set(produce<BlockSlice>((state) => {
      state.customElementTemplates = state.customElementTemplates.filter((t) => t.id !== templateId);
    })),

  updateBlockTemplate: (templateId, updates) =>
    set(produce<BlockSlice>((state) => {
      const idx = state.blockTemplates.findIndex((t) => t.id === templateId);
      if (idx !== -1) {
        state.blockTemplates[idx] = { ...state.blockTemplates[idx], ...updates, updatedAt: Date.now() };
      }
    })),

  removeBlockTemplate: (templateId) =>
    set(produce<BlockSlice>((state) => {
      state.blockTemplates = state.blockTemplates.filter((t) => t.id !== templateId);
    })),

  getSelectedBlock: () => {
    const state = get();
    if (!state.resume) return undefined;
    return state.resume.blocks.find((b: BlockInstance) => b.id === state.editor.selectedBlockId);
  },

  getBlockTemplate: (templateId) => {
    return get().blockTemplates.find((t: BlockTemplate) => t.id === templateId);
  },
});

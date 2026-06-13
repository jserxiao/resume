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
import { getNextZIndex, getUniqueName } from '../../utils/block';
import { getDefaultBlockWidth, getDefaultBlockHeight, DEFAULT_PRIMARY_COLOR } from '../../utils/constants';
import { buildDecoPathD } from '../../utils/geometry';
import { presetBlockTemplates, presetLayoutTemplates } from '../../utils/presets';
import type { StoreSet, StoreGet, ResumeStoreInternal } from '../types';

// ========== Slice 类型 ==========
export interface BlockSlice {
  // 数据
  blockTemplates: BlockTemplate[];
  customElementTemplates: CustomElementTemplate[];
  groupTemplates: CustomElementTemplate[];

  // 块实例操作
  addBlock: (templateId: string, x: number, y: number, width?: number, height?: number) => void;
  addBlockFromCustomTemplate: (templateId: string, x: number, y: number) => void;
  addBlockFromGroupTemplate: (templateId: string, x: number, y: number) => void;
  addBlockFromCustomDecoration: (decorationId: string, x: number, y: number) => void;
  addBlockFromIcon: (iconName: string, x: number, y: number) => void;
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

  // 分组模板操作
  saveAsGroupTemplate: (groupId: string, name?: string) => void;
  removeGroupTemplate: (templateId: string) => void;

  // 弹性盒子操作
  addBlockToFlexbox: (blockId: string, flexboxId: string, insertIndex?: number) => boolean;
  removeBlockFromFlexbox: (blockId: string, flexboxId: string) => void;
  reorderFlexboxChildren: (flexboxId: string, childIds: string[]) => void;

  // 选择器
  getSelectedBlock: () => BlockInstance | undefined;
  getBlockTemplate: (templateId: string) => BlockTemplate | undefined;
}

// ========== 辅助函数 ==========

/** 在 produce 回调中查找块 */
function findBlock(state: ResumeStoreInternal, blockId: string): BlockInstance | undefined {
  return state.resume?.blocks.find((b) => b.id === blockId);
}

/** 块更新模板 - 通用逻辑：查找块、执行更新、标记时间戳 */
function withBlockUpdate(
  state: ResumeStoreInternal,
  blockId: string,
  updater: (block: BlockInstance) => void,
): boolean {
  if (!state.resume) return false;
  const block = findBlock(state, blockId);
  if (!block) return false;
  updater(block);
  state.resume.updatedAt = Date.now();
  return true;
}

/**
 * 确保块名称唯一：如果 block.name 与现有块重名，自动添加数字后缀
 * 在所有创建/克隆块的逻辑中，push 之前统一调用
 */
function ensureUniqueBlockName(state: ResumeStoreInternal, block: BlockInstance): void {
  if (!state.resume) return;
  const existingNames = state.resume.blocks.map((b) => b.name);
  block.name = getUniqueName(block.name, existingNames);
}

/**
 * 确保分组名称唯一：如果 group.name 与现有分组重名，自动添加数字后缀
 * 在所有创建分组的逻辑中统一调用
 */
function ensureUniqueGroupName(state: ResumeStoreInternal, name: string): string {
  if (!state.resume) return name;
  const existingNames = state.resume.groups.map((g) => g.name);
  return getUniqueName(name, existingNames);
}

// ========== Slice 实现 ==========
export const createBlockSlice = (set: StoreSet, get: StoreGet): BlockSlice => ({
  blockTemplates: [...presetBlockTemplates, ...presetLayoutTemplates],
  customElementTemplates: [],
  groupTemplates: [],

  addBlock: (templateId, x, y, width, height) =>
    set(produce<ResumeStoreInternal>((state) => {
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
      const defaultHeight = height || (templateId === 'tpl-avatar' ? defaultWidth : getDefaultBlockHeight(template.name));

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

      ensureUniqueBlockName(state, block);
      state.resume.blocks.push(block);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = block.id;
      state.editor.selectedBlockIds = [block.id];
    })),

  addBlockFromCustomTemplate: (templateId, x, y) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const template = state.customElementTemplates.find((t) => t.id === templateId);
      if (!template) return;

      const groupId = uuid();
      const groupName = ensureUniqueGroupName(state, template.name);
      const group = {
        id: groupId,
        name: groupName,
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

        ensureUniqueBlockName(state, block);
        state.resume.blocks.push(block);
        group.blockIds.push(blockId);
      }

      state.editor.selectedGroupId = groupId;
      state.editor.selectedBlockIds = [...group.blockIds];
      state.editor.selectedBlockId = group.blockIds.length > 0 ? group.blockIds[0] : null;
      state.resume.updatedAt = Date.now();
    })),

  addBlockFromCustomDecoration: (decorationId, x, y) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const decoration = state.customDecorations.find((d) => d.id === decorationId);
      if (!decoration) return;

      // 使用保存时的舞台尺寸作为默认块尺寸
      const sw = decoration.stageWidth || 400;
      const sh = decoration.stageHeight || 400;
      const defaultWidth = Math.max(60, Math.round(sw));
      const defaultHeight = Math.max(60, Math.round(sh));

      const svgPaths = decoration.paths.map((p) => ({
        pathD: buildDecoPathD(p.anchors, p.isClosed),
        fillColor: p.fillColor,
        strokeColor: p.strokeColor,
        strokeWidth: Math.max(0.5, p.strokeWidth),
        isClosed: p.isClosed,
        clipRect: p.clipRect,
        edgeColors: p.edgeColors,
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
          color: decoration.paths[0]?.fillColor || DEFAULT_PRIMARY_COLOR,
          strokeColor: decoration.paths[0]?.strokeColor || DEFAULT_PRIMARY_COLOR,
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

      ensureUniqueBlockName(state, block);
      state.resume.blocks.push(block);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = block.id;
      state.editor.selectedBlockIds = [block.id];
    })),

  addBlockFromIcon: (iconName, x, y) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      // 默认图标字号 24px，块宽高比图标稍大一点（留适当内距）
      const iconFontSize = 24;
      const defaultWidth = Math.ceil(iconFontSize * 1.2);
      const defaultHeight = Math.ceil(iconFontSize * 1.2);
      const blockId = `${state.resume.id}-icon-${uuid().slice(0, 8)}`;
      const block: BlockInstance = {
        id: blockId,
        templateId: 'antd-icon',
        templateName: '图标',
        name: iconName.replace(/Outlined$|Filled$|TwoTone$/g, ''),
        fields: { 'icon-name': iconName },
        decorations: [],
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

      ensureUniqueBlockName(state, block);
      state.resume.blocks.push(block);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = block.id;
      state.editor.selectedBlockIds = [block.id];
    })),

  removeBlock: (blockId) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const block = findBlock(state, blockId);
      state.resume.blocks = state.resume.blocks.filter((b) => b.id !== blockId);
      state.resume.updatedAt = Date.now();
      if (state.editor.selectedBlockId === blockId) {
        state.editor.selectedBlockId = null;
      }
      state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter((id: string) => id !== blockId);

      if (block?.groupId) {
        const group = state.resume.groups.find((g) => g.id === block.groupId);
        if (group) {
          group.blockIds = group.blockIds.filter((id) => id !== blockId);
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
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const blockIdSet = new Set(blockIds);

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
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const source = findBlock(state, blockId);
      if (!source) return;

      const cloned: BlockInstance = {
        ...JSON.parse(JSON.stringify(source)),
        id: `${state.resume.id}-${source.templateId}-copy-${uuid().slice(0, 8)}`,
        name: `${source.name} (副本)`,
        x: source.x + 20,
        y: source.y + 20,
        zIndex: getNextZIndex(state.resume.blocks),
      };

      ensureUniqueBlockName(state, cloned);
      state.resume.blocks.push(cloned);
      state.resume.updatedAt = Date.now();
      state.editor.selectedBlockId = cloned.id;
      state.editor.selectedBlockIds = [cloned.id];
    })),

  updateBlockField: (blockId, fieldId, value) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.fields[fieldId] = value;
      });
    })),

  updateBlockPosition: (blockId, x, y) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.x = x;
        block.y = y;
      });
    })),

  updateBlockSize: (blockId, width, height) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.width = width;
        block.height = height;
      });
    })),

  updateBlockZIndex: (blockId, zIndex) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.zIndex = zIndex;
      });
    })),

  toggleBlockVisibility: (blockId) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.visible = !block.visible;
      });
    })),

  toggleBlockLock: (blockId) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.locked = !block.locked;
      });
    })),

  setBlockColorTag: (blockId, color) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.colorTag = color;
      });
    })),

  renameBlock: (blockId, name) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.name = name;
      });
    })),

  updateBlockStyle: (blockId, style) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.style = { ...block.style, ...style };
      });
    })),

  updateBlockRotation: (blockId, rotation) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.rotation = rotation;
      });
    })),

  moveBlockZIndex: (blockId, direction) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const block = findBlock(state, blockId);
      if (!block) return;

      const siblings = block.groupId
        ? state.resume.blocks.filter((b) => b.groupId === block.groupId && b.visible)
        : state.resume.blocks.filter((b) => !b.groupId && b.visible);

      if (siblings.length <= 1) return;

      const sortedSiblings = [...siblings].sort((a, b) => a.zIndex - b.zIndex);
      const currentIdx = sortedSiblings.findIndex((b) => b.id === blockId);

      if (currentIdx === -1) return;

      switch (direction) {
        case 'up': {
          if (currentIdx < sortedSiblings.length - 1) {
            const above = sortedSiblings[currentIdx + 1];
            const tempZ = block.zIndex;
            const aboveBlock = findBlock(state, above.id);
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
            const belowBlock = findBlock(state, below.id);
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
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.decorations.push({ ...decoration, id: uuid() });
      });
    })),

  removeDecoration: (blockId, decorationId) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        block.decorations = block.decorations.filter((d) => d.id !== decorationId);
      });
    })),

  updateDecoration: (blockId, decorationId, updates) =>
    set(produce<ResumeStoreInternal>((state) => {
      withBlockUpdate(state, blockId, (block) => {
        const deco = block.decorations.find((d) => d.id === decorationId);
        if (deco) {
          Object.assign(deco, updates);
        }
      });
    })),

  saveAsCustomTemplate: (name, blockIds) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const blocks = state.resume.blocks.filter((b) => blockIds.includes(b.id));
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
    set(produce<ResumeStoreInternal>((state) => {
      state.customElementTemplates = state.customElementTemplates.filter((t) => t.id !== templateId);
    })),

  addBlockFromGroupTemplate: (templateId, x, y) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const template = state.groupTemplates.find((t) => t.id === templateId);
      if (!template) return;

      const groupId = uuid();
      const groupName = ensureUniqueGroupName(state, template.name);
      const group = {
        id: groupId,
        name: groupName,
        blockIds: [] as string[],
        rotation: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.resume.groups.push(group);

      const newBlockIds: string[] = [];
      for (const blockDef of template.blocks) {
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries(blockDef.fields)) {
          fields[k] = v;
        }

        const blockId = `${state.resume.id}-group-${uuid().slice(0, 8)}`;
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

        ensureUniqueBlockName(state, block);
        state.resume.blocks.push(block);
        group.blockIds.push(blockId);
        newBlockIds.push(blockId);
      }

      state.editor.selectedGroupId = groupId;
      state.editor.selectedBlockIds = [...group.blockIds];
      state.editor.selectedBlockId = group.blockIds.length > 0 ? group.blockIds[0] : null;
      state.resume.updatedAt = Date.now();
    })),

  saveAsGroupTemplate: (groupId, name) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (!group || group.blockIds.length === 0) return;

      const blocks = state.resume.blocks.filter((b) => group.blockIds.includes(b.id));
      if (blocks.length === 0) return;

      const minX = Math.min(...blocks.map((b) => b.x));
      const minY = Math.min(...blocks.map((b) => b.y));

      const templateName = name || group.name;
      const uniqueName = getUniqueName(templateName, state.groupTemplates.map((t) => t.name));

      const template: CustomElementTemplate = {
        id: `gtpl-${uuid().slice(0, 8)}`,
        name: uniqueName,
        category: '分组组件',
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

      state.groupTemplates.push(template);
    })),

  removeGroupTemplate: (templateId) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.groupTemplates = state.groupTemplates.filter((t) => t.id !== templateId);
    })),

  updateBlockTemplate: (templateId, updates) =>
    set(produce<ResumeStoreInternal>((state) => {
      const idx = state.blockTemplates.findIndex((t) => t.id === templateId);
      if (idx !== -1) {
        state.blockTemplates[idx] = { ...state.blockTemplates[idx], ...updates, updatedAt: Date.now() };
      }
    })),

  removeBlockTemplate: (templateId) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.blockTemplates = state.blockTemplates.filter((t) => t.id !== templateId);
    })),

  addBlockToFlexbox: (blockId, flexboxId, insertIndex) => {
    // 前置检查：不允许属于分组的块拖入弹性盒子
    const currentResume = get().resume;
    if (currentResume) {
      const block = currentResume.blocks.find((b) => b.id === blockId);
      if (block && block.groupId) {
        const isInGroup = currentResume.groups.some((g) => g.id === block.groupId);
        if (isInGroup) return false;
      }
    }
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const block = findBlock(state, blockId);
      const flexbox = findBlock(state, flexboxId);
      if (!block || !flexbox || flexbox.templateId !== 'tpl-flexbox') return;

      // 不允许将弹性盒子自身或已在其中的块再次加入
      if (block.templateId === 'tpl-flexbox') return;
      if (block.groupId === flexboxId) return;

      // 如果块之前在别的分组中，先移出
      if (block.groupId) {
        const prevGroup = state.resume.groups.find((g) => g.id === block.groupId);
        if (prevGroup) {
          prevGroup.blockIds = prevGroup.blockIds.filter((id) => id !== blockId);
          if (prevGroup.blockIds.length === 0) {
            state.resume.groups = state.resume.groups.filter((g) => g.id !== prevGroup.id);
          }
        }
      }

      // 将块设置为弹性盒子的子元素
      block.groupId = flexboxId;

      // 子元素在 flexbox 中的顺序通过 blocks 数组中 groupId 相同的元素排列顺序决定
      // 如果指定了插入位置，将块移到对应位置
      if (insertIndex !== undefined) {
        const siblings = state.resume.blocks.filter((b) => b.groupId === flexboxId && b.visible);
        const currentIdx = siblings.findIndex((b) => b.id === blockId);
        // 将块在 blocks 数组中移到指定位置
        const allBlocks = state.resume.blocks;
        const blockArrayIdx = allBlocks.findIndex((b) => b.id === blockId);
        if (blockArrayIdx !== -1) {
          const [moved] = allBlocks.splice(blockArrayIdx, 1);
          // 计算在总 blocks 数组中的目标位置
          const targetSiblings = allBlocks.filter((b) => b.groupId === flexboxId && b.visible);
          if (insertIndex >= targetSiblings.length) {
            allBlocks.push(moved);
          } else {
            const targetBlock = targetSiblings[insertIndex];
            const targetIdx = allBlocks.findIndex((b) => b.id === targetBlock.id);
            allBlocks.splice(targetIdx, 0, moved);
          }
        }
      }

      state.resume.updatedAt = Date.now();
    }));
    return true;
  },

  removeBlockFromFlexbox: (blockId, flexboxId) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const block = findBlock(state, blockId);
      if (!block || block.groupId !== flexboxId) return;

      const flexbox = findBlock(state, flexboxId);
      if (!flexbox) return;

      // 将块移出弹性盒子，放到弹性盒子下方
      block.groupId = undefined;
      block.x = flexbox.x;
      block.y = flexbox.y + flexbox.height + 10;

      state.resume.updatedAt = Date.now();
    })),

  reorderFlexboxChildren: (flexboxId, childIds) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      // 根据 childIds 顺序重新排列 blocks 数组中属于该弹性盒子的块
      const allBlocks = state.resume.blocks;
      const childIdSet = new Set(childIds);

      // 取出所有子块
      const children: BlockInstance[] = [];
      const otherBlocks: BlockInstance[] = [];

      for (const b of allBlocks) {
        if (childIdSet.has(b.id)) {
          children.push(b);
        } else {
          otherBlocks.push(b);
        }
      }

      // 按 childIds 顺序排列子块
      const sortedChildren = childIds
        .map((id) => children.find((c) => c.id === id))
        .filter(Boolean) as BlockInstance[];

      // 找到弹性盒子在 otherBlocks 中的位置，将子块紧跟其后插入
      const flexboxIdx = otherBlocks.findIndex((b) => b.id === flexboxId);
      if (flexboxIdx !== -1) {
        otherBlocks.splice(flexboxIdx + 1, 0, ...sortedChildren);
      } else {
        otherBlocks.push(...sortedChildren);
      }

      state.resume.blocks = otherBlocks;
      state.resume.updatedAt = Date.now();
    })),

  getSelectedBlock: () => {
    const state = get();
    if (!state.resume) return undefined;
    return state.resume.blocks.find((b) => b.id === state.editor.selectedBlockId);
  },

  getBlockTemplate: (templateId) => {
    return get().blockTemplates.find((t) => t.id === templateId);
  },
});

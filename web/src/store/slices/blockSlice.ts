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
import {
  getDefaultBlockWidth,
  getDefaultBlockHeight,
  DEFAULT_PRIMARY_COLOR,
  TPL_AVATAR,
  TPL_ICON,
  TPL_CUSTOM_DECORATION,
  TPL_FLEXBOX,
  CLONE_OFFSET,
  FLEXBOX_CHILD_GAP,
  ICON_DEFAULT_FONT_SIZE,
  ICON_SIZE_RATIO,
} from '../../utils/constants';
import { buildDecoPathD } from '../../utils/geometry';
import { presetBlockTemplates, presetLayoutTemplates } from '../../utils/presets';
import type { StoreSet, StoreGet, ResumeStoreInternal } from '../types';

// ========== Slice 类型 ==========
export interface BlockSlice {
  // ===== 数据 =====
  /** 预设 + 布局块模板列表 */
  blockTemplates: BlockTemplate[];
  /** 用户保存的自定义元素模板列表 */
  customElementTemplates: CustomElementTemplate[];
  /** 用户保存的分组模板列表 */
  groupTemplates: CustomElementTemplate[];

  // ===== 块实例操作 =====
  /**
   * 在画布指定位置添加一个块实例
   * @param templateId - 块模板ID，如 'tpl-work-experience'
   * @param x - 在画布上的X坐标(px)
   * @param y - 在画布上的Y坐标(px)
   * @param width - 可选宽度，不传则使用模板分类默认值
   * @param height - 可选高度，不传则使用模板名称默认值
   */
  addBlock: (templateId: string, x: number, y: number, width?: number, height?: number) => void;
  /**
   * 从自定义元素模板添加块组到画布
   * @param templateId - 自定义元素模板ID
   * @param x - 放置基准X坐标(px)
   * @param y - 放置基准Y坐标(px)
   */
  addBlockFromCustomTemplate: (templateId: string, x: number, y: number) => void;
  /**
   * 从分组模板添加块组到画布
   * @param templateId - 分组模板ID
   * @param x - 放置基准X坐标(px)
   * @param y - 放置基准Y坐标(px)
   */
  addBlockFromGroupTemplate: (templateId: string, x: number, y: number) => void;
  /**
   * 从自定义装饰添加装饰块到画布
   * @param decorationId - 自定义装饰ID
   * @param x - 放置X坐标(px)
   * @param y - 放置Y坐标(px)
   */
  addBlockFromCustomDecoration: (decorationId: string, x: number, y: number) => void;
  /**
   * 添加一个 Ant Design 图标块
   * @param iconName - 图标名称，如 'StarOutlined'
   * @param x - 放置X坐标(px)
   * @param y - 放置Y坐标(px)
   */
  addBlockFromIcon: (iconName: string, x: number, y: number) => void;
  /**
   * 删除指定块，同时清理其所在的分组（若分组为空则自动删除）
   * @param blockId - 要删除的块ID
   */
  removeBlock: (blockId: string) => void;
  /**
   * 批量删除多个块
   * @param blockIds - 要删除的块ID列表
   */
  removeBlocks: (blockIds: string[]) => void;
  /**
   * 克隆指定块，副本位置偏移 (20, 20)px
   * @param blockId - 要克隆的块ID
   */
  cloneBlock: (blockId: string) => void;
  /**
   * 更新块的字段值
   * @param blockId - 块ID
   * @param fieldId - 字段ID（对应模板中定义的 field.id）
   * @param value - 新的字段值（字符串）
   */
  updateBlockField: (blockId: string, fieldId: string, value: string) => void;
  /**
   * 更新块在画布上的位置
   * @param blockId - 块ID
   * @param x - 新的X坐标(px)
   * @param y - 新的Y坐标(px)
   */
  updateBlockPosition: (blockId: string, x: number, y: number) => void;
  /**
   * 更新块的尺寸
   * @param blockId - 块ID
   * @param width - 新的宽度(px)
   * @param height - 新的高度(px)
   */
  updateBlockSize: (blockId: string, width: number, height: number) => void;
  /**
   * 更新块的层级
   * @param blockId - 块ID
   * @param zIndex - 新的层级值
   */
  updateBlockZIndex: (blockId: string, zIndex: number) => void;
  /** 切换块的可见性 */
  toggleBlockVisibility: (blockId: string) => void;
  /** 切换块的锁定状态（锁定后不可拖拽/编辑） */
  toggleBlockLock: (blockId: string) => void;
  /**
   * 设置块的颜色标签（用于图层列表中区分）
   * @param blockId - 块ID
   * @param color - 颜色值，undefined 表示清除
   */
  setBlockColorTag: (blockId: string, color: string | undefined) => void;
  /**
   * 重命名块
   * @param blockId - 块ID
   * @param name - 新名称
   */
  renameBlock: (blockId: string, name: string) => void;
  /**
   * 更新块的样式属性（合并更新）
   * @param blockId - 块ID
   * @param style - 要更新的样式片段
   */
  updateBlockStyle: (blockId: string, style: Partial<BlockStyle>) => void;
  /**
   * 更新块的旋转角度
   * @param blockId - 块ID
   * @param rotation - 旋转角度(度)，范围 -360~360
   */
  updateBlockRotation: (blockId: string, rotation: number) => void;
  /**
   * 移动块的层级顺序
   * @param blockId - 块ID
   * @param direction - 移动方向：'up'上移一层，'down'下移一层，'top'置顶，'bottom'置底
   */
  moveBlockZIndex: (blockId: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  /**
   * 拖拽排序：将 sourceBlockId 移动到 targetBlockId 的位置（之前或之后）
   * @param sourceBlockId - 被拖拽的块ID
   * @param targetBlockId - 目标位置的块ID
   * @param position - 'before' 放在目标之前，'after' 放在目标之后
   */
  reorderBlock: (sourceBlockId: string, targetBlockId: string, position: 'before' | 'after') => void;

  // ===== 装饰元素操作 =====
  /**
   * 为块添加装饰元素
   * @param blockId - 目标块ID
   * @param decoration - 装饰元素数据（不含id，会自动生成）
   */
  addDecoration: (blockId: string, decoration: Omit<DecorationElement, 'id'>) => void;
  /** 删除块上的指定装饰元素 */
  removeDecoration: (blockId: string, decorationId: string) => void;
  /** 更新块上指定装饰元素的属性（合并更新） */
  updateDecoration: (blockId: string, decorationId: string, updates: Partial<DecorationElement>) => void;

  // ===== 自定义元素模板操作 =====
  /**
   * 将选中的块保存为自定义元素模板
   * @param name - 模板名称
   * @param blockIds - 要保存的块ID列表
   */
  saveAsCustomTemplate: (name: string, blockIds: string[]) => void;
  /** 删除自定义元素模板 */
  removeCustomTemplate: (templateId: string) => void;

  // ===== 块模板操作 =====
  /** 更新块模板属性（合并更新） */
  updateBlockTemplate: (templateId: string, updates: Partial<BlockTemplate>) => void;
  /** 删除块模板 */
  removeBlockTemplate: (templateId: string) => void;

  // ===== 分组模板操作 =====
  /**
   * 将分组保存为模板
   * @param groupId - 分组ID
   * @param name - 可选模板名称，不传则使用分组名称
   */
  saveAsGroupTemplate: (groupId: string, name?: string) => void;
  /** 删除分组模板 */
  removeGroupTemplate: (templateId: string) => void;

  // ===== 弹性盒子操作 =====
  /**
   * 将块添加到弹性盒子中
   * @param blockId - 要添加的块ID
   * @param flexboxId - 弹性盒子块ID
   * @param insertIndex - 可选插入位置索引
   * @returns 是否添加成功（属于分组的块不允许拖入弹性盒子）
   */
  addBlockToFlexbox: (blockId: string, flexboxId: string, insertIndex?: number) => boolean;
  /**
   * 将块从弹性盒子中移出，放到弹性盒子下方
   * @param blockId - 要移出的块ID
   * @param flexboxId - 弹性盒子块ID
   */
  removeBlockFromFlexbox: (blockId: string, flexboxId: string) => void;
  /**
   * 重排弹性盒子子元素的顺序
   * @param flexboxId - 弹性盒子块ID
   * @param childIds - 按新顺序排列的子块ID列表
   */
  reorderFlexboxChildren: (flexboxId: string, childIds: string[]) => void;

  // ===== 选择器 =====
  /** 获取当前选中的块实例 */
  getSelectedBlock: () => BlockInstance | undefined;
  /** 根据模板ID获取块模板定义 */
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
      const defaultHeight = height || (templateId === TPL_AVATAR ? defaultWidth : getDefaultBlockHeight(template.name));

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
        templateId: TPL_CUSTOM_DECORATION,
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
      const defaultWidth = Math.ceil(ICON_DEFAULT_FONT_SIZE * ICON_SIZE_RATIO);
      const defaultHeight = Math.ceil(ICON_DEFAULT_FONT_SIZE * ICON_SIZE_RATIO);
      const blockId = `${state.resume.id}-icon-${uuid().slice(0, 8)}`;
      const block: BlockInstance = {
        id: blockId,
        templateId: TPL_ICON,
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
        x: source.x + CLONE_OFFSET,
        y: source.y + CLONE_OFFSET,
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
      if (!state.resume) return;
      const block = findBlock(state, blockId);
      if (!block) return;

      const oldZIndex = block.zIndex;
      block.zIndex = zIndex;

      // 对同层级中 zIndex >= 新值的其他块，自动 +1 避免重复
      const siblings = block.groupId
        ? state.resume.blocks.filter((b) => b.groupId === block.groupId && b.id !== blockId)
        : state.resume.blocks.filter((b) => !b.groupId && b.id !== blockId);

      for (const sibling of siblings) {
        if (sibling.zIndex >= zIndex) {
          sibling.zIndex += 1;
        }
      }

      // 压缩断层：同层级按当前顺序重新分配连续 zIndex
      const allSiblings = block.groupId
        ? state.resume.blocks.filter((b) => b.groupId === block.groupId)
        : state.resume.blocks.filter((b) => !b.groupId);
      const sorted = [...allSiblings].sort((a, b) => a.zIndex - b.zIndex);
      sorted.forEach((b, i) => {
        const actual = findBlock(state, b.id);
        if (actual) {
          actual.zIndex = i + 1;
        }
      });

      state.resume.updatedAt = Date.now();
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

  reorderBlock: (sourceBlockId, targetBlockId, position) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const sourceBlock = findBlock(state, sourceBlockId);
      const targetBlock = findBlock(state, targetBlockId);
      if (!sourceBlock || !targetBlock) return;

      // 只允许同层级（同分组或都是未分组）之间排序
      if (sourceBlock.groupId !== targetBlock.groupId) return;

      // 获取同层级的所有可见块，按 zIndex 排序
      const siblings = sourceBlock.groupId
        ? state.resume.blocks.filter((b) => b.groupId === sourceBlock.groupId && b.visible)
        : state.resume.blocks.filter((b) => !b.groupId && b.visible);

      const sortedSiblings = [...siblings].sort((a, b) => a.zIndex - b.zIndex);

      // 移除 source，然后插入到 target 的位置
      const withoutSource = sortedSiblings.filter((b) => b.id !== sourceBlockId);
      const targetIdx = withoutSource.findIndex((b) => b.id === targetBlockId);
      if (targetIdx === -1) return;

      const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
      withoutSource.splice(insertIdx, 0, sourceBlock);

      // 重新分配 zIndex
      withoutSource.forEach((b, i) => {
        const block = findBlock(state, b.id);
        if (block) {
          block.zIndex = i + 1;
        }
      });

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
      if (!block || !flexbox || flexbox.templateId !== TPL_FLEXBOX) return;

      // 不允许将弹性盒子自身或已在其中的块再次加入
      if (block.templateId === TPL_FLEXBOX) return;
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
      block.y = flexbox.y + flexbox.height + FLEXBOX_CHILD_GAP;

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

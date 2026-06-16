/**
 * 编辑器状态 Slice
 * 管理编辑器 UI 状态、选择操作、分组操作
 */
import { produce } from 'immer';
import { v4 as uuid } from 'uuid';
import type { EditorState, BlockGroup, BlockInstance } from '../../types';
import type { StoreSet, StoreGet, ResumeStoreInternal } from '../types';
import { getUniqueName } from '../../utils/block';

// ========== 编辑器初始状态 ==========
export const INITIAL_EDITOR: EditorState = {
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
};

// ========== Slice 类型 ==========
export interface EditorSlice {
  // ===== 数据 =====
  /** 编辑器 UI 状态（选中项、面板尺寸、主题等） */
  editor: EditorState;

  // ===== 选择操作 =====
  /**
   * 选中单个块（同时清除多选列表和分组选中）
   * @param blockId - 块ID，传 null 则清除所有选中
   */
  selectBlock: (blockId: string | null) => void;
  /**
   * 选中多个块（同时清除分组选中）
   * @param blockIds - 块ID列表，首个元素成为主选中项
   */
  selectBlocks: (blockIds: string[]) => void;
  /**
   * 将块添加到当前多选列表
   * @param blockId - 要追加的块ID
   */
  addToSelection: (blockId: string) => void;
  /**
   * 从当前多选列表中移除指定块
   * @param blockId - 要移除的块ID
   */
  removeFromSelection: (blockId: string) => void;
  /** 清除所有选中状态（块 + 分组） */
  clearSelection: () => void;

  // ===== 分组内选择 =====
  /**
   * 在分组内选中某个块（保持分组选中状态）
   * @param blockId - 块ID
   * @param groupId - 所属分组ID
   */
  selectBlockInGroup: (blockId: string, groupId: string) => void;

  // ===== 分组操作 =====
  /**
   * 创建空分组
   * @param name - 分组名称
   * @returns 新创建的分组ID
   */
  createGroup: (name: string) => string;
  /**
   * 将多个块添加到分组中
   * @param groupId - 目标分组ID
   * @param blockIds - 要添加的块ID列表
   */
  addBlocksToGroup: (groupId: string, blockIds: string[]) => void;
  /**
   * 将块从分组中移出（分组为空时自动删除分组）
   * @param groupId - 分组ID
   * @param blockIds - 要移出的块ID列表
   */
  removeBlocksFromGroup: (groupId: string, blockIds: string[]) => void;
  /**
   * 删除分组（组内块解除分组关系，不会被删除）
   * @param groupId - 分组ID
   */
  removeGroup: (groupId: string) => void;
  /**
   * 重命名分组
   * @param groupId - 分组ID
   * @param name - 新名称
   */
  renameGroup: (groupId: string, name: string) => void;
  /**
   * 更新分组的旋转角度
   * @param groupId - 分组ID
   * @param rotation - 旋转角度(度)
   */
  updateGroupRotation: (groupId: string, rotation: number) => void;
  /**
   * 整体平移分组内所有块的位置
   * @param groupId - 分组ID
   * @param dx - X方向偏移量(px)
   * @param dy - Y方向偏移量(px)
   */
  updateGroupPosition: (groupId: string, dx: number, dy: number) => void;
  /**
   * 选中整个分组（自动选中组内所有块）
   * @param groupId - 分组ID，传 null 则仅清除分组选中
   */
  selectGroup: (groupId: string | null) => void;
  /**
   * 将当前多选的块创建为分组
   * @returns 新分组ID，选中不足2个块时返回 null
   */
  groupSelectedBlocks: () => string | null;

  // ===== 编辑器 UI 操作 =====
  /** 切换全屏模式 */
  toggleFullscreen: () => void;
  /**
   * 设置左侧面板宽度
   * @param width - 宽度(px)
   */
  setLeftPanelWidth: (width: number) => void;
  /**
   * 设置右侧面板宽度
   * @param width - 宽度(px)
   */
  setRightPanelWidth: (width: number) => void;
  /**
   * 设置编辑器主题
   * @param theme - 'light' | 'dark' | 'system'
   */
  setEditorTheme: (theme: 'light' | 'dark' | 'system') => void;
  /**
   * 设置预览抽屉开关
   * @param open - 是否打开
   */
  setPreviewOpen: (open: boolean) => void;
  /**
   * 设置是否显示对齐参考线
   * @param show - 是否显示
   */
  setShowAlignGuides: (show: boolean) => void;
  /**
   * 设置是否启用网格吸附
   * @param snap - 是否启用
   */
  setSnapToGrid: (snap: boolean) => void;

  // ===== 距离标注回调注册 =====
  /**
   * 注册距离标注刷新回调（由 EditorCanvas 组件调用）
   * @param fn - 刷新回调函数，传 null 注销
   */
  registerDistanceRefresh: (fn: ((blockId: string) => void) | null) => void;
  /**
   * 手动触发指定块的距离标注刷新
   * @param blockId - 需要刷新距离标注的块ID
   */
  refreshDistancesForBlock: (blockId: string) => void;

  // ===== 选择器 =====
  /**
   * 获取分组内的所有块实例
   * @param groupId - 分组ID
   * @returns 块实例数组
   */
  getGroupBlocks: (groupId: string) => BlockInstance[];
}

// 距离标注刷新回调（由 EditorCanvas 注册，由键盘快捷键等外部逻辑调用）
let _distanceRefreshFn: ((blockId: string) => void) | null = null;

// ========== Slice 实现 ==========
export const createEditorSlice = (set: StoreSet, get: StoreGet): EditorSlice => ({
  editor: { ...INITIAL_EDITOR },

  // ========== 选择操作 ==========
  selectBlock: (blockId) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.selectedBlockId = blockId;
      state.editor.selectedBlockIds = blockId ? [blockId] : [];
      state.editor.selectedGroupId = null;
    })),

  selectBlocks: (blockIds) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.selectedBlockIds = blockIds;
      state.editor.selectedBlockId = blockIds.length > 0 ? blockIds[0] : null;
      state.editor.selectedGroupId = null;
    })),

  addToSelection: (blockId) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.editor.selectedBlockIds.includes(blockId)) {
        state.editor.selectedBlockIds.push(blockId);
      }
      state.editor.selectedBlockId = blockId;
    })),

  removeFromSelection: (blockId) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter((id) => id !== blockId);
      if (state.editor.selectedBlockId === blockId) {
        state.editor.selectedBlockId = state.editor.selectedBlockIds.length > 0 ? state.editor.selectedBlockIds[0] : null;
      }
    })),

  clearSelection: () =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.selectedBlockId = null;
      state.editor.selectedBlockIds = [];
      state.editor.selectedGroupId = null;
    })),

  selectBlockInGroup: (blockId, groupId) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.selectedBlockId = blockId;
      state.editor.selectedBlockIds = blockId ? [blockId] : [];
      state.editor.selectedGroupId = groupId;
    })),

  // ========== 分组操作 ==========
  createGroup: (name) => {
    const groupId = uuid();
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const uniqueName = getUniqueName(name, state.resume.groups.map((g) => g.name));
      const group: BlockGroup = {
        id: groupId,
        name: uniqueName,
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
    set(produce<ResumeStoreInternal>((state) => {
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

  removeBlocksFromGroup: (groupId, blockIds) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (!group) return;
      for (const id of blockIds) {
        group.blockIds = group.blockIds.filter((bid) => bid !== id);
        const block = state.resume.blocks.find((b) => b.id === id);
        if (block) {
          block.groupId = undefined;
        }
      }
      // 如果分组为空则自动删除
      if (group.blockIds.length === 0) {
        state.resume.groups = state.resume.groups.filter((g) => g.id !== groupId);
        // 清除分组选中状态
        if (state.editor.selectedGroupId === groupId) {
          state.editor.selectedGroupId = null;
        }
      }
      // 如果移出的是当前选中的块，确保选中状态正确
      if (state.editor.selectedGroupId === groupId) {
        // 仍选中分组，但更新 selectedBlockIds（移除已移出的块）
        state.editor.selectedBlockIds = state.editor.selectedBlockIds.filter(
          (id) => !blockIds.includes(id)
        );
        if (state.editor.selectedBlockIds.length === 0) {
          state.editor.selectedBlockId = null;
        } else if (!state.editor.selectedBlockIds.includes(state.editor.selectedBlockId!)) {
          state.editor.selectedBlockId = state.editor.selectedBlockIds[0];
        }
      }
      group.updatedAt = Date.now();
      state.resume.updatedAt = Date.now();
    })),

  removeGroup: (groupId) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (group) {
        for (const blockId of group.blockIds) {
          const block = state.resume.blocks.find((b) => b.id === blockId);
          if (block) {
            block.groupId = undefined;
          }
        }
      }
      state.resume.groups = state.resume.groups.filter((g) => g.id !== groupId);
      // 清除分组选中状态，将选中切换为原分组内的块
      if (state.editor.selectedGroupId === groupId) {
        state.editor.selectedGroupId = null;
        if (group && group.blockIds.length > 0) {
          state.editor.selectedBlockIds = [...group.blockIds];
          state.editor.selectedBlockId = group.blockIds[0];
        } else {
          state.editor.selectedBlockIds = [];
          state.editor.selectedBlockId = null;
        }
      }
      state.resume.updatedAt = Date.now();
    })),

  renameGroup: (groupId, name) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (group) {
        group.name = name;
        group.updatedAt = Date.now();
        state.resume.updatedAt = Date.now();
      }
    })),

  updateGroupRotation: (groupId, rotation) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      const group = state.resume.groups.find((g) => g.id === groupId);
      if (group) {
        group.rotation = rotation;
        group.updatedAt = Date.now();
        state.resume.updatedAt = Date.now();
      }
    })),

  updateGroupPosition: (groupId, dx, dy) =>
    set(produce<ResumeStoreInternal>((state) => {
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
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.selectedGroupId = groupId;
      if (groupId) {
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
    const baseName = `分组 ${state.resume.groups.length + 1}`;
    const uniqueName = getUniqueName(baseName, state.resume.groups.map((g) => g.name));
    const groupId = state.createGroup(uniqueName);
    state.addBlocksToGroup(groupId, state.editor.selectedBlockIds);
    set(produce<ResumeStoreInternal>((s) => {
      s.editor.selectedGroupId = groupId;
    }));
    return groupId;
  },

  // ========== 编辑器 UI 操作 ==========
  toggleFullscreen: () =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.isFullscreen = !state.editor.isFullscreen;
    })),

  setLeftPanelWidth: (width) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.leftPanelWidth = width;
    })),

  setRightPanelWidth: (width) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.rightPanelWidth = width;
    })),

  setEditorTheme: (theme) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.theme = theme;
    })),

  setPreviewOpen: (open) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.previewOpen = open;
    })),

  setShowAlignGuides: (show) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.showAlignGuides = show;
    })),

  setSnapToGrid: (snap) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.editor.snapToGrid = snap;
    })),

  // ========== 距离标注回调注册 ==========
  registerDistanceRefresh: (fn) => {
    _distanceRefreshFn = fn;
  },

  refreshDistancesForBlock: (blockId) => {
    if (_distanceRefreshFn) {
      _distanceRefreshFn(blockId);
    }
  },

  // ========== 选择器 ==========
  getGroupBlocks: (groupId) => {
    const state = get();
    if (!state.resume) return [];
    const group = state.resume.groups.find((g) => g.id === groupId);
    if (!group) return [];
    return state.resume.blocks.filter((b) => group.blockIds.includes(b.id));
  },
});

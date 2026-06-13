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
  // 数据
  editor: EditorState;

  // 选择操作
  selectBlock: (blockId: string | null) => void;
  selectBlocks: (blockIds: string[]) => void;
  addToSelection: (blockId: string) => void;
  removeFromSelection: (blockId: string) => void;
  clearSelection: () => void;

  // 分组内选择
  selectBlockInGroup: (blockId: string, groupId: string) => void;

  // 分组操作
  createGroup: (name: string) => string;
  addBlocksToGroup: (groupId: string, blockIds: string[]) => void;
  removeBlocksFromGroup: (groupId: string, blockIds: string[]) => void;
  removeGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  updateGroupRotation: (groupId: string, rotation: number) => void;
  updateGroupPosition: (groupId: string, dx: number, dy: number) => void;
  selectGroup: (groupId: string | null) => void;
  groupSelectedBlocks: () => string | null;

  // 编辑器 UI 操作
  toggleFullscreen: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setEditorTheme: (theme: 'light' | 'dark' | 'system') => void;
  setPreviewOpen: (open: boolean) => void;
  setShowAlignGuides: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;

  // 距离标注回调注册
  registerDistanceRefresh: (fn: ((blockId: string) => void) | null) => void;
  refreshDistancesForBlock: (blockId: string) => void;

  // 选择器
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

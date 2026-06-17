/**
 * Zustand Store 组合入口
 * 将各 slice 合并为单一 store，保持完整的 API 向后兼容
 */
import { create } from 'zustand';
import { createResumeSlice, type ResumeSlice } from './slices/resumeSlice';
import { createBlockSlice, type BlockSlice } from './slices/blockSlice';
import { createEditorSlice, type EditorSlice } from './slices/editorSlice';
import { createHistorySlice, createHistoryAwareSet, type HistorySlice } from './slices/historySlice';
import type { StoreSet, StoreGet } from './types';

// ========== 导出对齐/距离计算工具 ==========
export { calculateAlignGuides, calculateDistances } from '../utils/block';

// ========== 导出 Store 内部类型 ==========
export type { ResumeStoreInternal, StoreSet, StoreGet } from './types';

// ========== 导出历史记录相关 ==========
export { type HistoryScope } from './slices/historySlice';

// ========== 组合后的完整 Store 类型 ==========
export type ResumeStore = ResumeSlice & BlockSlice & EditorSlice & HistorySlice;

// ========== 创建 Store ==========
export const useResumeStore = create<ResumeStore>()((originalSet: StoreSet, get: StoreGet) => {
  // 用 history-aware 的 set 包装原始 set，自动记录快照
  const set = createHistoryAwareSet(originalSet, get);

  return {
    ...createResumeSlice(set, get),
    ...createBlockSlice(set, get),
    ...createEditorSlice(set, get),
    ...createHistorySlice(originalSet, get), // history slice 使用原始 set，避免自身操作产生快照
  };
});

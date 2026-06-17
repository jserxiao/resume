/**
 * Store 内部共享类型
 * 用于各 slice 之间跨 slice 状态访问的类型定义
 */
import type { ResumeSlice } from './slices/resumeSlice';
import type { BlockSlice } from './slices/blockSlice';
import type { EditorSlice } from './slices/editorSlice';
import type { HistorySlice } from './slices/historySlice';

/** Store 内部完整状态（各 slice 数据 + 方法的合集） */
export type ResumeStoreInternal = ResumeSlice & BlockSlice & EditorSlice & HistorySlice;

/**
 * Zustand 的 set 函数类型
 * 使用 immer 中间件时，set 接受一个 produce 回调函数
 */
export type StoreSet = (
  fn: (state: ResumeStoreInternal) => void,
) => void;

/** Zustand 的 get 函数类型 */
export type StoreGet = () => ResumeStoreInternal;

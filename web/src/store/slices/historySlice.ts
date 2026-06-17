/**
 * Undo/Redo History Slice
 * 通用的撤销/重做功能，支持多作用域（如简历画布、装饰画布）
 *
 * 设计要点：
 * - 通过 HistoryManager 管理快照栈，每个 scope 维护独立的 undo/redo 栈
 * - 包装 Zustand 的 set 函数，在状态变更时自动记录快照
 * - undo/redo 通过直接替换 resume 数据实现状态回退
 * - 通过比较变更前后的 resume 数据判断是否产生快照（纯 UI 变更不产生快照）
 */
import { produce } from 'immer';
import type { Resume } from '../../types';
import type { StoreSet, StoreGet, ResumeStoreInternal } from '../types';

// ========== 常量 ==========
/** 每个作用域的最大历史记录条数 */
const MAX_HISTORY_SIZE = 50;
/** 快照节流间隔（ms），同一 scope 在此时间内多次变更只记录最后一次 */
const SNAPSHOT_DEBOUNCE_MS = 300;

// ========== 作用域类型 ==========
/** 历史记录作用域标识，后续可扩展如 'decoration' 等 */
export type HistoryScope = 'resume';

// ========== HistoryManager ==========
/**
 * 通用历史记录管理器
 * 维护每个 scope 的 undo/redo 栈
 */
class HistoryManager {
  private undoStacks = new Map<HistoryScope, Resume[]>();
  private redoStacks = new Map<HistoryScope, Resume[]>();
  /** 节流定时器，防止连续快速操作产生过多快照 */
  private timers = new Map<HistoryScope, ReturnType<typeof setTimeout>>();
  /** 待提交的快照，用于节流场景下的最终提交 */
  private pendingSnapshots = new Map<HistoryScope, Resume>();

  canUndo(scope: HistoryScope): boolean {
    return (this.undoStacks.get(scope)?.length ?? 0) > 0;
  }

  canRedo(scope: HistoryScope): boolean {
    return (this.redoStacks.get(scope)?.length ?? 0) > 0;
  }

  /**
   * 记录一个快照（带节流）
   * 在 SNAPSHOT_DEBOUNCE_MS 内的多次变更只保留最终状态
   */
  push(scope: HistoryScope, snapshot: Resume): void {
    this.pendingSnapshots.set(scope, snapshot);

    // 清除已有的定时器（节流）
    const existing = this.timers.get(scope);
    if (existing) clearTimeout(existing);

    // 延迟提交，确保连续快速操作只产生一条记录
    const timer = setTimeout(() => {
      const pending = this.pendingSnapshots.get(scope);
      if (pending) {
        this.commit(scope, pending);
        this.pendingSnapshots.delete(scope);
      }
      this.timers.delete(scope);
    }, SNAPSHOT_DEBOUNCE_MS);

    this.timers.set(scope, timer);
  }

  private commit(scope: HistoryScope, snapshot: Resume): void {
    let undoStack = this.undoStacks.get(scope);
    if (!undoStack) {
      undoStack = [];
      this.undoStacks.set(scope, undoStack);
    }

    undoStack.push(snapshot);

    // 限制栈大小
    if (undoStack.length > MAX_HISTORY_SIZE) {
      undoStack.shift();
    }

    // 新快照提交后，清空 redo 栈
    this.redoStacks.set(scope, []);
  }

  /**
   * 撤销：弹出 undo 栈顶快照，将当前状态压入 redo 栈
   * @returns 恢复的快照，若无可用则返回 undefined
   */
  undo(scope: HistoryScope, currentSnapshot: Resume): Resume | undefined {
    // 先提交待处理的快照
    this.flushPending(scope);

    const undoStack = this.undoStacks.get(scope);
    if (!undoStack || undoStack.length === 0) return undefined;

    const snapshot = undoStack.pop()!;

    let redoStack = this.redoStacks.get(scope);
    if (!redoStack) {
      redoStack = [];
      this.redoStacks.set(scope, redoStack);
    }
    redoStack.push(currentSnapshot);

    return snapshot;
  }

  /**
   * 重做：弹出 redo 栈顶快照，将当前状态压入 undo 栈
   * @returns 恢复的快照，若无可用则返回 undefined
   */
  redo(scope: HistoryScope, currentSnapshot: Resume): Resume | undefined {
    this.flushPending(scope);

    const redoStack = this.redoStacks.get(scope);
    if (!redoStack || redoStack.length === 0) return undefined;

    const snapshot = redoStack.pop()!;

    let undoStack = this.undoStacks.get(scope);
    if (!undoStack) {
      undoStack = [];
      this.undoStacks.set(scope, undoStack);
    }
    undoStack.push(currentSnapshot);

    return snapshot;
  }

  /** 提交待处理的快照 */
  private flushPending(scope: HistoryScope): void {
    const timer = this.timers.get(scope);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(scope);
      const pending = this.pendingSnapshots.get(scope);
      if (pending) {
        this.commit(scope, pending);
        this.pendingSnapshots.delete(scope);
      }
    }
  }

  /** 清除指定作用域的所有历史记录 */
  clear(scope: HistoryScope): void {
    const timer = this.timers.get(scope);
    if (timer) clearTimeout(timer);
    this.timers.delete(scope);
    this.pendingSnapshots.delete(scope);
    this.undoStacks.delete(scope);
    this.redoStacks.delete(scope);
  }

  /** 清除所有作用域的历史记录 */
  clearAll(): void {
    for (const scope of this.undoStacks.keys()) {
      this.clear(scope);
    }
  }
}

// 全局单例
const historyManager = new HistoryManager();

// ========== 快照提取 ==========
/** 从完整 store 状态中提取简历快照（只包含业务数据，不包含 UI 状态） */
function extractResumeSnapshot(state: ResumeStoreInternal): Resume | null {
  return state.resume ? JSON.parse(JSON.stringify(state.resume)) : null;
}

/**
 * 快速比较两个 resume 快照是否有实质变更
 * 忽略 updatedAt / lastSavedAt 时间戳（这些是自动维护的元数据，不算用户操作）
 */
function hasResumeChanged(before: Resume | null, after: Resume | null): boolean {
  // 从 null 到有值，或从有值到 null
  if (before === null || after === null) {
    return before !== after;
  }

  // 忽略 updatedAt 和 lastSavedAt（纯元数据，不算用户操作）
  const { updatedAt: _bu, lastSavedAt: _bl, ...beforeRest } = before;
  const { updatedAt: _au, lastSavedAt: _al, ...afterRest } = after;

  return JSON.stringify(beforeRest) !== JSON.stringify(afterRest);
}

// ========== Slice 类型 ==========
export interface HistorySlice {
  // ===== 数据 =====
  /** 是否可撤销 */
  canUndo: boolean;
  /** 是否可重做 */
  canRedo: boolean;

  // ===== 操作 =====
  /** 撤销上一步操作 */
  undo: () => void;
  /** 重做上一步撤销的操作 */
  redo: () => void;
}

// ========== 创建带历史记录的 set 包装器 ==========
/**
 * 包装 Zustand 的 set 函数，在状态变更时自动记录快照
 *
 * 自动跳过以下场景的快照记录：
 * 1. resume 数据无实质变更（纯 UI 选中操作等）
 * 2. resume 为 null（未创建简历时）
 *
 * @param originalSet - 原始的 Zustand set 函数
 * @param get - Zustand get 函数
 * @returns 包装后的 set 函数
 */
export function createHistoryAwareSet(
  originalSet: StoreSet,
  get: StoreGet,
): StoreSet {
  return (fn) => {
    // 在执行 set 之前，先获取当前快照（用于 undo 栈）
    const beforeSnapshot = extractResumeSnapshot(get());

    // 执行原始 set
    originalSet(fn);

    // 执行后获取新快照
    const afterSnapshot = extractResumeSnapshot(get());

    // 判断 resume 是否有实质变更
    if (!hasResumeChanged(beforeSnapshot, afterSnapshot)) return;

    // 没有变更前快照则不记录（首次创建简历时不记录空状态）
    if (!beforeSnapshot) return;

    // 记录变更前的快照到 undo 栈（带节流）
    historyManager.push('resume', beforeSnapshot);

    // 更新 canUndo / canRedo 状态
    updateHistoryState(originalSet, get);
  };
}

/** 更新 canUndo / canRedo 状态 */
function updateHistoryState(set: StoreSet, get: StoreGet): void {
  const canUndo = historyManager.canUndo('resume');
  const canRedo = historyManager.canRedo('resume');
  const current = get();

  // 仅在状态变化时更新，避免无限循环
  if (current.canUndo !== canUndo || current.canRedo !== canRedo) {
    set(produce<ResumeStoreInternal>((s) => {
      s.canUndo = canUndo;
      s.canRedo = canRedo;
    }));
  }
}

// ========== Slice 实现 ==========
export const createHistorySlice = (set: StoreSet, get: StoreGet): HistorySlice => ({
  canUndo: false,
  canRedo: false,

  undo: () => {
    const currentSnapshot = extractResumeSnapshot(get());
    if (!currentSnapshot) return;

    const restored = historyManager.undo('resume', currentSnapshot);
    if (!restored) return;

    set(produce<ResumeStoreInternal>((state) => {
      state.resume = restored;
      // 清除选中状态（恢复到快照时的选中不一定有效）
      state.editor.selectedBlockId = null;
      state.editor.selectedBlockIds = [];
      state.editor.selectedGroupId = null;
    }));

    updateHistoryState(set, get);
  },

  redo: () => {
    const currentSnapshot = extractResumeSnapshot(get());
    if (!currentSnapshot) return;

    const restored = historyManager.redo('resume', currentSnapshot);
    if (!restored) return;

    set(produce<ResumeStoreInternal>((state) => {
      state.resume = restored;
      state.editor.selectedBlockId = null;
      state.editor.selectedBlockIds = [];
      state.editor.selectedGroupId = null;
    }));

    updateHistoryState(set, get);
  },
});

// ========== 导出 HistoryManager 实例（供外部高级场景使用） ==========
export { historyManager };

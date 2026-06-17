import { useEffect, useRef, useCallback } from 'react';
import { useResumeStore } from '@/store';

/**
 * 自动保存 Hook
 * 
 * 功能：
 * 1. 定时自动保存简历数据到 localStorage
 * 2. 页面关闭前（beforeunload）自动保存
 * 3. 页面加载时从 localStorage 恢复数据
 */

const STORAGE_KEY = 'resume-autosave';

/** 保存当前简历数据到 localStorage */
export function saveToLocalStorage() {
  const { resume, customElementTemplates, groupTemplates, customColorSchemes, customDecorations, blockTemplates, editor } = useResumeStore.getState();
  
  const data = {
    resume,
    customElementTemplates,
    groupTemplates,
    customColorSchemes,
    customDecorations,
    // 不保存预设模板（它们从代码初始化），只保存自定义模板
    customBlockTemplates: blockTemplates.filter(t => !t.isPreset),
    // 保存编辑器配置（不保存选中状态）
    editorConfig: {
      theme: editor.theme,
      leftPanelWidth: editor.leftPanelWidth,
      rightPanelWidth: editor.rightPanelWidth,
      autoSave: editor.autoSave,
      autoSaveInterval: editor.autoSaveInterval,
      showAlignGuides: editor.showAlignGuides,
      snapToGrid: editor.snapToGrid,
      gridSize: editor.gridSize,
    },
    savedAt: Date.now(),
    version: 1,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('[AutoSave] 简历数据已自动保存');
  } catch (e) {
    console.error('[AutoSave] 保存失败:', e);
    // localStorage 可能已满，尝试清理旧数据
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('[AutoSave] localStorage 空间不足，跳过本次保存');
    }
  }
}

/** 从 localStorage 恢复简历数据，返回是否成功 */
export function restoreFromLocalStorage(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);
    if (!data.resume || !data.version) {
      console.warn('[AutoSave] 存储数据格式无效，跳过恢复');
      return false;
    }

    const store = useResumeStore.getState();

    // 恢复简历数据
    if (data.resume) {
      // 使用 importFromJSON 以获得版本迁移支持
      store.importFromJSON(data.resume);
    }

    // 恢复自定义元素模板
    if (data.customElementTemplates && Array.isArray(data.customElementTemplates)) {
      // 直接设置（需要通过 store action 或 produce）
      useResumeStore.setState(produce(state => {
        state.customElementTemplates = data.customElementTemplates;
      }));
    }

    // 恢复分组组件模板
    if (data.groupTemplates && Array.isArray(data.groupTemplates)) {
      useResumeStore.setState(produce(state => {
        state.groupTemplates = data.groupTemplates;
      }));
    }

    // 恢复自定义配色方案
    if (data.customColorSchemes && Array.isArray(data.customColorSchemes)) {
      useResumeStore.setState(produce(state => {
        state.customColorSchemes = data.customColorSchemes;
      }));
    }

    // 恢复自定义装饰
    if (data.customDecorations && Array.isArray(data.customDecorations)) {
      useResumeStore.setState(produce(state => {
        state.customDecorations = data.customDecorations;
      }));
    }

    // 恢复自定义块模板
    if (data.customBlockTemplates && Array.isArray(data.customBlockTemplates)) {
      useResumeStore.setState(produce(state => {
        // 合并预设模板和自定义模板
        state.blockTemplates = [
          ...state.blockTemplates.filter((t: { isPreset: boolean }) => t.isPreset),
          ...data.customBlockTemplates,
        ];
      }));
    }

    // 恢复编辑器配置
    if (data.editorConfig) {
      useResumeStore.setState(produce(state => {
        Object.assign(state.editor, data.editorConfig);
        // 清除选中状态（不恢复上次的选中）
        state.editor.selectedBlockId = null;
        state.editor.selectedBlockIds = [];
        state.editor.selectionAnchorId = null;
        state.editor.selectedGroupId = null;
        state.editor.previewOpen = false;
      }));
    }

    console.log('[AutoSave] 简历数据已从本地恢复');
    return true;
  } catch (e) {
    console.error('[AutoSave] 恢复失败:', e);
    return false;
  }
}

/** 清除 localStorage 中的自动保存数据 */
export function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

/** 检查是否有可恢复的自动保存数据 */
export function hasAutoSaveData(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/** 获取自动保存的时间戳 */
export function getAutoSaveTimestamp(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.savedAt || null;
  } catch {
    return null;
  }
}

// 需要引入 produce 用于直接设置 state
import { produce } from 'immer';

/**
 * 自动保存 Hook
 * 在编辑器页面使用，提供：
 * - 定时自动保存
 * - beforeunload 保存 + 提醒
 * - 手动保存/清除
 */
export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  const { editor, resume, markSaved } = useResumeStore();

  // 手动保存
  const manualSave = useCallback(() => {
    saveToLocalStorage();
    markSaved();
    lastSaveTimeRef.current = Date.now();
  }, [markSaved]);

  // 手动清除保存数据
  const clearSave = useCallback(() => {
    clearLocalStorage();
    lastSaveTimeRef.current = 0;
  }, []);

  // 启动自动保存定时器
  useEffect(() => {
    if (!editor.autoSave || !resume) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const intervalMs = editor.autoSaveInterval * 1000;

    timerRef.current = setInterval(() => {
      saveToLocalStorage();
      lastSaveTimeRef.current = Date.now();
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [editor.autoSave, editor.autoSaveInterval, resume]);

  // beforeunload：页面关闭前自动保存数据
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    manualSave,
    clearSave,
    lastSaveTime: lastSaveTimeRef.current,
  };
}

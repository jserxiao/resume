import { useEffect } from 'react';
import { useResumeStore } from '@/store';
import { saveToLocalStorage } from '@/hooks/useAutoSave';

/**
 * 编辑器全局键盘快捷键 Hook
 *
 * 支持的快捷键：
 * - Delete / Backspace: 删除选中的块（在非输入状态下）
 * - Escape: 取消选择
 * - Ctrl/⌘ + S: 保存（localStorage 自动保存 + 标记已保存）
 * - Ctrl/⌘ + D: 克隆选中块
 */
export function useKeyboardShortcuts() {
  const { editor, clearSelection } = useResumeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace 删除选中块
      if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedBlockId) {
        // 确保不在输入框中
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        const { removeBlock, removeBlocks } = useResumeStore.getState();
        if (editor.selectedBlockIds.length > 1) {
          removeBlocks(editor.selectedBlockIds);
        } else if (editor.selectedBlockId) {
          removeBlock(editor.selectedBlockId);
        }
      }

      // Escape 取消选择
      if (e.key === 'Escape') {
        clearSelection();
      }

      // Ctrl+S 保存
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // 同时保存到 localStorage 和标记已保存
        saveToLocalStorage();
        const { markSaved } = useResumeStore.getState();
        markSaved();
      }

      // Ctrl+D 克隆
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (editor.selectedBlockId) {
          const { cloneBlock } = useResumeStore.getState();
          cloneBlock(editor.selectedBlockId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor.selectedBlockId, editor.selectedBlockIds, clearSelection]);
}

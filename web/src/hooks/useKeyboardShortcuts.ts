import { useEffect } from 'react';
import { useResumeStore } from '@/store';
import { saveToLocalStorage } from '@/hooks/useAutoSave';

/**
 * 编辑器全局键盘快捷键 Hook
 *
 * 支持的快捷键：
 * - Arrow Keys: 移动选中元素或分组（Shift 加速10px）
 * - Delete / Backspace: 删除选中的块（在非输入状态下）
 * - Escape: 取消选择
 * - Ctrl/⌘ + S: 保存（localStorage 自动保存 + 标记已保存）
 * - Ctrl/⌘ + D: 克隆选中块
 * - Ctrl/⌘ + Z: 撤销
 * - Ctrl/⌘ + Shift + Z / Ctrl/⌘ + Y: 重做
 */
export function useKeyboardShortcuts() {
  const { editor, clearSelection } = useResumeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 确保不在输入框中
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // 方向键移动选中元素或分组
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInput) {
        const hasSelection = editor.selectedBlockId || editor.selectedBlockIds.length > 0;
        if (hasSelection) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;

          const state = useResumeStore.getState();
          const { resume, updateBlockPosition, updateGroupPosition } = state;
          if (!resume) return;

          // 如果选中了分组，移动整个分组
          if (editor.selectedGroupId) {
            updateGroupPosition(editor.selectedGroupId, dx, dy);
            // 刷新距离标注
            const groupId = editor.selectedGroupId;
            const group = resume.groups.find((g) => g.id === groupId);
            if (group && group.blockIds.length > 0) {
              state.refreshDistancesForBlock(group.blockIds[0]);
            }
          } else {
            // 移动选中的块（支持多选）
            const blockIds = editor.selectedBlockIds.length > 0
              ? editor.selectedBlockIds
              : editor.selectedBlockId ? [editor.selectedBlockId] : [];
            for (const blockId of blockIds) {
              const block = resume.blocks.find((b) => b.id === blockId);
              if (block) {
                updateBlockPosition(blockId, block.x + dx, block.y + dy);
              }
            }
            // 刷新距离标注（以第一个选中的块为基准）
            if (blockIds.length > 0) {
              state.refreshDistancesForBlock(blockIds[0]);
            }
          }
        }
      }

      // Delete/Backspace 删除选中块
      if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedBlockId) {
        if (isInput) return;
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

      // Ctrl+Z 撤销 / Ctrl+Shift+Z / Ctrl+Y 重做
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const { undo, redo } = useResumeStore.getState();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      // Ctrl+Y 重做（Windows 风格）
      if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const { redo } = useResumeStore.getState();
        redo();
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
  }, [editor.selectedBlockId, editor.selectedBlockIds, editor.selectedGroupId, clearSelection]);
}

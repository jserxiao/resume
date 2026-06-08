import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Toolbar from '@/components/Toolbar';
import LeftPanel from '@/components/LeftPanel';
import EditorCanvas from '@/components/EditorCanvas';
import RightPanel from '@/components/RightPanel';
import PreviewDrawer from '@/components/PreviewDrawer';
import { useResumeStore } from '@/store';
import '@/App.less';

/**
 * 编辑器页面
 * 路由：/editor
 * 布局：[左侧面板: 块模板] [中间: 编辑画布] [右侧: 属性面板] + 预览抽屉
 */
export default function EditorPage() {
  const navigate = useNavigate();
  const { resume, editor, selectBlock, addToSelection, clearSelection } = useResumeStore();

  // 如果没有简历数据，重定向到首页
  useEffect(() => {
    if (!resume) {
      navigate('/', { replace: true });
    }
  }, [resume, navigate]);

  // 全局键盘事件
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

  if (!resume) return null;

  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        <LeftPanel />
        <EditorCanvas />
        <RightPanel />
      </div>
      <PreviewDrawer />
    </div>
  );
}

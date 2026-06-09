import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Toolbar from '@/components/Toolbar';
import LeftPanel from '@/components/LeftPanel';
import EditorCanvas from '@/components/EditorCanvas';
import RightPanel from '@/components/RightPanel';
import PreviewDrawer from '@/components/PreviewDrawer';
import { useResumeStore } from '@/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import '@/App.less';

/**
 * 编辑器页面
 * 路由：/editor
 * 布局：[左侧面板: 块模板] [中间: 编辑画布] [右侧: 属性面板] + 预览抽屉
 */
export default function EditorPage() {
  const navigate = useNavigate();
  const { resume } = useResumeStore();

  // 如果没有简历数据，重定向到首页
  useEffect(() => {
    if (!resume) {
      navigate('/', { replace: true });
    }
  }, [resume, navigate]);

  // 全局键盘快捷键
  useKeyboardShortcuts();

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

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from 'antd';
import Toolbar from '@/components/Toolbar';
import LeftPanel from '@/components/LeftPanel';
import EditorCanvas from '@/components/EditorCanvas';
import RightPanel from '@/components/RightPanel';
import PreviewDrawer from '@/components/PreviewDrawer';
import { useResumeStore } from '@/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoSave, restoreFromLocalStorage, getAutoSaveTimestamp, clearLocalStorage } from '@/hooks/useAutoSave';
import '@/App.less';

/**
 * 编辑器页面
 * 路由：/editor
 * 布局：[左侧面板: 块模板] [中间: 编辑画布] [右侧: 属性面板] + 预览抽屉
 * 
 * 自动保存功能：
 * - 页面加载时从 localStorage 恢复数据
 * - 定时自动保存到 localStorage
 * - 页面关闭前自动保存
 */
export default function EditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resume, initResume } = useResumeStore();
  const { manualSave } = useAutoSave();

  // 全局键盘快捷键
  useKeyboardShortcuts();

  // 如果没有简历数据，尝试从 localStorage 恢复
  useEffect(() => {
    if (resume) return;

    // 尝试从 localStorage 恢复
    const restored = restoreFromLocalStorage();
    if (restored) {
      const timestamp = getAutoSaveTimestamp();
      const timeStr = timestamp ? new Date(timestamp).toLocaleString() : '未知时间';
      Modal.info({
        title: '已恢复自动保存的数据',
        content: `您的简历数据已于 ${timeStr} 自动保存，现已恢复。`,
        okText: '知道了',
      });
    } else {
      // 没有可恢复的数据，重定向到首页
      navigate('/', { replace: true });
    }
  }, [resume, navigate]);

  if (!resume) return null;

  return (
    <div className="app">
      <Toolbar onSave={manualSave} />
      <div className="app-body">
        <LeftPanel />
        <EditorCanvas />
        <RightPanel />
      </div>
      <PreviewDrawer />
    </div>
  );
}

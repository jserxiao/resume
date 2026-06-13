import { useEffect, useRef } from 'react';
import { App } from 'antd';
import Toolbar from '@/components/Toolbar';
import LeftPanel from '@/components/LeftPanel';
import EditorCanvas from '@/components/EditorCanvas';
import RightPanel from '@/components/RightPanel';
import PreviewDrawer from '@/components/PreviewDrawer';
import { useResumeStore } from '@/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoSave, restoreFromLocalStorage, getAutoSaveTimestamp } from '@/hooks/useAutoSave';
import { presetColorSchemes } from '@/utils/presets';
import '@/App.less';

/**
 * 编辑器页面（首页）
 * 路由：/
 * 布局：[左侧面板: 块模板] [中间: 编辑画布] [右侧: 属性面板] + 悬浮图层面板 + 预览抽屉
 *
 * 自动保存功能：
 * - 页面加载时从 localStorage 恢复数据
 * - 定时自动保存到 localStorage
 * - 页面关闭前自动保存
 */
export default function EditorPage() {
  const { resume, initResume } = useResumeStore();
  const { manualSave } = useAutoSave();
  const { modal } = App.useApp();

  // 防止 modal 重复弹出（React StrictMode 双重执行 effect）
  const restoreModalShownRef = useRef(false);

  // 全局键盘快捷键
  useKeyboardShortcuts();

  // 如果没有简历数据，尝试恢复或自动创建
  useEffect(() => {
    if (resume) return;
    if (restoreModalShownRef.current) return;
    restoreModalShownRef.current = true;

    // 尝试从 localStorage 恢复
    const restored = restoreFromLocalStorage();
    if (restored) {
      // 恢复成功后标记为已保存，避免 beforeunload 弹出未保存提示
      useResumeStore.getState().markSaved();

      const timestamp = getAutoSaveTimestamp();
      const timeStr = timestamp ? new Date(timestamp).toLocaleString() : '未知时间';
      modal.info({
        title: '已恢复自动保存的数据',
        content: `您的简历数据已于 ${timeStr} 自动保存，现已恢复。`,
        okText: '知道了',
      });
    } else {
      // 没有可恢复的数据，自动创建默认简历
      initResume('我的简历', presetColorSchemes[0]);
    }
  }, [resume, initResume, modal]);

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

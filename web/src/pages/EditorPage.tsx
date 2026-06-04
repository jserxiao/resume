import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import Toolbar from '@/components/Toolbar';
import LeftPanel from '@/components/LeftPanel';
import EditorCanvas from '@/components/EditorCanvas';
import PreviewDrawer from '@/components/PreviewDrawer';
import { useResumeStore } from '@/store';
import '@/App.less';

/**
 * 编辑器页面
 * 路由：/editor
 * 布局：[左侧面板: 块模板] [中间: 编辑画布] + 预览抽屉
 */
export default function EditorPage() {
  const navigate = useNavigate();
  const { resume, editor, reorderBlocks } = useResumeStore();

  // 如果没有简历数据，重定向到首页
  useEffect(() => {
    if (!resume) {
      navigate('/', { replace: true });
    }
  }, [resume, navigate]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  if (!resume) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderBlocks(String(active.id), String(over.id));
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      <div className="app">
        <Toolbar />
        <div className="app-body">
          <LeftPanel />
          <EditorCanvas />
        </div>
        <PreviewDrawer />
      </div>
    </DndContext>
  );
}

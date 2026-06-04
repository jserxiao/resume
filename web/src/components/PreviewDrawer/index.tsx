import { Drawer } from 'antd';
import { useResumeStore } from '@/store';
import EditorCanvas from '@/components/EditorCanvas';

/**
 * 预览抽屉 - 点击 Toolbar 的"预览"按钮弹出
 * 直接复用 EditorCanvas(mode=preview)，保证预览与编辑区完全一致
 */
export default function PreviewDrawer() {
  const { editor, setPreviewOpen } = useResumeStore();

  return (
    <Drawer
      title="简历预览"
      placement="right"
      size={860}
      open={editor.previewOpen}
      onClose={() => setPreviewOpen(false)}
      styles={{
        body: { padding: 0, overflow: 'auto', background: '#f5f6fa' },
      }}
    >
      <EditorCanvas mode="preview" />
    </Drawer>
  );
}

import { Drawer } from 'antd';
import { useResumeStore } from '@/store';
import EditorCanvas from '@/components/EditorCanvas';
import './index.less';

/**
 * 预览抽屉 - 点击 Toolbar 的"预览"按钮弹出
 * 直接复用 EditorCanvas(mode=preview)，保证预览与编辑区完全一致
 */
export default function PreviewDrawer() {
  const { editor, setPreviewOpen, resume } = useResumeStore();

  if (!resume) return null;

  return (
    <Drawer
      title="简历预览"
      placement="right"
      width={860}
      open={editor.previewOpen}
      onClose={() => setPreviewOpen(false)}
      styles={{
        body: { padding: 0, overflow: 'auto', background: '#e5e7eb', position: 'relative' },
        wrapper: {},
      }}
      zIndex={10000}
    >
      <div
        className="preview-drawer-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '24px',
          minHeight: '100%',
        }}
      >
        <EditorCanvas mode="preview" />
      </div>
    </Drawer>
  );
}

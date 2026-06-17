import { Button, Tooltip, Switch, Popover } from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  BorderOutlined,
  AppstoreAddOutlined,
  BgColorsOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import ExportMenu from '@/components/ExportMenu';
import ColorSchemePanel from '@/components/RightPanel/ColorSchemePanel';
import './index.less';

interface ToolbarProps {
  /** 手动保存回调（自动保存 Hook 提供） */
  onSave?: () => void;
}

export default function Toolbar({ onSave }: ToolbarProps) {
  const { resume, editor, markSaved, setPreviewOpen, setShowAlignGuides, setSnapToGrid, canUndo, canRedo, undo, redo } = useResumeStore();

  if (!resume) return null;

  const handleSave = () => {
    // 先调用外部保存回调（localStorage 自动保存）
    if (onSave) onSave();
    // 再标记为已保存
    markSaved();
  };

  const saveStatus = resume.lastSavedAt
    ? `已保存于 ${new Date(resume.lastSavedAt).toLocaleTimeString()}`
    : '未保存';

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-title">{resume.title}</span>
        <span className="toolbar-save-status">{saveStatus}</span>
      </div>

      <div className="toolbar-center">
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            type="text"
            icon={<UndoOutlined />}
            disabled={!canUndo}
            onClick={undo}
          />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Shift+Z)">
          <Button
            type="text"
            icon={<RedoOutlined />}
            disabled={!canRedo}
            onClick={redo}
          />
        </Tooltip>
        <Tooltip title="对齐辅助线">
          <div className="toolbar-toggle">
            <BorderOutlined />
            <Switch
              size="small"
              checked={editor.showAlignGuides}
              onChange={setShowAlignGuides}
            />
          </div>
        </Tooltip>
        <Tooltip title="吸附网格">
          <div className="toolbar-toggle">
            <AppstoreAddOutlined />
            <Switch
              size="small"
              checked={editor.snapToGrid}
              onChange={setSnapToGrid}
            />
          </div>
        </Tooltip>
      </div>

      <div className="toolbar-right">
        <Tooltip title="预览简历效果">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => setPreviewOpen(true)}
          >
            预览
          </Button>
        </Tooltip>
        {/* 配色方案按钮 */}
        <Popover
          trigger="click"
          placement="bottomRight"
          overlayClassName="toolbar-color-scheme-popover"
          content={<ColorSchemePanel />}
        >
          <Tooltip title="配色方案">
            <Button type="text" icon={<BgColorsOutlined />}>
              配色
            </Button>
          </Tooltip>
        </Popover>
        <Tooltip title="保存 (Ctrl+S)">
          <Button type="text" icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>
        </Tooltip>
        <ExportMenu />
      </div>
    </div>
  );
}

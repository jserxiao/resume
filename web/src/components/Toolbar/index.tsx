import { useNavigate } from 'react-router-dom';
import { Button, Tooltip, Divider, Switch } from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
  BorderOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import ExportMenu from '@/components/ExportMenu';
import './index.less';

export default function Toolbar() {
  const navigate = useNavigate();
  const { resume, editor, markSaved, clearResume, setPreviewOpen, setShowAlignGuides, setSnapToGrid } = useResumeStore();

  if (!resume) return null;

  const handleBack = () => {
    clearResume();
    navigate('/');
  };

  const saveStatus = resume.lastSavedAt
    ? `已保存于 ${new Date(resume.lastSavedAt).toLocaleTimeString()}`
    : '未保存';

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          className="toolbar-back-btn"
        >
          返回
        </Button>
        <Divider orientation="vertical" />
        <span className="toolbar-title">{resume.title}</span>
        <span className="toolbar-save-status">{saveStatus}</span>
      </div>

      <div className="toolbar-center">
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
        <Tooltip title="保存 (Ctrl+S)">
          <Button type="text" icon={<SaveOutlined />} onClick={markSaved}>
            保存
          </Button>
        </Tooltip>
        <ExportMenu />
      </div>
    </div>
  );
}

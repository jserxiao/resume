import { InputNumber, Divider, Button, Select } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import type { Resume } from '@/types';
import { CANVAS_DEFAULT_WIDTH, CANVAS_DEFAULT_HEIGHT, CANVAS_DEFAULT_PADDING, CANVAS_DEFAULT_BACKGROUND } from '@/utils/constants';
import { buildDecoPathD } from '@/utils/geometry';
import ColorFieldInput from '@/components/shared/ColorFieldInput';
import ImageUploadField from '@/components/shared/ImageUploadField';

interface CanvasLayoutPanelProps {
  resume: Resume;
}

/**
 * 画布布局设置面板
 * 包含：画布尺寸、页面规格预设、内边距、背景颜色、背景图片、重置
 */
export default function CanvasLayoutPanel({ resume }: CanvasLayoutPanelProps) {
  const { setCanvasConfig } = useResumeStore();

  return (
    <div className="right-panel-content">
      <div className="right-panel-section-title">📐 画布设置</div>

      {/* 画布尺寸 */}
      <div className="right-panel-section-title" style={{ fontSize: 12 }}>尺寸</div>
      <div className="right-panel-position-grid">
        <div className="right-panel-field compact">
          <label className="right-panel-label">宽</label>
          <InputNumber
            value={resume.canvas.width}
            onChange={(val) => val !== null && setCanvasConfig({ width: val })}
            size="small"
            style={{ width: '100%' }}
            step={1}
            min={400}
          />
        </div>
        <div className="right-panel-field compact">
          <label className="right-panel-label">高</label>
          <InputNumber
            value={resume.canvas.height}
            onChange={(val) => val !== null && setCanvasConfig({ height: val })}
            size="small"
            style={{ width: '100%' }}
            step={1}
            min={400}
          />
        </div>
      </div>

      {/* 快捷预设 */}
      <div className="right-panel-field">
        <label className="right-panel-label">页面规格</label>
        <Select
          value={`${resume.canvas.width}x${resume.canvas.height}`}
          onChange={(val) => {
            const [w, h] = val.split('x').map(Number);
            setCanvasConfig({ width: w, height: h });
          }}
          size="small"
          style={{ width: '100%' }}
          options={[
            { label: 'A4 (794×1123)', value: '794x1123' },
            { label: 'A4 横向 (1123×794)', value: '1123x794' },
            { label: 'Letter (816×1056)', value: '816x1056' },
            { label: '16:9 (794×447)', value: '794x447' },
          ]}
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 画布内边距 */}
      <div className="right-panel-section-title" style={{ fontSize: 12 }}>内边距</div>
      <div className="right-panel-field compact">
        <label className="right-panel-label">四周</label>
        <InputNumber
          value={resume.canvas.padding}
          onChange={(val) => val !== null && setCanvasConfig({ padding: val })}
          size="small"
          style={{ width: '100%' }}
          step={1}
          min={0}
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 画布背景 */}
      <div className="right-panel-section-title" style={{ fontSize: 12 }}><BgColorsOutlined /> 背景</div>
      <div className="right-panel-field">
        <label className="right-panel-label">背景颜色</label>
        <ColorFieldInput
          value={resume.canvas.background || '#ffffff'}
          onChange={(hex) => setCanvasConfig({ background: hex })}
          placeholder="#ffffff"
        />
      </div>

      <div className="right-panel-field">
        <label className="right-panel-label">背景图片</label>
        <ImageUploadField
          value={resume.canvas.backgroundImage || ''}
          onChange={(val) => setCanvasConfig({ backgroundImage: val || undefined })}
          uploadText="上传背景图片"
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 重置按钮 */}
      <Button
        size="small"
        onClick={() => setCanvasConfig({
          width: CANVAS_DEFAULT_WIDTH,
          height: CANVAS_DEFAULT_HEIGHT,
          padding: CANVAS_DEFAULT_PADDING,
          background: CANVAS_DEFAULT_BACKGROUND,
          backgroundImage: undefined,
          backgroundSize: undefined,
        })}
        style={{ width: '100%' }}
      >
        重置为默认画布
      </Button>

      <Divider style={{ margin: '8px 0' }} />

      {/* 自定义装饰元素 */}
      <div className="right-panel-section-title">⭐ 自定义装饰</div>
      <CanvasCustomDecorationSection />
    </div>
  );
}

/** 画布设置面板中的自定义装饰区域 */
function CanvasCustomDecorationSection() {
  const navigate = (window as any).__navigate || (() => {});
  // 使用 useNavigate 需要在组件内调用，这里改用 store 中的 navigate 引用
  // 由于 RightPanel 已经有 navigate，这里直接引用
  const { customDecorations, removeCustomDecoration } = useResumeStore();

  return (
    <>
      <Button
        size="small"
        icon={<span>⭐</span>}
        onClick={() => {
          // navigate 需要通过 Router context 获取，这里通过 window 临时传递
          if ((window as any).__navigate) {
            (window as any).__navigate('/decoration-editor');
          }
        }}
        style={{ width: '100%' }}
      >
        创建自定义装饰
      </Button>
      {customDecorations.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {customDecorations.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <svg width="20" height="20" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                {d.paths.map((p, pIdx) => (
                  <path
                    key={pIdx}
                    d={buildDecoPathD(p.anchors, p.isClosed)}
                    fill={p.isClosed ? p.fillColor : 'none'}
                    stroke={p.strokeColor}
                    strokeWidth={3}
                  />
                ))}
              </svg>
              <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              <Button
                type="text"
                size="small"
                icon={<span>✏️</span>}
                onClick={() => {
                  if ((window as any).__navigate) {
                    (window as any).__navigate(`/decoration-editor?id=${d.id}`);
                  }
                }}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<span>🗑</span>}
                onClick={() => removeCustomDecoration(d.id)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

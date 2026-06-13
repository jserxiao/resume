import { InputNumber, Input, Divider, Button, Select, Switch, Slider } from 'antd';
import { BgColorsOutlined, LayoutOutlined, StarOutlined, PlusOutlined, EditOutlined, DeleteOutlined, FontSizeOutlined } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import type { Resume, WatermarkConfig } from '@/types';
import {
  CANVAS_DEFAULT_WIDTH,
  CANVAS_DEFAULT_HEIGHT,
  CANVAS_DEFAULT_PADDING,
  CANVAS_DEFAULT_BACKGROUND,
  WATERMARK_DEFAULT_TEXT,
  WATERMARK_DEFAULT_FONT_SIZE,
  WATERMARK_DEFAULT_ROTATION,
  WATERMARK_DEFAULT_COLOR,
  WATERMARK_DEFAULT_OPACITY,
  WATERMARK_DEFAULT_GAP_X,
  WATERMARK_DEFAULT_GAP_Y,
} from '@/utils/constants';
import { buildDecoPathD } from '@/utils/geometry';
import ColorFieldInput from '@/components/shared/ColorFieldInput';
import ImageUploadField from '@/components/shared/ImageUploadField';

interface CanvasLayoutPanelProps {
  resume: Resume;
  navigate: (path: string) => void;
}

/**
 * 画布布局设置面板
 * 包含：画布尺寸、页面规格预设、内边距、背景颜色、背景图片、水印、重置
 */
export default function CanvasLayoutPanel({ resume, navigate }: CanvasLayoutPanelProps) {
  const { setCanvasConfig } = useResumeStore();

  const watermark = resume.canvas.watermark;
  const isWatermarkEnabled = !!watermark;

  /** 更新水印配置（局部更新） */
  const updateWatermark = (updates: Partial<WatermarkConfig>) => {
    if (!watermark) return;
    setCanvasConfig({ watermark: { ...watermark, ...updates } });
  };

  /** 启用水印 */
  const enableWatermark = () => {
    setCanvasConfig({
      watermark: {
        text: WATERMARK_DEFAULT_TEXT || '水印文字',
        fontSize: WATERMARK_DEFAULT_FONT_SIZE,
        rotation: WATERMARK_DEFAULT_ROTATION,
        color: WATERMARK_DEFAULT_COLOR,
        opacity: WATERMARK_DEFAULT_OPACITY,
        gapX: WATERMARK_DEFAULT_GAP_X,
        gapY: WATERMARK_DEFAULT_GAP_Y,
      },
    });
  };

  /** 禁用水印 */
  const disableWatermark = () => {
    setCanvasConfig({ watermark: undefined });
  };

  return (
    <div className="right-panel-content">
      <div className="right-panel-section-title"><LayoutOutlined /> 画布设置</div>

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
          value={resume.canvas.background || CANVAS_DEFAULT_BACKGROUND}
          onChange={(hex) => setCanvasConfig({ background: hex })}
          placeholder={CANVAS_DEFAULT_BACKGROUND}
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

      {/* 水印设置 */}
      <div className="right-panel-section-title" style={{ fontSize: 12 }}><FontSizeOutlined /> 水印</div>
      <div className="right-panel-field">
        <label className="right-panel-label">启用水印&nbsp;
            <Switch
                size="small"
                checked={isWatermarkEnabled}
                onChange={(checked) => checked ? enableWatermark() : disableWatermark()}
            />
        </label>
        
      </div>

      {isWatermarkEnabled && watermark && (
        <>
          <div className="right-panel-field">
            <label className="right-panel-label">文字内容</label>
            <Input
              value={watermark.text}
              onChange={(e) => updateWatermark({ text: e.target.value })}
              size="small"
              style={{ width: '100%' }}
              placeholder="请输入水印文字"
            />
          </div>

          <div className="right-panel-position-grid">
            <div className="right-panel-field compact">
              <label className="right-panel-label">字号</label>
              <InputNumber
                value={watermark.fontSize}
                onChange={(val) => val !== null && updateWatermark({ fontSize: val })}
                size="small"
                style={{ width: '100%' }}
                min={8}
                max={72}
                step={1}
              />
            </div>
            <div className="right-panel-field compact">
              <label className="right-panel-label">旋转</label>
              <InputNumber
                value={watermark.rotation}
                onChange={(val) => val !== null && updateWatermark({ rotation: val })}
                size="small"
                style={{ width: '100%' }}
                min={-90}
                max={90}
                step={1}
                addonAfter="°"
              />
            </div>
          </div>

          <div className="right-panel-position-grid">
            <div className="right-panel-field compact">
              <label className="right-panel-label">水平间距</label>
              <InputNumber
                value={watermark.gapX}
                onChange={(val) => val !== null && updateWatermark({ gapX: val })}
                size="small"
                style={{ width: '100%' }}
                min={40}
                max={400}
                step={10}
              />
            </div>
            <div className="right-panel-field compact">
              <label className="right-panel-label">垂直间距</label>
              <InputNumber
                value={watermark.gapY}
                onChange={(val) => val !== null && updateWatermark({ gapY: val })}
                size="small"
                style={{ width: '100%' }}
                min={30}
                max={300}
                step={10}
              />
            </div>
          </div>

          <div className="right-panel-field">
            <label className="right-panel-label">颜色</label>
            <ColorFieldInput
              value={watermark.color}
              onChange={(hex) => updateWatermark({ color: hex })}
              placeholder="rgba(0,0,0,0.08)"
            />
          </div>

          <div className="right-panel-field">
            <label className="right-panel-label">透明度</label>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={watermark.opacity}
              onChange={(val) => updateWatermark({ opacity: val })}
            />
          </div>
        </>
      )}

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
          watermark: undefined,
        })}
        style={{ width: '100%' }}
      >
        重置为默认画布
      </Button>

      <Divider style={{ margin: '8px 0' }} />

      {/* 自定义装饰元素 */}
      <div className="right-panel-section-title"><StarOutlined /> 自定义装饰</div>
      <CanvasCustomDecorationSection navigate={navigate} />
    </div>
  );
}

/** 画布设置面板中的自定义装饰区域 */
function CanvasCustomDecorationSection({ navigate }: { navigate: (path: string) => void }) {
  const { customDecorations, removeCustomDecoration } = useResumeStore();

  return (
    <>
      <Button
        size="small"
        icon={<PlusOutlined />}
        onClick={() => navigate('/decoration-editor')}
        style={{ width: '100%' }}
      >
        创建自定义装饰
      </Button>
      {customDecorations.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {customDecorations.map((d) => {
            const dw = d.stageWidth || 100;
            const dh = d.stageHeight || 100;
            const maxThumb = 20;
            const thumbScale = maxThumb / Math.max(dw, dh);
            const tw = Math.max(8, Math.round(dw * thumbScale));
            const th = Math.max(8, Math.round(dh * thumbScale));
            return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <svg width={tw} height={th} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ flexShrink: 0 }}>
                {d.paths.map((p, pIdx) => (
                  <g key={pIdx}>
                    {p.clipRect && (
                      <defs>
                        <clipPath id={`thumb-clip-${d.id}-${pIdx}`}>
                          <rect x={p.clipRect.x} y={p.clipRect.y} width={p.clipRect.width} height={p.clipRect.height} />
                        </clipPath>
                      </defs>
                    )}
                    <g clipPath={p.clipRect ? `url(#thumb-clip-${d.id}-${pIdx})` : undefined}>
                      {p.isClosed && (
                        <path
                          d={buildDecoPathD(p.anchors, p.isClosed)}
                          fill={p.fillColor}
                          stroke="none"
                        />
                      )}
                      {p.edgeColors && p.edgeColors.some((c, i) => c && c !== p.strokeColor) ? (
                        // 逐边着色缩略图
                        (() => {
                          const n = p.anchors.length;
                          const edgeCount = p.isClosed ? n : n - 1;
                          const segments: React.ReactNode[] = [];
                          for (let i = 0; i < edgeCount; i++) {
                            const from = p.anchors[i];
                            const to = p.anchors[(i + 1) % n];
                            const control = from.handleOut || to.handleIn;
                            let segD = `M ${from.x} ${from.y}`;
                            if (control) {
                              segD += ` Q ${control.x} ${control.y} ${to.x} ${to.y}`;
                            } else {
                              segD += ` L ${to.x} ${to.y}`;
                            }
                            segments.push(
                              <path
                                key={`edge-${i}`}
                                d={segD}
                                fill="none"
                                stroke={p.edgeColors[i] || p.strokeColor}
                                strokeWidth={3}
                              />
                            );
                          }
                          return segments;
                        })()
                      ) : (
                        <path
                          d={buildDecoPathD(p.anchors, p.isClosed)}
                          fill="none"
                          stroke={p.strokeColor}
                          strokeWidth={3}
                        />
                      )}
                    </g>
                  </g>
                ))}
              </svg>
              <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/decoration-editor?id=${d.id}`)}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeCustomDecoration(d.id)}
              />
            </div>
            );
          })}
        </div>
      )}
    </>
  );
}

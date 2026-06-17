import { InputNumber, Input, Divider, Button, Select, Switch, Slider } from 'antd';
import { BgColorsOutlined, LayoutOutlined, FontSizeOutlined, FormOutlined } from '@ant-design/icons';
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
import ColorFieldInput from '@/components/shared/ColorFieldInput';
import ImageUploadField from '@/components/shared/ImageUploadField';

interface CanvasLayoutPanelProps {
  resume: Resume;
}

/**
 * 画布布局设置面板
 * 包含：画布尺寸、页面规格预设、内边距、背景颜色、背景图片、水印、重置
 */
export default function CanvasLayoutPanel({ resume }: CanvasLayoutPanelProps) {
  const { setCanvasConfig, setResumeTitle } = useResumeStore();

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
      {/* 简历标题设置 */}
      <div className="right-panel-section-title"><FormOutlined /> 标题</div>
      <div className="right-panel-field">
        <Input
          value={resume.title}
          onChange={(e) => setResumeTitle(e.target.value)}
          size="small"
          placeholder="请输入简历标题"
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

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

      {/* 自动分页 */}
      <div className="right-panel-field">
        <label className="right-panel-label">每页高度</label>
        <InputNumber
          value={resume.canvas.pageHeight || resume.canvas.height}
          onChange={(val) => {
            if (val !== null) {
              // 当值等于画布高度时，清除 pageHeight（使用默认值）
              setCanvasConfig({ pageHeight: val === resume.canvas.height ? undefined : val });
            }
          }}
          size="small"
          style={{ width: '100%' }}
          step={1}
          min={200}
          max={5000}
          addonAfter="px"
        />
      </div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 4, lineHeight: 1.4 }}>
        内容超过此高度时自动分页，默认等于画布高度
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
          pageHeight: undefined,
        })}
        style={{ width: '100%' }}
      >
        重置为默认画布
      </Button>

    </div>
  );
}


import { InputNumber, Slider, Divider, Select, ColorPicker } from 'antd';
import { RotateRightOutlined, BorderOutlined, BgColorsOutlined } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import type { BlockInstance } from '@/types';
import { BLOCK_DEFAULT_MARGIN, BLOCK_DEFAULT_PADDING, DEFAULT_BORDER_COLOR, BLOCK_DEFAULT_BORDER_RADIUS } from '@/utils/constants';
import ColorFieldInput from '@/components/shared/ColorFieldInput';
import SidesInput from '@/components/shared/SidesInput';
import ImageUploadField from '@/components/shared/ImageUploadField';

interface BlockLayoutPanelProps {
  block: BlockInstance;
  /** 是否为图标块——图标块不需要背景配置 */
  isIconBlock?: boolean;
}

/**
 * 块布局编辑面板
 * 包含：位置、尺寸、层级、旋转、外边距、内边距、背景、透明度、圆角、边框
 */
export default function BlockLayoutPanel({ block, isIconBlock }: BlockLayoutPanelProps) {
  const { updateBlockPosition, updateBlockSize, updateBlockZIndex, updateBlockRotation, updateBlockStyle } = useResumeStore();

  return (
    <div className="right-panel-content">
      {/* 位置 */}
      <div className="right-panel-section-title">位置</div>
      <div className="right-panel-position-grid">
        <div className="right-panel-field compact">
          <label className="right-panel-label">X</label>
          <InputNumber
            value={Math.round(block.x)}
            onChange={(val) => val !== null && updateBlockPosition(block.id, val, block.y)}
            size="small"
            style={{ width: '100%' }}
            step={1}
          />
        </div>
        <div className="right-panel-field compact">
          <label className="right-panel-label">Y</label>
          <InputNumber
            value={Math.round(block.y)}
            onChange={(val) => val !== null && updateBlockPosition(block.id, block.x, val)}
            size="small"
            style={{ width: '100%' }}
            step={1}
          />
        </div>
      </div>

      {/* 图标块的尺寸由字号自动驱动，不需要手动设置 */}
      {!isIconBlock && (
        <>
          {/* 尺寸 */}
          <div className="right-panel-section-title">尺寸</div>
          <div className="right-panel-position-grid">
            <div className="right-panel-field compact">
              <label className="right-panel-label">宽</label>
              <InputNumber
                value={Math.round(block.width)}
                onChange={(val) => val !== null && updateBlockSize(block.id, val, block.height)}
                size="small"
                style={{ width: '100%' }}
                min={50}
                step={1}
              />
            </div>
            <div className="right-panel-field compact">
              <label className="right-panel-label">高</label>
              <InputNumber
                value={Math.round(block.height)}
                onChange={(val) => val !== null && updateBlockSize(block.id, block.width, val)}
                size="small"
                style={{ width: '100%' }}
                min={30}
                step={1}
              />
            </div>
          </div>
        </>
      )}

      {/* 层级 */}
      <div className="right-panel-field compact">
        <label className="right-panel-label">层级</label>
        <InputNumber
          value={block.zIndex}
          onChange={(val) => val !== null && updateBlockZIndex(block.id, val)}
          size="small"
          style={{ width: '100%' }}
          min={0}
          step={1}
        />
      </div>

      {/* 旋转 */}
      <div className="right-panel-section-title"><RotateRightOutlined /> 旋转</div>
      <div className="right-panel-field">
        <Slider
          value={block.rotation || 0}
          onChange={(val) => updateBlockRotation(block.id, val)}
          min={-180}
          max={180}
          step={1}
          marks={{ '-180': '-180°', '-90': '-90°', 0: '0°', 90: '90°', 180: '180°' }}
        />
      </div>
      <div className="right-panel-field compact">
        <label className="right-panel-label">角度</label>
        <InputNumber
          value={block.rotation || 0}
          onChange={(val) => updateBlockRotation(block.id, val ?? 0)}
          size="small"
          style={{ width: '100%' }}
          min={-360}
          max={360}
          step={1}
          suffix="°"
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 外边距 */}
      <div className="right-panel-section-title"><BorderOutlined /> 外边距</div>
      <SidesInput
        value={block.style?.margin || BLOCK_DEFAULT_MARGIN}
        onChange={(val) => updateBlockStyle(block.id, { margin: val })}
        defaultValue={BLOCK_DEFAULT_MARGIN}
      />

      {/* 内边距 */}
      <div className="right-panel-section-title">内边距</div>
      <SidesInput
        value={block.style?.padding || BLOCK_DEFAULT_PADDING}
        onChange={(val) => updateBlockStyle(block.id, { padding: val })}
        defaultValue={BLOCK_DEFAULT_PADDING}
      />

      {/* 图标块不需要背景配置 */}
      {!isIconBlock && (
        <>
          <Divider style={{ margin: '8px 0' }} />

          {/* 背景颜色 */}
          <div className="right-panel-section-title"><BgColorsOutlined /> 背景</div>
          <div className="right-panel-field">
            <label className="right-panel-label">背景颜色</label>
            <ColorFieldInput
              value={block.style?.backgroundColor || ''}
              onChange={(hex) => updateBlockStyle(block.id, { backgroundColor: hex })}
              placeholder="跟随主题"
              allowClear
              onClear={() => updateBlockStyle(block.id, { backgroundColor: '' })}
            />
          </div>

          {/* 文字颜色 */}
          <div className="right-panel-field">
            <label className="right-panel-label">文字颜色</label>
            <ColorFieldInput
              value={block.style?.color || ''}
              onChange={(hex) => updateBlockStyle(block.id, { color: hex })}
              placeholder="跟随主题"
              allowClear
              onClear={() => updateBlockStyle(block.id, { color: '' })}
            />
          </div>

          {/* 背景图片 */}
          <div className="right-panel-field">
            <label className="right-panel-label">背景图片</label>
            <ImageUploadField
              value={block.style?.backgroundImage || ''}
              onChange={(val) => updateBlockStyle(block.id, { backgroundImage: val })}
              uploadText="上传背景图片"
            />
          </div>
        </>
      )}

      {/* 透明度 */}
      <div className="right-panel-field">
        <label className="right-panel-label">透明度</label>
        <Slider
          value={block.style?.opacity ?? 1}
          onChange={(val) => updateBlockStyle(block.id, { opacity: val })}
          min={0}
          max={1}
          step={0.05}
        />
      </div>

      {/* 图标块不需要圆角和边框配置 */}
      {!isIconBlock && (
        <>
          {/* 圆角 */}
          <div className="right-panel-field compact">
            <label className="right-panel-label">圆角</label>
            <InputNumber
              value={block.style?.borderRadius ?? BLOCK_DEFAULT_BORDER_RADIUS}}
              onChange={(val) => updateBlockStyle(block.id, { borderRadius: val ?? 0 })}
              size="small"
              style={{ width: '100%' }}
              min={0}
              step={1}
            />
          </div>

          {/* 边框 */}
          <div className="right-panel-border-row">
            <div className="right-panel-field compact" style={{ flex: 1 }}>
              <label className="right-panel-label">边框宽</label>
              <InputNumber
                value={block.style?.borderWidth ?? 0}
                onChange={(val) => updateBlockStyle(block.id, { borderWidth: val ?? 0 })}
                size="small"
                style={{ width: '100%' }}
                min={0}
                step={1}
              />
            </div>
            <div className="right-panel-field compact" style={{ flex: 1 }}>
              <label className="right-panel-label">边框色</label>
              <ColorPicker
                value={block.style?.borderColor || DEFAULT_BORDER_COLOR}
                onChange={(_, hex) => updateBlockStyle(block.id, { borderColor: hex })}
                size="small"
              />
            </div>
          </div>
          <div className="right-panel-field compact">
            <label className="right-panel-label">边框样式</label>
            <Select
              value={block.style?.borderStyle || 'solid'}
              onChange={(val) => updateBlockStyle(block.id, { borderStyle: val })}
              size="small"
              style={{ width: '100%' }}
              options={[
                { label: '实线', value: 'solid' },
                { label: '虚线', value: 'dashed' },
                { label: '点线', value: 'dotted' },
                { label: '双线', value: 'double' },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

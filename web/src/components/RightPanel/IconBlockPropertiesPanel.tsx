import { Input, InputNumber, Slider, Divider, Button, App, ColorPicker } from 'antd';
import { useResumeStore } from '@/store';
import type { BlockInstance } from '@/types';
import { DEFAULT_PRIMARY_COLOR, TEXT_SECONDARY_COLOR } from '@/utils/constants';
import AntdIconPicker from '@/components/shared/AntdIconPicker';
import { renderIconByName } from '@/utils/iconMap';

interface IconBlockPropertiesPanelProps {
  block: BlockInstance;
}

/**
 * 图标块属性面板
 * 包含：图标选择、颜色、大小、旋转、透明度
 */
export default function IconBlockPropertiesPanel({ block }: IconBlockPropertiesPanelProps) {
  const {
    resume,
    updateBlockField,
    updateBlockSize,
    updateBlockRotation,
    updateBlockStyle,
    removeBlock,
    cloneBlock,
    toggleBlockVisibility,
    toggleBlockLock,
    renameBlock,
  } = useResumeStore();

  const { modal } = App.useApp();

  const isLocked = block.locked;
  const iconName = block.fields['icon-name'] || 'StarOutlined';
  // 图标颜色：优先用 block.fields['icon-color']，否则跟随配色方案主色
  const iconColor = block.fields['icon-color'] || resume?.colorScheme?.primary || DEFAULT_PRIMARY_COLOR;

  return (
    <div className="right-panel-content">
      {/* 块头部信息 */}
      <div className="right-panel-block-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Input
            variant="borderless"
            value={block.name}
            onChange={(e) => renameBlock(block.id, e.target.value)}
            className="right-panel-block-name"
          />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <Button
            type="text"
            size="small"
            onClick={() => toggleBlockVisibility(block.id)}
            style={{ opacity: block.visible ? 1 : 0.4, fontSize: 12 }}
          >
            {block.visible ? '👁' : '🚫'}
          </Button>
          <Button
            type="text"
            size="small"
            onClick={() => toggleBlockLock(block.id)}
            style={{ opacity: block.locked ? 0.4 : 1, fontSize: 12 }}
          >
            {block.locked ? '🔒' : '🔓'}
          </Button>
          <Button
            type="text"
            size="small"
            onClick={() => cloneBlock(block.id)}
            style={{ fontSize: 12 }}
          >
            📋
          </Button>
          <Button
            type="text"
            size="small"
            danger
            onClick={() => removeBlock(block.id)}
            style={{ fontSize: 12 }}
          >
            🗑
          </Button>
        </div>
      </div>

      {/* 位置信息 */}
      <div className="right-panel-position-compact">
        <span>X: {Math.round(block.x)} Y: {Math.round(block.y)}</span>
        <span>字号: {block.fields['icon-font-size'] || Math.round(Math.min(block.width, block.height))}px</span>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 图标选择 */}
      <div className="right-panel-field">
        <label className="right-panel-label">图标</label>
        <div
          className="right-panel-icon-preview"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 0',
            cursor: isLocked ? 'default' : 'pointer',
          }}
          onClick={() => {
            if (isLocked) return;
            let selectedIcon = iconName;
            modal.confirm({
              title: '选择图标',
              icon: null,
              width: 520,
              content: (
                <AntdIconPicker
                  value={selectedIcon}
                  onChange={(name) => { selectedIcon = name; }}
                />
              ),
              okText: '确定',
              cancelText: '取消',
              onOk: () => {
                updateBlockField(block.id, 'icon-name', selectedIcon);
                renameBlock(block.id, selectedIcon.replace(/Outlined$|Filled$|TwoTone$/g, ''));
              },
            });
          }}
        >
          {renderIconByName(iconName, { style: { fontSize: 20, color: iconColor } })}
          <span style={{ fontSize: 12, color: TEXT_SECONDARY_COLOR }}>{iconName}</span>
        </div>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 图标颜色 */}
      <div className="right-panel-field">
        <label className="right-panel-label">颜色</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColorPicker
            value={iconColor}
            onChange={(_, hex) => updateBlockField(block.id, 'icon-color', hex)}
            size="small"
          />
          <Input
            value={iconColor}
            onChange={(e) => updateBlockField(block.id, 'icon-color', e.target.value)}
            maxLength={7}
            style={{ width: 90, fontSize: 12 }}
            size="small"
          />
        </div>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 字体大小——图标块的宽高由字号自动撑开 */}
      <div className="right-panel-field compact">
        <label className="right-panel-label">字体大小</label>
        <InputNumber
          value={Number(block.fields['icon-font-size']) || Math.min(block.width, block.height)}
          onChange={(val) => {
            if (!val) return;
            updateBlockField(block.id, 'icon-font-size', String(val));
            // 字号变化时自动同步更新块宽高，使图标不被裁剪
            updateBlockSize(block.id, val, val);
          }}
          size="small"
          style={{ width: '100%' }}
          min={8}
          max={500}
          step={1}
          suffix="px"
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 旋转 */}
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
    </div>
  );
}

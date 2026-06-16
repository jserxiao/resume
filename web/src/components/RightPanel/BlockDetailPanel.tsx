/**
 * 统一的块详情面板
 *
 * 将原属性面板和布局面板合并，用折叠分类组织：
 * - 📝 内容：块名称、操作、填写进度、模板字段编辑
 * - 📐 变换：位置、尺寸、层级、旋转
 * - 🎨 外观：背景、透明度、圆角、边框
 * - 📏 间距：外边距、内边距
 *
 * 模块拆分：
 * - FieldEditor       — 字段编辑器（根据 FieldType 渲染对应控件）
 * - FlexboxChildList  — 弹性盒子子元素列表（拖拽排序）
 */
import { useState } from 'react';
import { Input, InputNumber, Slider, Progress, Button, App, ColorPicker, Select, Collapse, Divider, Tooltip } from 'antd';
import {
  FormOutlined,
  DragOutlined,
  BgColorsOutlined,
  BorderOutlined,
  RotateRightOutlined,
  RightOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  CopyOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import type { BlockInstance, BlockTemplate } from '@/types';
import FieldEditor from './FieldEditor';
import FlexboxChildList from './FlexboxChildList';
import ColorFieldInput from '@/components/shared/ColorFieldInput';
import SidesInput from '@/components/shared/SidesInput';
import ImageUploadField from '@/components/shared/ImageUploadField';
import AntdIconPicker from '@/components/shared/AntdIconPicker';
import { BLOCK_DEFAULT_MARGIN, BLOCK_DEFAULT_PADDING, DEFAULT_PRIMARY_COLOR, COMPLETE_COLOR, TEXT_SECONDARY_COLOR, TEXT_HINT_COLOR, DEFAULT_BORDER_COLOR, BLOCK_DEFAULT_BORDER_RADIUS, TPL_FLEXBOX } from '@/utils/constants';
import { renderIconByName } from '@/utils/iconMap';

interface BlockDetailPanelProps {
  block: BlockInstance;
  template: BlockTemplate | undefined;
  /** 是否为图标块 */
  isIconBlock?: boolean;
  /** 是否为头像块 */
  isAvatarBlock?: boolean;
  /** 是否为弹性盒子块 */
  isFlexboxBlock?: boolean;
}

/** 折叠面板分类 key */
type CollapseKey = 'content' | 'transform' | 'appearance' | 'spacing';

export default function BlockDetailPanel({
  block,
  template,
  isIconBlock = false,
  isAvatarBlock = false,
  isFlexboxBlock = false,
}: BlockDetailPanelProps) {
  const {
    resume,
    updateBlockField,
    updateBlockPosition,
    updateBlockSize,
    updateBlockZIndex,
    updateBlockRotation,
    updateBlockStyle,
    removeBlock,
    cloneBlock,
    toggleBlockVisibility,
    toggleBlockLock,
    renameBlock,
    removeBlockFromFlexbox,
    reorderFlexboxChildren,
    selectBlock,
  } = useResumeStore();

  const { modal } = App.useApp();

  const isLocked = block.locked;

  const flexboxParent = block.groupId
    ? resume?.blocks.find((b) => b.id === block.groupId && b.templateId === TPL_FLEXBOX)
    : null;
  const isFlexboxChild = !!flexboxParent;

  const [activeKeys, setActiveKeys] = useState<CollapseKey[]>(['content', 'transform']);

  const hideAppearance = isIconBlock || isAvatarBlock;
  const hideSpacing = isIconBlock || isAvatarBlock;

  const collapseItems: { key: CollapseKey; label: React.ReactNode; children: React.ReactNode }[] = [];

  // ========== 📝 内容分类 ==========

  const avatarBlockContent = isAvatarBlock ? (
    <>
      <div className="right-panel-field">
        <label className="right-panel-label">头像图片</label>
        <ImageUploadField
          value={block.fields['avatar-src'] || ''}
          onChange={(val) => updateBlockField(block.id, 'avatar-src', val)}
          uploadText="上传头像"
        />
      </div>
      <div className="right-panel-field">
        <label className="right-panel-label">形状</label>
        <Select
          value={block.fields['avatar-shape'] || 'circle'}
          onChange={(val) => updateBlockField(block.id, 'avatar-shape', val)}
          size="small" style={{ width: '100%' }} disabled={isLocked}
          options={[{ label: '圆形', value: 'circle' }, { label: '方形', value: 'square' }]}
        />
      </div>
      {(block.fields['avatar-shape'] || 'circle') === 'square' && (
        <div className="right-panel-field compact">
          <label className="right-panel-label">圆角</label>
          <InputNumber
            value={block.style?.borderRadius ?? 6}
            onChange={(val) => updateBlockStyle(block.id, { borderRadius: val ?? 0 })}
            size="small" style={{ width: '100%' }} min={0} step={1} suffix="px"
          />
        </div>
      )}
      <div className="right-panel-field compact">
        <label className="right-panel-label">边框宽度</label>
        <InputNumber
          value={Number(block.fields['avatar-border-width']) || 0}
          onChange={(val) => updateBlockField(block.id, 'avatar-border-width', String(val ?? 0))}
          size="small" style={{ width: '100%' }} min={0} step={1} suffix="px"
        />
      </div>
      <div className="right-panel-field">
        <label className="right-panel-label">边框颜色</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColorPicker value={block.fields['avatar-border-color'] || '#e5e7eb'} onChange={(_, hex) => updateBlockField(block.id, 'avatar-border-color', hex)} size="small" />
          <Input value={block.fields['avatar-border-color'] || '#e5e7eb'} onChange={(e) => updateBlockField(block.id, 'avatar-border-color', e.target.value)} maxLength={7} style={{ width: 90, fontSize: 12 }} size="small" />
        </div>
      </div>
    </>
  ) : null;

  const flexboxBlockContent = isFlexboxBlock ? (
    <>
      <div className="right-panel-field">
        <label className="right-panel-label">主轴方向</label>
        <Select value={block.fields['flex-direction'] || 'row'} onChange={(val) => updateBlockField(block.id, 'flex-direction', val)} size="small" style={{ width: '100%' }} disabled={isLocked}
          options={[{ label: '水平 (row)', value: 'row' }, { label: '水平反转 (row-reverse)', value: 'row-reverse' }, { label: '垂直 (column)', value: 'column' }, { label: '垂直反转 (column-reverse)', value: 'column-reverse' }]}
        />
      </div>
      <div className="right-panel-field">
        <label className="right-panel-label">主轴对齐</label>
        <Select value={block.fields['justify-content'] || 'flex-start'} onChange={(val) => updateBlockField(block.id, 'justify-content', val)} size="small" style={{ width: '100%' }} disabled={isLocked}
          options={[{ label: '起点对齐', value: 'flex-start' }, { label: '终点对齐', value: 'flex-end' }, { label: '居中对齐', value: 'center' }, { label: '两端对齐', value: 'space-between' }, { label: '均匀分布', value: 'space-around' }, { label: '等距分布', value: 'space-evenly' }]}
        />
      </div>
      <div className="right-panel-field">
        <label className="right-panel-label">交叉轴对齐</label>
        <Select value={block.fields['align-items'] || 'stretch'} onChange={(val) => updateBlockField(block.id, 'align-items', val)} size="small" style={{ width: '100%' }} disabled={isLocked}
          options={[{ label: '起点对齐', value: 'flex-start' }, { label: '终点对齐', value: 'flex-end' }, { label: '居中对齐', value: 'center' }, { label: '拉伸填充', value: 'stretch' }, { label: '基线对齐', value: 'baseline' }]}
        />
      </div>
      <div className="right-panel-field">
        <label className="right-panel-label">换行</label>
        <Select value={block.fields['flex-wrap'] || 'nowrap'} onChange={(val) => updateBlockField(block.id, 'flex-wrap', val)} size="small" style={{ width: '100%' }} disabled={isLocked}
          options={[{ label: '不换行', value: 'nowrap' }, { label: '换行', value: 'wrap' }, { label: '反向换行', value: 'wrap-reverse' }]}
        />
      </div>
      <div className="right-panel-field compact">
        <label className="right-panel-label">间距</label>
        <InputNumber value={Number(block.fields['gap']) || 0} onChange={(val) => updateBlockField(block.id, 'gap', String(val ?? 0))} size="small" style={{ width: '100%' }} min={0} step={2} suffix="px" />
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div className="right-panel-section-title" style={{ marginBottom: 4 }}>子元素</div>
      <FlexboxChildList flexboxId={block.id} resume={resume} removeBlockFromFlexbox={removeBlockFromFlexbox} reorderFlexboxChildren={reorderFlexboxChildren} isLocked={isLocked} />
    </>
  ) : null;

  const iconBlockContent = isIconBlock ? (
    <>
      <div className="right-panel-field">
        <label className="right-panel-label">图标</label>
        {(() => {
          const iconName = block.fields['icon-name'] || 'StarOutlined';
          const iconColor = block.fields['icon-color'] || resume?.colorScheme?.primary || DEFAULT_PRIMARY_COLOR;
          return (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: isLocked ? 'default' : 'pointer' }}
              onClick={() => {
                if (isLocked) return;
                let selectedIcon = iconName;
                modal.confirm({
                  title: '选择图标', icon: null, width: 520,
                  content: <AntdIconPicker value={selectedIcon} onChange={(name) => { selectedIcon = name; }} />,
                  okText: '确定', cancelText: '取消',
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
          );
        })()}
      </div>
      <div className="right-panel-field">
        <label className="right-panel-label">颜色</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColorPicker value={block.fields['icon-color'] || resume?.colorScheme?.primary || DEFAULT_PRIMARY_COLOR} onChange={(_, hex) => updateBlockField(block.id, 'icon-color', hex)} size="small" />
          <Input value={block.fields['icon-color'] || resume?.colorScheme?.primary || DEFAULT_PRIMARY_COLOR} onChange={(e) => updateBlockField(block.id, 'icon-color', e.target.value)} maxLength={7} style={{ width: 90, fontSize: 12 }} size="small" />
        </div>
      </div>
      <div className="right-panel-field compact">
        <label className="right-panel-label">字体大小</label>
        <InputNumber
          value={Number(block.fields['icon-font-size']) || Math.min(block.width, block.height)}
          onChange={(val) => { if (!val) return; updateBlockField(block.id, 'icon-font-size', String(val)); updateBlockSize(block.id, val, val); }}
          size="small" style={{ width: '100%' }} min={8} max={500} step={1} suffix="px"
        />
      </div>
    </>
  ) : null;

  const normalBlockContent = !isIconBlock && !isAvatarBlock && !isFlexboxBlock ? (
    <>
      {block.groupId && resume && resume.groups.some(g => g.id === block.groupId) && (
        <div className="right-panel-group-info">
          📁 分组: {resume.groups.find(g => g.id === block.groupId)?.name || '未知分组'}
        </div>
      )}
      <div className="right-panel-fill-status">
        {(() => {
          const values = Object.values(block.fields);
          const filled = values.filter((v) => v && v.trim()).length;
          const total = values.length;
          const percent = total ? Math.round((filled / total) * 100) : 0;
          return <Progress percent={percent} size="small" format={() => `${filled}/${total} 已填写`} strokeColor={percent === 100 ? COMPLETE_COLOR : undefined} />;
        })()}
      </div>
      <div className="right-panel-fields">
        {template ? [...template.fields]
          .sort((a, b) => a.order - b.order)
          .map((field) => {
            const value = block.fields[field.id] || '';
            return (
              <div key={field.id} className="right-panel-field">
                <label className="right-panel-label">
                  {field.name}
                  {field.required && <span className="right-panel-required">*</span>}
                </label>
                <FieldEditor field={field} value={value} blockId={block.id} isLocked={isLocked} updateBlockField={updateBlockField} />
                {field.placeholder && value === '' && (
                  <span className="right-panel-field-hint">{field.placeholder}</span>
                )}
              </div>
            );
          }) : <div className="right-panel-empty-hint">该元素无可编辑字段</div>}
      </div>
    </>
  ) : null;

  collapseItems.push({
    key: 'content',
    label: <span><FormOutlined style={{ marginRight: 6 }} />内容</span>,
    children: <>{avatarBlockContent}{flexboxBlockContent}{iconBlockContent}{normalBlockContent}</>,
  });

  // ========== 📐 变换分类 ==========
  collapseItems.push({
    key: 'transform',
    label: <span><DragOutlined style={{ marginRight: 6 }} />变换</span>,
    children: (
      <>
        <div className="right-panel-section-title">位置</div>
        <div className="right-panel-position-grid">
          <div className="right-panel-field compact">
            <label className="right-panel-label">X</label>
            <InputNumber value={Math.round(block.x)} onChange={(val) => val !== null && updateBlockPosition(block.id, val, block.y)} size="small" style={{ width: '100%' }} step={1} />
          </div>
          <div className="right-panel-field compact">
            <label className="right-panel-label">Y</label>
            <InputNumber value={Math.round(block.y)} onChange={(val) => val !== null && updateBlockPosition(block.id, block.x, val)} size="small" style={{ width: '100%' }} step={1} />
          </div>
        </div>
        {!isIconBlock && (
          <>
            <div className="right-panel-section-title">尺寸</div>
            <div className="right-panel-position-grid">
              <div className="right-panel-field compact">
                <label className="right-panel-label">宽</label>
                <InputNumber value={Math.round(block.width)} onChange={(val) => val !== null && updateBlockSize(block.id, val, block.height)} size="small" style={{ width: '100%' }} min={50} step={1} />
              </div>
              <div className="right-panel-field compact">
                <label className="right-panel-label">高</label>
                <InputNumber value={Math.round(block.height)} onChange={(val) => val !== null && updateBlockSize(block.id, block.width, val)} size="small" style={{ width: '100%' }} min={30} step={1} />
              </div>
            </div>
          </>
        )}
        <div className="right-panel-field compact">
          <label className="right-panel-label">层级</label>
          <InputNumber value={block.zIndex} onChange={(val) => val !== null && updateBlockZIndex(block.id, val)} size="small" style={{ width: '100%' }} min={0} step={1} />
        </div>
        <div className="right-panel-section-title"><RotateRightOutlined /> 旋转</div>
        <div className="right-panel-field">
          <Slider value={block.rotation || 0} onChange={(val) => updateBlockRotation(block.id, val)} min={-180} max={180} step={1} marks={{ '-180': '-180°', '-90': '-90°', 0: '0°', 90: '90°', 180: '180°' }} />
        </div>
        <div className="right-panel-field compact">
          <label className="right-panel-label">角度</label>
          <InputNumber value={block.rotation || 0} onChange={(val) => updateBlockRotation(block.id, val ?? 0)} size="small" style={{ width: '100%' }} min={-360} max={360} step={1} suffix="°" />
        </div>
      </>
    ),
  });

  // ========== 🎨 外观分类 ==========
  if (!hideAppearance) {
    collapseItems.push({
      key: 'appearance',
      label: <span><BgColorsOutlined style={{ marginRight: 6 }} />外观</span>,
      children: (
        <>
          <div className="right-panel-field">
            <label className="right-panel-label">背景颜色</label>
            <ColorFieldInput value={block.style?.backgroundColor || ''} onChange={(hex) => updateBlockStyle(block.id, { backgroundColor: hex })} placeholder="跟随主题" allowClear onClear={() => updateBlockStyle(block.id, { backgroundColor: '' })} />
          </div>
          <div className="right-panel-field">
            <label className="right-panel-label">文字颜色</label>
            <ColorFieldInput value={block.style?.color || ''} onChange={(hex) => updateBlockStyle(block.id, { color: hex })} placeholder="跟随主题" allowClear onClear={() => updateBlockStyle(block.id, { color: '' })} />
          </div>
          <div className="right-panel-field">
            <label className="right-panel-label">背景图片</label>
            <ImageUploadField value={block.style?.backgroundImage || ''} onChange={(val) => updateBlockStyle(block.id, { backgroundImage: val })} uploadText="上传背景图片" />
          </div>
          <div className="right-panel-field">
            <label className="right-panel-label">透明度</label>
            <Slider value={block.style?.opacity ?? 1} onChange={(val) => updateBlockStyle(block.id, { opacity: val })} min={0} max={1} step={0.05} />
          </div>
          <div className="right-panel-field compact">
            <label className="right-panel-label">圆角</label>
            <InputNumber value={block.style?.borderRadius ?? BLOCK_DEFAULT_BORDER_RADIUS} onChange={(val) => updateBlockStyle(block.id, { borderRadius: val ?? 0 })} size="small" style={{ width: '100%' }} min={0} step={1} />
          </div>
          <div className="right-panel-border-row">
            <div className="right-panel-field compact" style={{ flex: 1 }}>
              <label className="right-panel-label">边框宽</label>
              <InputNumber value={block.style?.borderWidth ?? 0} onChange={(val) => updateBlockStyle(block.id, { borderWidth: val ?? 0 })} size="small" style={{ width: '100%' }} min={0} step={1} />
            </div>
            <div className="right-panel-field compact" style={{ flex: 1 }}>
              <label className="right-panel-label">边框色</label>
              <ColorPicker value={block.style?.borderColor || DEFAULT_BORDER_COLOR} onChange={(_, hex) => updateBlockStyle(block.id, { borderColor: hex })} size="small" />
            </div>
          </div>
          <div className="right-panel-field compact">
            <label className="right-panel-label">边框样式</label>
            <Select value={block.style?.borderStyle || 'solid'} onChange={(val) => updateBlockStyle(block.id, { borderStyle: val })} size="small" style={{ width: '100%' }}
              options={[{ label: '实线', value: 'solid' }, { label: '虚线', value: 'dashed' }, { label: '点线', value: 'dotted' }, { label: '双线', value: 'double' }]}
            />
          </div>
        </>
      ),
    });
  }

  // ========== 📏 间距分类 ==========
  if (!hideSpacing) {
    collapseItems.push({
      key: 'spacing',
      label: <span><BorderOutlined style={{ marginRight: 6 }} />间距</span>,
      children: (
        <>
          <div className="right-panel-section-title"><BorderOutlined /> 外边距</div>
          <SidesInput value={block.style?.margin || BLOCK_DEFAULT_MARGIN} onChange={(val) => updateBlockStyle(block.id, { margin: val })} defaultValue={BLOCK_DEFAULT_MARGIN} />
          <div className="right-panel-section-title">内边距</div>
          <SidesInput value={block.style?.padding || BLOCK_DEFAULT_PADDING} onChange={(val) => updateBlockStyle(block.id, { padding: val })} defaultValue={BLOCK_DEFAULT_PADDING} />
        </>
      ),
    });
  }

  return (
    <div className="right-panel-content">
      {isFlexboxChild && flexboxParent && (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', marginBottom: 4, borderRadius: 4, cursor: 'pointer', color: '#1677ff', fontSize: 12, transition: 'background-color 0.15s' }}
          onClick={() => selectBlock(flexboxParent.id)}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(22, 119, 255, 0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ArrowLeftOutlined style={{ fontSize: 11 }} />
          <span>返回 {flexboxParent.name}</span>
        </div>
      )}
      <div className="right-panel-block-header">
        <Input variant="borderless" value={block.name} onChange={(e) => renameBlock(block.id, e.target.value)} className="right-panel-block-name" />
        <div className="right-panel-block-actions">
          <Tooltip title={block.visible ? '隐藏' : '显示'}>
            <Button type="text" size="small" icon={block.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />} onClick={() => toggleBlockVisibility(block.id)} />
          </Tooltip>
          <Tooltip title={block.locked ? '解锁' : '锁定'}>
            <Button type="text" size="small" icon={block.locked ? <LockOutlined /> : <UnlockOutlined />} onClick={() => toggleBlockLock(block.id)} />
          </Tooltip>
          <Tooltip title="复制">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => cloneBlock(block.id)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeBlock(block.id)} />
          </Tooltip>
        </div>
      </div>
      <Collapse
        className="right-panel-collapse"
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as CollapseKey[])}
        ghost
        expandIcon={({ isActive }) => <RightOutlined rotate={isActive ? 90 : 0} style={{ fontSize: 10, color: TEXT_HINT_COLOR }} />}
        items={collapseItems}
      />
    </div>
  );
}

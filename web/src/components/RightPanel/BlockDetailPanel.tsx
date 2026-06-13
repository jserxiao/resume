import { useState, useCallback } from 'react';
import { Input, InputNumber, Slider, Progress, Button, App, ColorPicker, Select, Collapse, Divider, Tooltip } from 'antd';
import {
  FormOutlined,
  DragOutlined,
  BgColorsOutlined,
  BorderOutlined,
  CameraOutlined,
  CloseOutlined,
  RotateRightOutlined,
  RightOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  CopyOutlined,
  DeleteOutlined,
  UserOutlined,
  HolderOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { FieldType } from '@/types';
import type { BlockInstance, BlockTemplate, Resume } from '@/types';
import RichTextField from './RichTextField';
import TagListField from './TagListField';
import { uploadImage } from '@/utils/imageUpload';
import ColorFieldInput from '@/components/shared/ColorFieldInput';
import SidesInput from '@/components/shared/SidesInput';
import ImageUploadField from '@/components/shared/ImageUploadField';
import { BLOCK_DEFAULT_MARGIN, BLOCK_DEFAULT_PADDING, DEFAULT_PRIMARY_COLOR, COMPLETE_COLOR, TEXT_SECONDARY_COLOR, TEXT_HINT_COLOR, DEFAULT_BORDER_COLOR, BLOCK_DEFAULT_BORDER_RADIUS } from '@/utils/constants';
import AntdIconPicker from '@/components/shared/AntdIconPicker';
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

/**
 * 统一的块详情面板
 * 将原属性面板和布局面板合并，用折叠分类组织：
 * - 📝 内容：块名称、操作、填写进度、模板字段编辑
 * - 📐 变换：位置、尺寸、层级、旋转
 * - 🎨 外观：背景、透明度、圆角、边框
 * - 📏 间距：外边距、内边距
 */
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

  // 判断当前块是否为弹性盒子的子元素
  const flexboxParent = block.groupId
    ? resume?.blocks.find((b) => b.id === block.groupId && b.templateId === 'tpl-flexbox')
    : null;
  const isFlexboxChild = !!flexboxParent;

  // 默认展开内容 + 变换，外观和间距默认折叠
  const [activeKeys, setActiveKeys] = useState<CollapseKey[]>(['content', 'transform']);

  // 图标块：隐藏外观和间距分类
  const hideAppearance = isIconBlock || isAvatarBlock;
  const hideSpacing = isIconBlock || isAvatarBlock;

  // 构建折叠面板 items
  const collapseItems: { key: CollapseKey; label: React.ReactNode; children: React.ReactNode }[] = [];

  // ========== 📝 内容分类 ==========

  // 头像块专属内容
  const avatarBlockContent = isAvatarBlock ? (
    <>
      {/* 头像图片上传 */}
      <div className="right-panel-field">
        <label className="right-panel-label">头像图片</label>
        <ImageUploadField
          value={block.fields['avatar-src'] || ''}
          onChange={(val) => updateBlockField(block.id, 'avatar-src', val)}
          uploadText="上传头像"
        />
      </div>

      {/* 形状选择 */}
      <div className="right-panel-field">
        <label className="right-panel-label">形状</label>
        <Select
          value={block.fields['avatar-shape'] || 'circle'}
          onChange={(val) => updateBlockField(block.id, 'avatar-shape', val)}
          size="small"
          style={{ width: '100%' }}
          disabled={isLocked}
          options={[
            { label: '圆形', value: 'circle' },
            { label: '方形', value: 'square' },
          ]}
        />
      </div>

      {/* 方形时显示圆角配置 */}
      {(block.fields['avatar-shape'] || 'circle') === 'square' && (
        <div className="right-panel-field compact">
          <label className="right-panel-label">圆角</label>
          <InputNumber
            value={block.style?.borderRadius ?? 6}
            onChange={(val) => updateBlockStyle(block.id, { borderRadius: val ?? 0 })}
            size="small"
            style={{ width: '100%' }}
            min={0}
            step={1}
            suffix="px"
          />
        </div>
      )}

      {/* 边框宽度 */}
      <div className="right-panel-field compact">
        <label className="right-panel-label">边框宽度</label>
        <InputNumber
          value={Number(block.fields['avatar-border-width']) || 0}
          onChange={(val) => updateBlockField(block.id, 'avatar-border-width', String(val ?? 0))}
          size="small"
          style={{ width: '100%' }}
          min={0}
          step={1}
          suffix="px"
        />
      </div>

      {/* 边框颜色 */}
      <div className="right-panel-field">
        <label className="right-panel-label">边框颜色</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColorPicker
            value={block.fields['avatar-border-color'] || '#e5e7eb'}
            onChange={(_, hex) => updateBlockField(block.id, 'avatar-border-color', hex)}
            size="small"
          />
          <Input
            value={block.fields['avatar-border-color'] || '#e5e7eb'}
            onChange={(e) => updateBlockField(block.id, 'avatar-border-color', e.target.value)}
            maxLength={7}
            style={{ width: 90, fontSize: 12 }}
            size="small"
          />
        </div>
      </div>
    </>
  ) : null;

  // 弹性盒子块专属内容
  const flexboxBlockContent = isFlexboxBlock ? (
    <>
      {/* 主轴方向 */}
      <div className="right-panel-field">
        <label className="right-panel-label">主轴方向</label>
        <Select
          value={block.fields['flex-direction'] || 'row'}
          onChange={(val) => updateBlockField(block.id, 'flex-direction', val)}
          size="small"
          style={{ width: '100%' }}
          disabled={isLocked}
          options={[
            { label: '水平 (row)', value: 'row' },
            { label: '水平反转 (row-reverse)', value: 'row-reverse' },
            { label: '垂直 (column)', value: 'column' },
            { label: '垂直反转 (column-reverse)', value: 'column-reverse' },
          ]}
        />
      </div>

      {/* 主轴对齐 */}
      <div className="right-panel-field">
        <label className="right-panel-label">主轴对齐</label>
        <Select
          value={block.fields['justify-content'] || 'flex-start'}
          onChange={(val) => updateBlockField(block.id, 'justify-content', val)}
          size="small"
          style={{ width: '100%' }}
          disabled={isLocked}
          options={[
            { label: '起点对齐', value: 'flex-start' },
            { label: '终点对齐', value: 'flex-end' },
            { label: '居中对齐', value: 'center' },
            { label: '两端对齐', value: 'space-between' },
            { label: '均匀分布', value: 'space-around' },
            { label: '等距分布', value: 'space-evenly' },
          ]}
        />
      </div>

      {/* 交叉轴对齐 */}
      <div className="right-panel-field">
        <label className="right-panel-label">交叉轴对齐</label>
        <Select
          value={block.fields['align-items'] || 'stretch'}
          onChange={(val) => updateBlockField(block.id, 'align-items', val)}
          size="small"
          style={{ width: '100%' }}
          disabled={isLocked}
          options={[
            { label: '起点对齐', value: 'flex-start' },
            { label: '终点对齐', value: 'flex-end' },
            { label: '居中对齐', value: 'center' },
            { label: '拉伸填充', value: 'stretch' },
            { label: '基线对齐', value: 'baseline' },
          ]}
        />
      </div>

      {/* 换行 */}
      <div className="right-panel-field">
        <label className="right-panel-label">换行</label>
        <Select
          value={block.fields['flex-wrap'] || 'nowrap'}
          onChange={(val) => updateBlockField(block.id, 'flex-wrap', val)}
          size="small"
          style={{ width: '100%' }}
          disabled={isLocked}
          options={[
            { label: '不换行', value: 'nowrap' },
            { label: '换行', value: 'wrap' },
            { label: '反向换行', value: 'wrap-reverse' },
          ]}
        />
      </div>

      {/* 间距 */}
      <div className="right-panel-field compact">
        <label className="right-panel-label">间距</label>
        <InputNumber
          value={Number(block.fields['gap']) || 0}
          onChange={(val) => updateBlockField(block.id, 'gap', String(val ?? 0))}
          size="small"
          style={{ width: '100%' }}
          min={0}
          step={2}
          suffix="px"
        />
      </div>

      {/* 子元素列表 */}
      <Divider style={{ margin: '8px 0' }} />
      <div className="right-panel-section-title" style={{ marginBottom: 4 }}>子元素</div>
      <FlexboxChildList
        flexboxId={block.id}
        resume={resume}
        removeBlockFromFlexbox={removeBlockFromFlexbox}
        reorderFlexboxChildren={reorderFlexboxChildren}
        isLocked={isLocked}
      />
    </>
  ) : null;

  const iconBlockContent = isIconBlock ? (
    <>
      {/* 图标选择 */}
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
                  title: '选择图标',
                  icon: null,
                  width: 520,
                  content: <AntdIconPicker value={selectedIcon} onChange={(name) => { selectedIcon = name; }} />,
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
          );
        })()}
      </div>

      {/* 图标颜色 */}
      <div className="right-panel-field">
        <label className="right-panel-label">颜色</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColorPicker
            value={block.fields['icon-color'] || resume?.colorScheme?.primary || DEFAULT_PRIMARY_COLOR}
            onChange={(_, hex) => updateBlockField(block.id, 'icon-color', hex)}
            size="small"
          />
          <Input
            value={block.fields['icon-color'] || resume?.colorScheme?.primary || DEFAULT_PRIMARY_COLOR}
            onChange={(e) => updateBlockField(block.id, 'icon-color', e.target.value)}
            maxLength={7}
            style={{ width: 90, fontSize: 12 }}
            size="small"
          />
        </div>
      </div>

      {/* 字体大小 */}
      <div className="right-panel-field compact">
        <label className="right-panel-label">字体大小</label>
        <InputNumber
          value={Number(block.fields['icon-font-size']) || Math.min(block.width, block.height)}
          onChange={(val) => {
            if (!val) return;
            updateBlockField(block.id, 'icon-font-size', String(val));
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
    </>
  ) : null;

  const normalBlockContent = !isIconBlock && !isAvatarBlock && !isFlexboxBlock ? (
    <>
      {/* 分组信息（仅显示真正的分组，不显示弹性盒子） */}
      {block.groupId && resume && resume.groups.some(g => g.id === block.groupId) && (
        <div className="right-panel-group-info">
          📁 分组: {resume.groups.find(g => g.id === block.groupId)?.name || '未知分组'}
        </div>
      )}

      {/* 填充状态 */}
      <div className="right-panel-fill-status">
        {(() => {
          const values = Object.values(block.fields);
          const filled = values.filter((v) => v && v.trim()).length;
          const total = values.length;
          const percent = total ? Math.round((filled / total) * 100) : 0;
          return (
            <Progress
              percent={percent}
              size="small"
              format={() => `${filled}/${total} 已填写`}
              strokeColor={percent === 100 ? COMPLETE_COLOR : undefined}
            />
          );
        })()}
      </div>

      {/* 字段编辑 */}
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
                {renderFieldEditor(field, value, block.id, isLocked, updateBlockField, modal)}
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
    children: (
      <>
        {avatarBlockContent}
        {flexboxBlockContent}
        {iconBlockContent}
        {normalBlockContent}
      </>
    ),
  });

  // ========== 📐 变换分类 ==========
  collapseItems.push({
    key: 'transform',
    label: <span><DragOutlined style={{ marginRight: 6 }} />变换</span>,
    children: (
      <>
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

        {/* 图标块尺寸由字号驱动 */}
        {!isIconBlock && (
          <>
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
      </>
    ),
  });

  // ========== 🎨 外观分类（图标块隐藏） ==========
  if (!hideAppearance) {
    collapseItems.push({
      key: 'appearance',
      label: <span><BgColorsOutlined style={{ marginRight: 6 }} />外观</span>,
      children: (
        <>
          {/* 背景颜色 */}
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

          {/* 圆角 */}
          <div className="right-panel-field compact">
            <label className="right-panel-label">圆角</label>
            <InputNumber
              value={block.style?.borderRadius ?? BLOCK_DEFAULT_BORDER_RADIUS}
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
      ),
    });
  }

  // ========== 📏 间距分类（图标块隐藏） ==========
  if (!hideSpacing) {
    collapseItems.push({
      key: 'spacing',
      label: <span><BorderOutlined style={{ marginRight: 6 }} />间距</span>,
      children: (
        <>
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
        </>
      ),
    });
  }

  return (
    <div className="right-panel-content">
      {/* 弹性盒子子元素返回按钮 */}
      {isFlexboxChild && flexboxParent && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 8px',
            marginBottom: 4,
            borderRadius: 4,
            cursor: 'pointer',
            color: '#1677ff',
            fontSize: 12,
            transition: 'background-color 0.15s',
          }}
          onClick={() => selectBlock(flexboxParent.id)}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(22, 119, 255, 0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ArrowLeftOutlined style={{ fontSize: 11 }} />
          <span>返回 {flexboxParent.name}</span>
        </div>
      )}

      {/* 块头部信息 */}
      <div className="right-panel-block-header">
        <Input
          variant="borderless"
          value={block.name}
          onChange={(e) => renameBlock(block.id, e.target.value)}
          className="right-panel-block-name"
        />
        <div className="right-panel-block-actions">
          <Tooltip title={block.visible ? '隐藏' : '显示'}>
            <Button
              type="text"
              size="small"
              icon={block.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => toggleBlockVisibility(block.id)}
            />
          </Tooltip>
          <Tooltip title={block.locked ? '解锁' : '锁定'}>
            <Button
              type="text"
              size="small"
              icon={block.locked ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => toggleBlockLock(block.id)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => cloneBlock(block.id)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeBlock(block.id)}
            />
          </Tooltip>
        </div>
      </div>

      {/* 折叠面板 */}
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

// ========== 字段编辑器渲染 ==========
function renderFieldEditor(
  field: { id: string; type: FieldType; placeholder: string },
  value: string,
  blockId: string,
  isLocked: boolean,
  updateBlockField: (blockId: string, fieldId: string, value: string) => void,
  modal: { confirm: (config: any) => void },
) {
  switch (field.type) {
    case FieldType.RichText:
      return (
        <RichTextField
          value={value}
          onChange={(v) => updateBlockField(blockId, field.id, v)}
          placeholder={field.placeholder}
          disabled={isLocked}
        />
      );
    case FieldType.TagList:
      return (
        <TagListField
          value={value}
          onChange={(v) => updateBlockField(blockId, field.id, v)}
          placeholder={field.placeholder}
          disabled={isLocked}
        />
      );
    case FieldType.TextArea:
      return (
        <Input.TextArea
          value={value}
          onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
          placeholder={field.placeholder}
          disabled={isLocked}
          rows={3}
        />
      );
    case FieldType.Date:
      return (
        <Input
          type="month"
          value={value}
          onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
          disabled={isLocked}
          placeholder={field.placeholder || '选择月份'}
        />
      );
    case FieldType.Image:
      return (
        <div className="right-panel-image-upload">
          {value ? (
            <div className="right-panel-image-preview">
              <img src={value} alt="" />
              {!isLocked && (
                <Button
                  type="text"
                  size="small"
                  danger
                  className="right-panel-image-clear"
                  icon={<CloseOutlined />}
                  onClick={() => updateBlockField(blockId, field.id, '')}
                />
              )}
            </div>
          ) : (
            <Button
              icon={<CameraOutlined />}
              disabled={isLocked}
              onClick={async () => {
                const result = await uploadImage();
                if (result) {
                  updateBlockField(blockId, field.id, result);
                  return;
                }
                let urlValue = '';
                modal.confirm({
                  title: '输入图片地址',
                  content: (
                    <Input
                      placeholder="请输入图片URL"
                      onChange={(e) => { urlValue = e.target.value; }}
                      style={{ marginTop: 8 }}
                      autoFocus
                    />
                  ),
                  okText: '确认',
                  cancelText: '取消',
                  onOk: () => {
                    if (urlValue.trim()) {
                      updateBlockField(blockId, field.id, urlValue.trim());
                    }
                  },
                });
              }}
            >
              上传图片
            </Button>
          )}
        </div>
      );
    case FieldType.Select:
      return (
        <Select
          value={value}
          onChange={(val) => updateBlockField(blockId, field.id, val)}
          size="small"
          style={{ width: '100%' }}
          disabled={isLocked}
          options={(field as any).options?.map((opt: string) => ({ label: opt, value: opt })) || []}
        />
      );
    case FieldType.Switch:
      return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => updateBlockField(blockId, field.id, e.target.checked ? 'true' : 'false')}
              disabled={isLocked}
            />
            <span style={{ fontSize: 12, color: TEXT_SECONDARY_COLOR }}>{value === 'true' ? '是' : '否'}</span>
          </label>
        </div>
      );
    case FieldType.Rating:
      return (
        <div style={{ display: 'flex', gap: 2 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              style={{
                cursor: isLocked ? 'default' : 'pointer',
                fontSize: 16,
                opacity: parseInt(value) >= star ? 1 : 0.3,
              }}
              onClick={() => !isLocked && updateBlockField(blockId, field.id, String(star))}
            >
              ⭐
            </span>
          ))}
        </div>
      );
    case FieldType.Link:
      return (
        <Input
          type="url"
          value={value}
          onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
          placeholder={field.placeholder}
          disabled={isLocked}
        />
      );
    case FieldType.Color:
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColorPicker
            value={value || '#e5e7eb'}
            onChange={(_, hex) => updateBlockField(blockId, field.id, hex)}
            size="small"
          />
          <Input
            value={value}
            onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
            maxLength={7}
            style={{ width: 90, fontSize: 12 }}
            size="small"
            placeholder={field.placeholder}
          />
        </div>
      );
    case FieldType.Number:
      return (
        <InputNumber
          value={value ? Number(value) : undefined}
          onChange={(val) => updateBlockField(blockId, field.id, String(val ?? ''))}
          size="small"
          style={{ width: '100%' }}
          disabled={isLocked}
          placeholder={field.placeholder}
        />
      );
    default:
      return (
        <Input
          value={value}
          onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
          placeholder={field.placeholder}
          disabled={isLocked}
        />
      );
  }
}

// ========== 弹性盒子子元素列表 ==========
function FlexboxChildList({
  flexboxId,
  resume,
  removeBlockFromFlexbox,
  reorderFlexboxChildren,
  isLocked,
}: {
  flexboxId: string;
  resume: Resume;
  removeBlockFromFlexbox: (blockId: string, flexboxId: string) => void;
  reorderFlexboxChildren: (flexboxId: string, childIds: string[]) => void;
  isLocked: boolean;
}) {
  const { selectBlock } = useResumeStore();
  const childBlocks = resume.blocks.filter(
    (b) => b.groupId === flexboxId && b.visible
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, childId: string) => {
    setDragItemId(childId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('flexboxChildId', childId);
    e.dataTransfer.setData('flexboxId', flexboxId);
  }, [flexboxId]);

  // 拖拽经过
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  // 拖拽离开
  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  // 放下排序
  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const draggedId = e.dataTransfer.getData('flexboxChildId');
    if (!draggedId) return;

    const currentIds = childBlocks.map((b) => b.id);
    const fromIndex = currentIds.indexOf(draggedId);
    if (fromIndex === -1 || fromIndex === targetIndex) return;

    // 重新排列
    const newIds = [...currentIds];
    newIds.splice(fromIndex, 1);
    newIds.splice(targetIndex, 0, draggedId);
    reorderFlexboxChildren(flexboxId, newIds);
    setDragItemId(null);
  }, [childBlocks, flexboxId, reorderFlexboxChildren]);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDragItemId(null);
    setDragOverIndex(null);
  }, []);

  if (childBlocks.length === 0) {
    return (
      <div style={{ color: TEXT_HINT_COLOR, fontSize: 11, padding: '4px 0' }}>
        暂无子元素，拖拽元素到弹性盒子上可添加
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {childBlocks.map((child, index) => (
        <div
          key={child.id}
          draggable={!isLocked}
          onDragStart={(e) => handleDragStart(e, child.id)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 6px',
            borderRadius: 4,
            backgroundColor: dragOverIndex === index ? 'rgba(22, 119, 255, 0.08)' : dragItemId === child.id ? 'rgba(0,0,0,0.03)' : 'transparent',
            border: dragOverIndex === index ? '1px dashed #1677ff' : '1px solid transparent',
            cursor: isLocked ? 'default' : 'pointer',
            fontSize: 11,
            transition: 'background-color 0.15s',
          }}
          onClick={() => selectBlock(child.id)}
        >
          <HolderOutlined style={{ fontSize: 10, color: TEXT_HINT_COLOR, cursor: isLocked ? 'default' : 'grab' }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {child.name}
          </span>
          <span style={{ fontSize: 9, color: TEXT_HINT_COLOR }}>
            {child.templateName}
          </span>
          <Tooltip title="移出弹性盒子">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              style={{ fontSize: 10, color: TEXT_HINT_COLOR, minWidth: 20, width: 20, height: 20, padding: 0 }}
              disabled={isLocked}
              onClick={(e) => {
                e.stopPropagation();
                removeBlockFromFlexbox(child.id, flexboxId);
              }}
            />
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

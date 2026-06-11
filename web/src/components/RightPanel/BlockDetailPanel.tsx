import { useState } from 'react';
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
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { FieldType } from '@/types';
import type { BlockInstance, BlockTemplate } from '@/types';
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
  /** 是否为自定义装饰块 */
  isCustomDecorationBlock?: boolean;
  /** 自定义装饰块的编辑回调 */
  onEditDecoration?: () => void;
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
  isCustomDecorationBlock = false,
  onEditDecoration,
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
  } = useResumeStore();

  const { modal } = App.useApp();

  const isLocked = block.locked;

  // 默认展开内容 + 变换，外观和间距默认折叠
  const [activeKeys, setActiveKeys] = useState<CollapseKey[]>(['content', 'transform']);

  // 图标块：隐藏外观和间距分类
  const hideAppearance = isIconBlock;
  const hideSpacing = isIconBlock;

  // 构建折叠面板 items
  const collapseItems: { key: CollapseKey; label: React.ReactNode; children: React.ReactNode }[] = [];

  // ========== 📝 内容分类 ==========
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

  const normalBlockContent = !isIconBlock ? (
    <>
      {/* 分组信息 */}
      {block.groupId && resume && (
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

      {/* 自定义装饰块的编辑按钮 */}
      {isCustomDecorationBlock && onEditDecoration && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <Button icon={<FormOutlined />} onClick={onEditDecoration} block style={{ marginBottom: 6 }}>
            编辑装饰图形
          </Button>
        </>
      )}
    </>
  ) : null;

  collapseItems.push({
    key: 'content',
    label: <span><FormOutlined style={{ marginRight: 6 }} />内容</span>,
    children: (
      <>
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
        <Input
          value={value}
          onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
          placeholder={field.placeholder}
          disabled={isLocked}
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
    case FieldType.Number:
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
          placeholder={field.placeholder}
          disabled={isLocked}
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

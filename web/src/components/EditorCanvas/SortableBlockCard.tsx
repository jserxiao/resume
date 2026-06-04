import { useState, useCallback, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Tag, Select, Rate } from 'antd';
import { DeleteOutlined, HolderOutlined, CameraOutlined } from '@ant-design/icons';
import type { BlockInstance, BlockTemplate, ColorScheme, DecorationElement } from '@/types';
import { FieldType } from '@/types';
import { presetDecorations } from '@/utils/decorations';
import './SortableBlockCard.less';

interface SortableBlockCardProps {
  block: BlockInstance;
  template: BlockTemplate | undefined;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onUpdateField?: (fieldId: string, value: string) => void;
  density: { fontSize: number; lineHeight: number; spacing: number };
  colorScheme: ColorScheme;
  mode?: 'edit' | 'preview'; // 编辑模式 or 预览模式
}

export default function SortableBlockCard({
  block,
  template,
  isSelected,
  onSelect,
  onDelete,
  onUpdateField,
  density,
  colorScheme,
  mode = 'edit',
}: SortableBlockCardProps) {
  const isPreview = mode === 'preview';
  const [isHovered, setIsHovered] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: isPreview });

  const style = isPreview ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!template) return null;

  const fields = [...template.fields].sort((a, b) => a.order - b.order);

  // 双击进入编辑
  const handleFieldDoubleClick = useCallback((fieldId: string) => {
    if (!block.locked) {
      setEditingField(fieldId);
    }
  }, [block.locked]);

  const handleFieldBlur = useCallback(() => {
    setEditingField(null);
  }, []);

  // 头像上传处理
  const handleAvatarUpload = useCallback((fieldId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      // 限制文件大小 2MB
      if (file.size > 2 * 1024 * 1024) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          onUpdateField(fieldId, result);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [onUpdateField]);

  // 渲染可编辑字段
  const renderEditableField = (field: typeof fields[0], value: string) => {
    const isEditing = !isPreview && editingField === field.id;

    if (isEditing) {
      switch (field.type) {
        case FieldType.TextArea:
          return (
            <Input.TextArea
              value={value}
              onChange={(e) => onUpdateField(field.id, e.target.value)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder}
              rows={2}
              autoFocus
              size="small"
            />
          );
        case FieldType.Select:
          return (
            <Select
              value={value || undefined}
              onChange={(val) => {
                onUpdateField(field.id, val);
                setEditingField(null);
              }}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder || '请选择'}
              allowClear
              style={{ width: '100%' }}
              size="small"
              options={field.options?.map((opt) => ({ label: opt, value: opt }))}
              autoFocus
              open
            />
          );
        case FieldType.Rating:
          return (
            <Rate
              value={parseInt(value) || 0}
              onChange={(val) => {
                onUpdateField(field.id, String(val));
                setEditingField(null);
              }}
            />
          );
        case FieldType.Date:
          return (
            <Input
              type="month"
              value={value}
              onChange={(e) => onUpdateField(field.id, e.target.value)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder || '选择月份'}
              autoFocus
              size="small"
            />
          );
        case FieldType.Number:
          return (
            <Input
              type="number"
              value={value}
              onChange={(e) => onUpdateField(field.id, e.target.value)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder}
              autoFocus
              size="small"
            />
          );
        case FieldType.Link:
          return (
            <Input
              type="url"
              value={value}
              onChange={(e) => onUpdateField(field.id, e.target.value)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder}
              autoFocus
              size="small"
            />
          );
        case FieldType.TagList:
          return (
            <Input
              value={value}
              onChange={(e) => onUpdateField(field.id, e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="逗号分隔，如：React,Vue,Node"
              autoFocus
              size="small"
            />
          );
        default:
          return (
            <Input
              value={value}
              onChange={(e) => onUpdateField(field.id, e.target.value)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder}
              autoFocus
              size="small"
            />
          );
      }
    }

    // 只读显示
    if (!value || value.trim() === '') {
      if (isPreview) return null; // 预览模式下空值不显示
      return (
        <span
          className="editable-field-placeholder"
          onDoubleClick={() => handleFieldDoubleClick(field.id)}
        >
          点击填写{field.name}...
        </span>
      );
    }

    switch (field.type) {
      case FieldType.RichText:
        return (
          <div
            className="editable-field-richtext"
            dangerouslySetInnerHTML={{ __html: value }}
            onDoubleClick={() => handleFieldDoubleClick(field.id)}
          />
        );
      case FieldType.TagList:
        return (
          <div className="editable-field-tags" onDoubleClick={() => handleFieldDoubleClick(field.id)}>
            {value.split(',').filter(Boolean).map((tag, i) => (
              <Tag key={i} color={colorScheme.primary} style={{ color: '#fff' }}>{tag.trim()}</Tag>
            ))}
          </div>
        );
      case FieldType.Rating:
        return (
          <div onDoubleClick={() => handleFieldDoubleClick(field.id)}>
            <Rate value={parseInt(value) || 0} disabled style={{ fontSize: 12 }} />
          </div>
        );
      case FieldType.Image:
        return value ? (
          <div className="editable-field-image" onDoubleClick={() => handleFieldDoubleClick(field.id)}>
            <img src={value} alt="" />
          </div>
        ) : null;
      case FieldType.Switch:
        return value === 'true' ? '✓' : '';
      case FieldType.Link:
        return (
          <a
            className="editable-field-link"
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => { e.stopPropagation(); handleFieldDoubleClick(field.id); }}
          >
            {value}
          </a>
        );
      default:
        return (
          <span
            className="editable-field-text"
            onDoubleClick={() => handleFieldDoubleClick(field.id)}
          >
            {value}
          </span>
        );
    }
  };

  const isHeaderInfo = template.name === '头部信息';
  const isBasicInfo = template.name === '基本信息';
  const isSkills = template.name === '技能';

  // ===== 头部信息块渲染 =====
  const renderHeaderInfo = () => {
    const avatarField = fields.find((f) => f.name === '头像');
    const nameField = fields.find((f) => f.name === '姓名');
    const titleField = fields.find((f) => f.name === '职位');
    const bioField = fields.find((f) => f.name === '一句话简介');
    const contactFields = fields.filter(
      (f) => !['头像', '姓名', '职位', '一句话简介'].includes(f.name)
    );

    const avatarValue = avatarField ? block.fields[avatarField.id] : '';
    const nameValue = nameField ? block.fields[nameField.id] : '';
    const titleValue = titleField ? block.fields[titleField.id] : '';
    const bioValue = bioField ? block.fields[bioField.id] : '';

    return (
      <div className="sortable-block-header-info">
        {/* 头像 */}
        {avatarField && (
          <div
            className="sortable-block-header-avatar"
            onClick={(e) => {
              if (isPreview) return;
              e.stopPropagation();
              if (avatarValue) {
                // 已有头像，双击编辑或点击上传新头像
                handleAvatarUpload(avatarField.id);
              } else {
                handleAvatarUpload(avatarField.id);
              }
            }}
          >
            {avatarValue ? (
              <img src={avatarValue} alt="头像" />
            ) : (
              <div className="sortable-block-header-avatar-placeholder">
                {nameValue?.[0] || <CameraOutlined style={{ fontSize: 24 }} />}
              </div>
            )}
            {!isPreview && (
              <div className="sortable-block-header-avatar-overlay">
                <CameraOutlined />
              </div>
            )}
          </div>
        )}

        <div className="sortable-block-header-info-main">
          {/* 姓名 */}
          {nameField && (
            <div className="sortable-block-header-name">
              {renderEditableField(nameField, nameValue)}
            </div>
          )}

          {/* 职位 */}
          {titleField && (
            <div className="sortable-block-header-title">
              {renderEditableField(titleField, titleValue)}
            </div>
          )}

          {/* 一句话简介 */}
          {bioField && (
            <div className="sortable-block-header-bio">
              {renderEditableField(bioField, bioValue)}
            </div>
          )}

          {/* 联系方式 */}
          <div className="sortable-block-header-contacts">
            {contactFields.map((field) => {
              const value = block.fields[field.id];
              if (!value || value.trim() === '') return null;
              return (
                <span key={field.id} className="sortable-block-header-contact-item">
                  {renderEditableField(field, value)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /** 渲染装饰元素覆盖层 */
  const renderDecorations = () => {
    if (!block.decorations || block.decorations.length === 0) return null;

    return (
      <div className="sortable-block-decorations">
        {block.decorations.map((deco) => {
          const def = presetDecorations.find((d) => d.id === deco.decorationId);
          if (!def) return null;
          const isDashed = deco.decorationId.includes('dashed');
          return (
            <svg
              key={deco.id}
              className="sortable-block-decoration"
              style={{
                position: 'absolute',
                left: deco.x,
                top: deco.y,
                width: deco.width,
                height: deco.height,
                transform: `rotate(${deco.rotation}deg)`,
                opacity: deco.opacity,
                zIndex: deco.zIndex,
                pointerEvents: isPreview ? 'none' : 'auto',
              }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d={def.svgPath}
                fill={deco.color === 'transparent' ? 'none' : deco.color}
                stroke={deco.strokeColor === 'transparent' ? 'none' : deco.strokeColor}
                strokeWidth={deco.strokeWidth * 3}
                strokeDasharray={isDashed ? '5,3' : undefined}
              />
            </svg>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-block-card ${isPreview ? 'preview-mode' : ''} ${isSelected && !isPreview ? 'selected' : ''} ${isHovered && !isPreview ? 'hovered' : ''}`}
      onMouseEnter={() => !isPreview && setIsHovered(true)}
      onMouseLeave={() => !isPreview && setIsHovered(false)}
      onClick={onSelect}
    >
      {/* 拖拽手柄 + 删除按钮 —— 预览模式下隐藏 */}
      {!isPreview && (
        <div className="sortable-block-card-header">
          <div className="sortable-block-card-drag-handle" {...attributes} {...listeners}>
            <HolderOutlined />
          </div>
          <span className="sortable-block-card-name">{block.name}</span>
          {(isHovered || isSelected) && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              className="sortable-block-card-delete"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            />
          )}
        </div>
      )}

      {/* 块内容 - 可编辑字段 */}
      <div className="sortable-block-card-content" style={{ position: 'relative' }}>
        {/* 装饰元素渲染层 */}
        {renderDecorations()}

        {isHeaderInfo ? (
          renderHeaderInfo()
        ) : isBasicInfo ? (
          <div className="sortable-block-basic-info">
            {fields.find((f) => f.type === FieldType.Image) && (
              <div className="sortable-block-avatar">
                {block.fields[fields.find((f) => f.type === FieldType.Image)!.id] ? (
                  <img
                    src={block.fields[fields.find((f) => f.type === FieldType.Image)!.id]}
                    alt="头像"
                  />
                ) : (
                  <div className="sortable-block-avatar-placeholder">
                    {block.fields[fields.find((f) => f.name === '姓名')?.id || '']?.[0] || '?'}
                  </div>
                )}
              </div>
            )}
            <div className="sortable-block-basic-info-content">
              {fields.find((f) => f.name === '姓名') && (
                <div className="sortable-block-name-field">
                  {renderEditableField(
                    fields.find((f) => f.name === '姓名')!,
                    block.fields[fields.find((f) => f.name === '姓名')!.id]
                  )}
                </div>
              )}
              <div className="sortable-block-contact-list">
                {fields
                  .filter((f) => f.name !== '姓名' && f.name !== '头像')
                  .map((field) => {
                    const value = block.fields[field.id];
                    if (!value || value.trim() === '') return null;
                    return (
                      <span key={field.id} className="sortable-block-contact-item">
                        <span className="sortable-block-contact-label">{field.name}:</span>{' '}
                        {renderEditableField(field, value)}
                      </span>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : isSkills ? (
          <div className="sortable-block-skills">
            {fields.map((field) => {
              const value = block.fields[field.id];
              return (
                <div key={field.id} className="sortable-block-skill-item">
                  <span className="sortable-block-skill-name">
                    {renderEditableField(field, value)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="sortable-block-fields">
            {fields.map((field) => {
              const value = block.fields[field.id];

              // 主标题字段
              const isTitleField = ['公司名', '学校', '项目名', '名称'].includes(field.name);
              const isTimeField = ['开始时间', '结束时间', '时间'].includes(field.name);
              const isSubtitleField = ['职位', '学位', '专业', '角色'].includes(field.name);

              if (isTitleField) {
                return (
                  <div key={field.id} className="sortable-block-field-title-row">
                    {renderEditableField(field, value)}
                  </div>
                );
              }

              if (isTimeField) {
                return (
                  <span key={field.id} className="sortable-block-field-time">
                    {renderEditableField(field, value)}
                    {field.name === '开始时间' && block.fields[fields.find(f => f.name === '结束时间')?.id || ''] ? ' - ' : ''}
                  </span>
                );
              }

              if (isSubtitleField) {
                return (
                  <div key={field.id} className="sortable-block-field-subtitle">
                    {renderEditableField(field, value)}
                  </div>
                );
              }

              if (field.name === '是否至今' && value === 'true') {
                return <span key={field.id} className="sortable-block-field-time">至今</span>;
              }

              return (
                <div key={field.id} className="sortable-block-field-row">
                  <span className="sortable-block-field-label">{field.name}</span>
                  <div className="sortable-block-field-value">
                    {renderEditableField(field, value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 隐藏的文件上传 input —— 预览模式下不需要 */}
      {!isPreview && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
}

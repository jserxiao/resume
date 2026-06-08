import { useState, useCallback, useRef } from 'react';
import { Button, Input, Tag, Select, Rate, Popconfirm } from 'antd';
import { DeleteOutlined, CameraOutlined, CopyOutlined, LockOutlined, EyeInvisibleOutlined, GroupOutlined } from '@ant-design/icons';
import type { BlockInstance, BlockTemplate, ColorScheme, DecorationElement } from '@/types';
import { FieldType } from '@/types';
import { presetDecorations } from '@/utils/decorations';
import { MARGIN_INDICATOR_COLOR, MARGIN_INDICATOR_BORDER_COLOR } from '@/utils/constants';
import { uploadImage } from '@/utils/imageUpload';
import { useResumeStore } from '@/store';
import './FreeBlockCard.less';

interface FreeBlockCardProps {
  block: BlockInstance;
  template: BlockTemplate | undefined;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  isGroupSelected: boolean;
  colorScheme: ColorScheme;
  mode?: 'edit' | 'preview';
  onSelect: (e?: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (direction: string, e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function FreeBlockCard({
  block,
  template,
  isSelected,
  isDragging,
  isResizing,
  isGroupSelected,
  colorScheme,
  mode = 'edit',
  onSelect,
  onDragStart,
  onResizeStart,
  onMouseEnter,
  onMouseLeave,
}: FreeBlockCardProps) {
  const isPreview = mode === 'preview';
  const [isHovered, setIsHovered] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const { removeBlock, cloneBlock, updateBlockField } = useResumeStore();
  const cardRef = useRef<HTMLDivElement>(null);

  if (!template) return null;

  const fields = [...template.fields].sort((a, b) => a.order - b.order);
  const blockStyle = block.style || {};
  const margin = blockStyle.margin || { top: 0, right: 0, bottom: 0, left: 0 };
  const padding = blockStyle.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const hasMargin = margin.top > 0 || margin.right > 0 || margin.bottom > 0 || margin.left > 0;

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
  const handleAvatarUpload = useCallback(async (fieldId: string) => {
    const result = await uploadImage();
    if (result) {
      updateBlockField(block.id, fieldId, result);
    }
  }, [block.id, updateBlockField]);

  // 渲染可编辑字段
  const renderEditableField = (field: typeof fields[0], value: string) => {
    const isEditing = !isPreview && editingField === field.id;

    if (isEditing) {
      switch (field.type) {
        case FieldType.TextArea:
          return (
            <Input.TextArea
              value={value}
              onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
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
                updateBlockField(block.id, field.id, val);
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
                updateBlockField(block.id, field.id, String(val));
                setEditingField(null);
              }}
            />
          );
        case FieldType.Date:
          return (
            <Input
              type="month"
              value={value}
              onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder || '选择月份'}
              autoFocus
              size="small"
            />
          );
        case FieldType.Link:
          return (
            <Input
              type="url"
              value={value}
              onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
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
              onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
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
              onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
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
      if (isPreview) return null;
      return (
        <span
          className="editable-field-placeholder"
          onDoubleClick={() => handleFieldDoubleClick(field.id)}
        >
          {field.name}...
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
              <Tag key={i} color={colorScheme.primary} style={{ color: '#fff', fontSize: 11 }}>{tag.trim()}</Tag>
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
            <img src={value} alt="" style={{ maxWidth: '100%', maxHeight: 80 }} />
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

  /** 渲染装饰元素覆盖层 */
  const renderDecorations = () => {
    if (!block.decorations || block.decorations.length === 0) return null;

    return (
      <div className="free-block-decorations">
        {block.decorations.map((deco) => {
          const def = presetDecorations.find((d) => d.id === deco.decorationId);
          if (!def) return null;
          const isDashed = deco.decorationId.includes('dashed');
          return (
            <svg
              key={deco.id}
              className="free-block-decoration"
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

  // 计算块内容区域的背景色
  const contentBgColor = blockStyle.backgroundColor || colorScheme.blockBackground;

  // 外部容器样式：包含外边距的定位区域
  const rotation = block.rotation || 0;
  const outerStyle: React.CSSProperties = {
    position: 'absolute',
    left: block.x - (margin.left || 0),
    top: block.y - (margin.top || 0),
    width: block.width + (margin.left || 0) + (margin.right || 0),
    height: block.height + (margin.top || 0) + (margin.bottom || 0),
    zIndex: block.zIndex,
    ...(rotation ? {
      transform: `rotate(${rotation}deg)`,
      transformOrigin: `${(block.width + (margin.left || 0) + (margin.right || 0)) / 2}px ${(block.height + (margin.top || 0) + (margin.bottom || 0)) / 2}px`,
    } : {}),
  };

  // 内部内容区样式
  const innerStyle: React.CSSProperties = {
    position: 'relative',
    width: block.width,
    height: block.height,
    marginLeft: margin.left || 0,
    marginTop: margin.top || 0,
    overflow: 'hidden',
    backgroundColor: contentBgColor,
    borderRadius: blockStyle.borderRadius ?? 6,
    opacity: blockStyle.opacity ?? 1,
    border: blockStyle.borderWidth ? `${blockStyle.borderWidth}px solid ${blockStyle.borderColor || '#e5e7eb'}` : undefined,
    ...(blockStyle.backgroundImage ? {
      backgroundImage: `url(${blockStyle.backgroundImage})`,
      backgroundSize: blockStyle.backgroundSize || 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    } : {}),
  };

  // 内容区内边距
  const contentPaddingStyle: React.CSSProperties = {
    padding: `${padding.top || 0}px ${padding.right || 0}px ${padding.bottom || 0}px ${padding.left || 0}px`,
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <div
      ref={cardRef}
      className={`free-block-card ${isPreview ? 'preview-mode' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${isGroupSelected && !isSelected ? 'group-selected' : ''} ${isHovered && !isPreview ? 'hovered' : ''} ${block.locked ? 'locked' : ''}`}
      style={outerStyle}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
      onMouseDown={(e) => {
        if (!isPreview && !block.locked) {
          onDragStart(e);
        }
      }}
      onMouseEnter={() => {
        if (!isPreview) {
          setIsHovered(true);
          onMouseEnter();
        }
      }}
      onMouseLeave={() => {
        if (!isPreview) {
          setIsHovered(false);
          onMouseLeave();
        }
      }}
    >
      {/* 外边距区域（编辑模式下用暗色显示） */}
      {hasMargin && !isPreview && (
        <div
          className="free-block-margin-area"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: MARGIN_INDICATOR_COLOR,
            borderRadius: blockStyle.borderRadius ?? 6,
            border: `1px dashed ${MARGIN_INDICATOR_BORDER_COLOR}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 内部内容区 */}
      <div style={innerStyle}>
        {/* 选中边框 */}
        {isSelected && !isPreview && (
          <div className="free-block-selection-border" />
        )}

        {/* 分组选中边框 */}
        {isGroupSelected && !isSelected && !isPreview && (
          <div className="free-block-group-border" />
        )}

        {/* 装饰元素渲染层 */}
        {renderDecorations()}

        {/* 工具栏 - 编辑模式hover/选中时显示 */}
        {!isPreview && (isHovered || isSelected) && (
          <div className="free-block-toolbar">
            <span className="free-block-name">{block.name}</span>
            <div className="free-block-actions">
              {block.groupId && (
                <GroupOutlined className="free-block-group-icon" />
              )}
              {block.locked && (
                <LockOutlined className="free-block-lock-icon" />
              )}
              {!block.visible && (
                <EyeInvisibleOutlined className="free-block-hidden-icon" />
              )}
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                className="free-block-action-btn"
                onClick={(e) => { e.stopPropagation(); cloneBlock(block.id); }}
              />
              <Popconfirm
                title="确认删除该元素？"
                onConfirm={(e) => { e?.stopPropagation(); removeBlock(block.id); }}
                onCancel={(e) => e?.stopPropagation()}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  className="free-block-action-btn"
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </div>
          </div>
        )}

        {/* 块内容（含内边距） */}
        <div style={contentPaddingStyle}>
          {isHeaderInfo ? (
            <div className="free-block-header-info">
              {fields.find((f) => f.name === '头像') && (
                <div
                  className="free-block-header-avatar"
                  onClick={(e) => {
                    if (isPreview) return;
                    e.stopPropagation();
                    handleAvatarUpload(fields.find((f) => f.name === '头像')!.id);
                  }}
                >
                  {block.fields[fields.find((f) => f.name === '头像')!.id] ? (
                    <img src={block.fields[fields.find((f) => f.name === '头像')!.id]} alt="头像" />
                  ) : (
                    <div className="free-block-header-avatar-placeholder">
                      {block.fields[fields.find((f) => f.name === '姓名')?.id || '']?.[0] || <CameraOutlined style={{ fontSize: 18 }} />}
                    </div>
                  )}
                </div>
              )}
              <div className="free-block-header-info-main">
                {fields.find((f) => f.name === '姓名') && (
                  <div className="free-block-header-name">
                    {renderEditableField(fields.find((f) => f.name === '姓名')!, block.fields[fields.find((f) => f.name === '姓名')!.id])}
                  </div>
                )}
                {fields.find((f) => f.name === '职位') && (
                  <div className="free-block-header-title">
                    {renderEditableField(fields.find((f) => f.name === '职位')!, block.fields[fields.find((f) => f.name === '职位')!.id])}
                  </div>
                )}
                {fields.find((f) => f.name === '一句话简介') && (
                  <div className="free-block-header-bio">
                    {renderEditableField(fields.find((f) => f.name === '一句话简介')!, block.fields[fields.find((f) => f.name === '一句话简介')!.id])}
                  </div>
                )}
                <div className="free-block-header-contacts">
                  {fields
                    .filter((f) => !['头像', '姓名', '职位', '一句话简介'].includes(f.name))
                    .map((field) => {
                      const value = block.fields[field.id];
                      if (!value || value.trim() === '') return null;
                      return (
                        <span key={field.id} className="free-block-header-contact-item">
                          {renderEditableField(field, value)}
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : isBasicInfo ? (
            <div className="free-block-basic-info">
              {fields.find((f) => f.type === FieldType.Image) && (
                <div className="free-block-avatar">
                  {block.fields[fields.find((f) => f.type === FieldType.Image)!.id] ? (
                    <img src={block.fields[fields.find((f) => f.type === FieldType.Image)!.id]} alt="头像" />
                  ) : (
                    <div className="free-block-avatar-placeholder">
                      {block.fields[fields.find((f) => f.name === '姓名')?.id || '']?.[0] || '?'}
                    </div>
                  )}
                </div>
              )}
              <div className="free-block-basic-info-content">
                {fields.find((f) => f.name === '姓名') && (
                  <div className="free-block-name-field">
                    {renderEditableField(fields.find((f) => f.name === '姓名')!, block.fields[fields.find((f) => f.name === '姓名')!.id])}
                  </div>
                )}
                <div className="free-block-contact-list">
                  {fields
                    .filter((f) => f.name !== '姓名' && f.name !== '头像')
                    .map((field) => {
                      const value = block.fields[field.id];
                      if (!value || value.trim() === '') return null;
                      return (
                        <span key={field.id} className="free-block-contact-item">
                          <span className="free-block-contact-label">{field.name}:</span>{' '}
                          {renderEditableField(field, value)}
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : isSkills ? (
            <div className="free-block-skills">
              {fields.map((field) => {
                const value = block.fields[field.id];
                return (
                  <div key={field.id} className="free-block-skill-item">
                    <span className="free-block-skill-name">
                      {renderEditableField(field, value)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="free-block-fields">
              {fields.map((field) => {
                const value = block.fields[field.id];
                const isTitleField = ['公司名', '学校', '项目名', '名称'].includes(field.name);
                const isTimeField = ['开始时间', '结束时间', '时间'].includes(field.name);
                const isSubtitleField = ['职位', '学位', '专业', '角色'].includes(field.name);

                if (isTitleField) {
                  return (
                    <div key={field.id} className="free-block-field-title-row">
                      {renderEditableField(field, value)}
                    </div>
                  );
                }

                if (isTimeField) {
                  return (
                    <span key={field.id} className="free-block-field-time">
                      {renderEditableField(field, value)}
                      {field.name === '开始时间' && block.fields[fields.find(f => f.name === '结束时间')?.id || ''] ? ' - ' : ''}
                    </span>
                  );
                }

                if (isSubtitleField) {
                  return (
                    <div key={field.id} className="free-block-field-subtitle">
                      {renderEditableField(field, value)}
                    </div>
                  );
                }

                if (field.name === '是否至今' && value === 'true') {
                  return <span key={field.id} className="free-block-field-time">至今</span>;
                }

                return (
                  <div key={field.id} className="free-block-field-row">
                    <span className="free-block-field-label">{field.name}</span>
                    <div className="free-block-field-value">
                      {renderEditableField(field, value)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 调整大小手柄 - 选中时显示 */}
        {isSelected && !isPreview && !block.locked && (
          <>
            <div className="free-block-resize-handle se" onMouseDown={(e) => onResizeStart('se', e)} />
            <div className="free-block-resize-handle e" onMouseDown={(e) => onResizeStart('e', e)} />
            <div className="free-block-resize-handle s" onMouseDown={(e) => onResizeStart('s', e)} />
            <div className="free-block-resize-handle ne" onMouseDown={(e) => onResizeStart('ne', e)} />
            <div className="free-block-resize-handle nw" onMouseDown={(e) => onResizeStart('nw', e)} />
            <div className="free-block-resize-handle sw" onMouseDown={(e) => onResizeStart('sw', e)} />
            <div className="free-block-resize-handle n" onMouseDown={(e) => onResizeStart('n', e)} />
            <div className="free-block-resize-handle w" onMouseDown={(e) => onResizeStart('w', e)} />
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useCallback, useRef } from 'react';
import { CameraOutlined } from '@ant-design/icons';
import type { BlockInstance, BlockTemplate, ColorScheme } from '@/types';
import { FieldType } from '@/types';
import { MARGIN_INDICATOR_COLOR, MARGIN_INDICATOR_BORDER_COLOR } from '@/utils/constants';
import { uploadImage } from '@/utils/imageUpload';
import { useResumeStore } from '@/store';
import { useEditableField } from '@/hooks/useEditableField.tsx';
import DecorationSvgRenderer from '@/components/shared/DecorationSvgRenderer';
import { renderIconByName } from '@/utils/iconMap';
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
  const { removeBlock, cloneBlock, updateBlockField } = useResumeStore();
  const cardRef = useRef<HTMLDivElement>(null);

  // 可编辑字段 Hook
  const { renderEditableField } = useEditableField({
    isPreview,
    isLocked: block.locked,
    blockId: block.id,
    updateBlockField,
    colorScheme,
  });

  // 判断是否为自定义装饰块
  const isCustomDecorationBlock = block.templateId === 'custom-decoration';
  // 判断是否为 antd 图标块
  const isIconBlock = block.templateId === 'antd-icon';

  if (!template && !isCustomDecorationBlock && !isIconBlock) return null;

  const fields = template ? [...template.fields].sort((a, b) => a.order - b.order) : [];
  const blockStyle = block.style || {};
  const margin = blockStyle.margin || { top: 0, right: 0, bottom: 0, left: 0 };
  const padding = blockStyle.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const hasMargin = margin.top > 0 || margin.right > 0 || margin.bottom > 0 || margin.left > 0;

  // 头像上传处理
  const handleAvatarUpload = useCallback(async (fieldId: string) => {
    const result = await uploadImage();
    if (result) {
      updateBlockField(block.id, fieldId, result);
    }
  }, [block.id, updateBlockField]);

  const isHeaderInfo = template?.name === '头部信息';
  const isBasicInfo = template?.name === '基本信息';
  const isSkills = template?.name === '技能';
  const isBasicCategory = template?.category === '基础组件';

  // 装饰渲染已抽取到 DecorationSvgRenderer 组件

  // 计算块内容区域的背景色
  // 自定义装饰块始终透明；基础组件默认透明（用户可手动设置覆盖）；组合组件使用主题色块背景
  const defaultBgColor = isCustomDecorationBlock || isIconBlock ? 'transparent'
    : isBasicCategory ? 'transparent'
    : colorScheme.blockBackground;
  const contentBgColor = blockStyle.backgroundColor || defaultBgColor;

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
    borderRadius: (isCustomDecorationBlock || isIconBlock || isBasicCategory) && blockStyle.borderRadius === undefined ? 0 : (blockStyle.borderRadius ?? 6),
    opacity: blockStyle.opacity ?? 1,
    border: (isCustomDecorationBlock || isIconBlock || isBasicCategory) && !blockStyle.borderWidth ? 'none' : (blockStyle.borderWidth ? `${blockStyle.borderWidth}px ${blockStyle.borderStyle || 'solid'} ${blockStyle.borderColor || '#e5e7eb'}` : undefined),
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

      {/* 覆盖层：选中边框、分组边框 —— 放在 innerStyle 外部以避免被 overflow:hidden 裁切 */}
      {/* 选中边框 */}
      {isSelected && !isPreview && (
        <div className="free-block-selection-border" style={{ top: (margin.top || 0) - 1, left: (margin.left || 0) - 1 }} />
      )}

      {/* 分组选中边框 */}
      {isGroupSelected && !isSelected && !isPreview && (
        <div className="free-block-group-border" style={{ top: (margin.top || 0) - 1, left: (margin.left || 0) - 1 }} />
      )}

      {/* 内部内容区 */}
      <div style={innerStyle}>
        {/* 装饰元素渲染层 */}
        <DecorationSvgRenderer decorations={block.decorations} isPreview={isPreview} />

        {/* 块内容（含内边距） */}
        <div style={contentPaddingStyle}>
          {isCustomDecorationBlock ? (
            // 自定义装饰块：不渲染字段内容，装饰 SVG 已在 renderDecorations 中渲染
            null
          ) : isIconBlock ? (
            // 图标块：渲染 antd 图标，颜色和字体大小可自定义
            (() => {
              const iconColor = block.fields['icon-color'] || colorScheme.primary;
              const iconFontSize = Number(block.fields['icon-font-size']) || Math.min(block.width, block.height);
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  color: iconColor,
                }}>
                  {renderIconByName(block.fields['icon-name'] || 'StarOutlined', {
                    style: { fontSize: iconFontSize, color: iconColor },
                  })}
                </div>
              );
            })()
          ) : isHeaderInfo ? (
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
          ) : isBasicCategory ? (
            /* 基础组件：直接渲染内容，不显示字段标签 */
            <div className="free-block-basic-content">
              {fields.map((field) => {
                const value = block.fields[field.id];
                return (
                  <div key={field.id} className="free-block-basic-field">
                    {renderEditableField(field, value)}
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

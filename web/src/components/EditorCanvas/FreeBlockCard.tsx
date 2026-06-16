import { useState, useCallback, useMemo, useRef } from 'react';
import { CameraOutlined } from '@ant-design/icons';
import type { BlockInstance, BlockTemplate, ColorScheme, FieldDefinition } from '@/types';
import { FieldType } from '@/types';
import { MARGIN_INDICATOR_COLOR, MARGIN_INDICATOR_BORDER_COLOR, DEFAULT_BORDER_COLOR, BLOCK_DEFAULT_BORDER_RADIUS, TPL_CUSTOM_DECORATION, TPL_ICON, TPL_AVATAR, TPL_FLEXBOX } from '@/utils/constants';
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
  isFlexboxDropTarget?: boolean;
  colorScheme: ColorScheme;
  mode?: 'edit' | 'preview';
  onSelect: (e?: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (direction: string, e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

// ===== 字段名称 → 渲染角色分类 =====
const TITLE_NAMES = new Set(['公司名', '学校', '项目名', '名称']);
const TIME_NAMES = new Set(['开始时间', '结束时间', '时间']);
const SUBTITLE_NAMES = new Set(['职位', '学位', '专业', '角色']);
const HEADER_EXCLUDE_NAMES = new Set(['头像', '姓名', '职位', '一句话简介']);

/**
 * 构建字段名到字段定义的映射，避免重复的 fields.find() 调用
 */
function buildFieldByName(fields: FieldDefinition[]): Map<string, FieldDefinition> {
  const map = new Map<string, FieldDefinition>();
  for (const f of fields) {
    map.set(f.name, f);
  }
  return map;
}

export default function FreeBlockCard({
  block,
  template,
  isSelected,
  isDragging,
  isResizing,
  isGroupSelected,
  isFlexboxDropTarget = false,
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
  const { updateBlockField } = useResumeStore();
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
  const isCustomDecorationBlock = block.templateId === TPL_CUSTOM_DECORATION;
  // 判断是否为 antd 图标块
  const isIconBlock = block.templateId === TPL_ICON;
  // 判断是否为头像块
  const isAvatarBlock = block.templateId === TPL_AVATAR;
  // 判断是否为弹性盒子块
  const isFlexboxBlock = block.templateId === TPL_FLEXBOX;

  if (!template && !isCustomDecorationBlock && !isIconBlock) return null;

  const fields = template ? [...template.fields].sort((a, b) => a.order - b.order) : [];
  const fieldByName = useMemo(() => buildFieldByName(fields), [fields]);
  const blockFields = block.fields;
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
  const isLayoutCategory = template?.category === '布局组件';
  const isBasicCategory = template?.category === '基础组件';

  // 装饰渲染已抽取到 DecorationSvgRenderer 组件

  // 计算块内容区域的背景色
  const isTransparentBg = isCustomDecorationBlock || isIconBlock || isFlexboxBlock || isBasicCategory;
  const defaultBgColor = isTransparentBg ? 'transparent' : colorScheme.blockBackground;
  const contentBgColor = blockStyle.backgroundColor || defaultBgColor;

  // 外部容器样式：包含外边距的定位区域
  const rotation = block.rotation || 0;
  const totalWidth = block.width + (margin.left || 0) + (margin.right || 0);
  const totalHeight = block.height + (margin.top || 0) + (margin.bottom || 0);
  const outerStyle: React.CSSProperties = {
    position: 'absolute',
    left: block.x - (margin.left || 0),
    top: block.y - (margin.top || 0),
    width: totalWidth,
    height: totalHeight,
    zIndex: block.zIndex,
    ...(rotation ? {
      transform: `rotate(${rotation}deg)`,
      transformOrigin: `${totalWidth / 2}px ${totalHeight / 2}px`,
    } : {}),
  };

  // 内部内容区样式
  const innerStyle: React.CSSProperties = {
    position: 'relative',
    width: block.width,
    height: block.height,
    marginLeft: margin.left || 0,
    marginTop: margin.top || 0,
    overflow: isFlexboxBlock ? 'visible' : 'hidden',
    backgroundColor: contentBgColor,
    color: blockStyle.color || colorScheme.textPrimary,
    borderRadius: isTransparentBg && blockStyle.borderRadius === undefined ? 0 : (blockStyle.borderRadius ?? BLOCK_DEFAULT_BORDER_RADIUS),
    opacity: blockStyle.opacity ?? 1,
    border: isTransparentBg && !blockStyle.borderWidth ? 'none' : (blockStyle.borderWidth ? `${blockStyle.borderWidth}px ${blockStyle.borderStyle || 'solid'} ${blockStyle.borderColor || DEFAULT_BORDER_COLOR}` : undefined),
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

  // ===== 辅助渲染函数 =====

  /** 按字段名查找并渲染可编辑字段 */
  const renderFieldByName = (name: string): React.ReactNode => {
    const field = fieldByName.get(name);
    if (!field) return null;
    return renderEditableField(field, blockFields[field.id]);
  };

  /** 按字段名获取值 */
  const getFieldValue = (name: string): string | undefined => {
    const field = fieldByName.get(name);
    return field ? blockFields[field.id] : undefined;
  };

  /** 按字段名获取字段定义 */
  const getField = (name: string): FieldDefinition | undefined => fieldByName.get(name);

  /** 渲染头像区域（头部信息和基本信息共用） */
  const renderAvatar = (
    imageFieldName: string,
    nameFieldName: string,
    avatarClassName: string,
    placeholderClassName: string,
    onImageClick?: (fieldId: string) => void,
  ) => {
    const imageField = getField(imageFieldName);
    const nameField = getField(nameFieldName);
    if (!imageField) return null;

    const imageValue = blockFields[imageField.id];
    const nameValue = nameField ? blockFields[nameField.id] : '';

    return (
      <div
        className={avatarClassName}
        onClick={onImageClick ? (e) => { if (isPreview) return; e.stopPropagation(); onImageClick(imageField.id); } : undefined}
      >
        {imageValue ? (
          <img src={imageValue} alt="头像" />
        ) : (
          <div className={placeholderClassName}>
            {nameValue?.[0] || <CameraOutlined style={{ fontSize: 18 }} />}
          </div>
        )}
      </div>
    );
  };

  // ===== 模板渲染函数 =====

  /** 头部信息块渲染 */
  const renderHeaderInfo = () => (
    <div className="free-block-header-info">
      {renderAvatar('头像', '姓名', 'free-block-header-avatar', 'free-block-header-avatar-placeholder', handleAvatarUpload)}
      <div className="free-block-header-info-main">
        {getField('姓名') && (
          <div className="free-block-header-name">{renderFieldByName('姓名')}</div>
        )}
        {getField('职位') && (
          <div className="free-block-header-title">{renderFieldByName('职位')}</div>
        )}
        {getField('一句话简介') && (
          <div className="free-block-header-bio">{renderFieldByName('一句话简介')}</div>
        )}
        <div className="free-block-header-contacts">
          {fields
            .filter((f) => !HEADER_EXCLUDE_NAMES.has(f.name))
            .map((field) => {
              const value = blockFields[field.id];
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
  );

  /** 基本信息块渲染 */
  const renderBasicInfo = () => (
    <div className="free-block-basic-info">
      {fields.find((f) => f.type === FieldType.Image) && (
        renderAvatar(
          fields.find((f) => f.type === FieldType.Image)!.name,
          '姓名',
          'free-block-avatar',
          'free-block-avatar-placeholder',
        )
      )}
      <div className="free-block-basic-info-content">
        {getField('姓名') && (
          <div className="free-block-name-field">{renderFieldByName('姓名')}</div>
        )}
        <div className="free-block-contact-list">
          {fields
            .filter((f) => f.name !== '姓名' && f.type !== FieldType.Image)
            .map((field) => {
              const value = blockFields[field.id];
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
  );

  /** 技能块渲染 */
  const renderSkills = () => (
    <div className="free-block-skills">
      {fields.map((field) => (
        <div key={field.id} className="free-block-skill-item">
          <span className="free-block-skill-name">
            {renderEditableField(field, blockFields[field.id])}
          </span>
        </div>
      ))}
    </div>
  );

  /** 基础组件渲染（不显示字段标签） */
  const renderBasicContent = () => (
    <div className="free-block-basic-content">
      {fields.map((field) => (
        <div key={field.id} className="free-block-basic-field">
          {renderEditableField(field, blockFields[field.id])}
        </div>
      ))}
    </div>
  );

  /** 头像块渲染 */
  const renderAvatarBlock = () => {
    const src = blockFields['avatar-src'] || '';
    const shape = blockFields['avatar-shape'] || 'circle';
    const borderWidth = Number(blockFields['avatar-border-width']) || 0;
    const borderColor = blockFields['avatar-border-color'] || '#e5e7eb';
    const size = Math.min(block.width, block.height);
    const borderRadius = shape === 'circle' ? '50%' : (blockStyle.borderRadius ?? 6);

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={!isPreview ? (e) => {
          e.stopPropagation();
          handleAvatarUpload('avatar-src');
        } : undefined}
      >
        {src ? (
          <img
            src={src}
            alt="头像"
            style={{
              width: size - borderWidth * 2,
              height: size - borderWidth * 2,
              borderRadius,
              objectFit: 'cover',
              border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
            }}
          />
        ) : (
          <div
            style={{
              width: size - borderWidth * 2,
              height: size - borderWidth * 2,
              borderRadius,
              border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : '2px dashed #d1d5db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f3f4f6',
              color: '#9ca3af',
            }}
          >
            <CameraOutlined style={{ fontSize: Math.max(16, size * 0.25) }} />
          </div>
        )}
      </div>
    );
  };

  /** 弹性盒子块渲染 */
  const renderFlexboxBlock = () => {
    const flexDirection = blockFields['flex-direction'] || 'row';
    const justifyContent = blockFields['justify-content'] || 'flex-start';
    const alignItems = blockFields['align-items'] || 'stretch';
    const flexWrap = blockFields['flex-wrap'] || 'nowrap';
    const gap = Number(blockFields['gap']) || 0;

    // 获取弹性盒子的子块（通过 groupId 关联的块）
    const { resume: storeResume, blockTemplates: storeTemplates } = useResumeStore.getState();
    const childBlocks = storeResume?.blocks.filter(
      (b) => b.groupId === block.id && b.visible
    ) || [];

    return (
      <div
        className="free-block-flexbox"
        style={{
          display: 'flex',
          flexDirection: flexDirection as React.CSSProperties['flexDirection'],
          justifyContent: justifyContent as React.CSSProperties['justifyContent'],
          alignItems: alignItems as React.CSSProperties['alignItems'],
          flexWrap: flexWrap as React.CSSProperties['flexWrap'],
          gap: `${gap}px`,
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {childBlocks.length > 0 ? (
          childBlocks.map((child) => {
            const childTemplate = storeTemplates.find(t => t.id === child.templateId);
            return (
              <FlexboxChildRenderer
                key={child.id}
                child={child}
                template={childTemplate}
                colorScheme={colorScheme}
                isPreview={isPreview}
              />
            );
          })
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d1d5db',
            fontSize: 12,
            border: '2px dashed #e5e7eb',
            borderRadius: 8,
          }}>
            弹性盒子容器
          </div>
        )}
      </div>
    );
  };

  /** 图标块渲染 */
  const renderIconBlock = () => {
    const iconColor = blockFields['icon-color'] || colorScheme.primary;
    const iconFontSize = Number(blockFields['icon-font-size']) || Math.min(block.width, block.height);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        color: iconColor,
      }}>
        {renderIconByName(blockFields['icon-name'] || 'StarOutlined', {
          style: { fontSize: iconFontSize, color: iconColor },
        })}
      </div>
    );
  };

  /** 组合组件渲染（带字段标签） */
  const renderCompositeFields = () => {
    const endTimeField = getField('结束时间');
    return (
      <div className="free-block-fields">
        {fields.map((field) => {
          const value = blockFields[field.id];

          if (TITLE_NAMES.has(field.name)) {
            return (
              <div key={field.id} className="free-block-field-title-row">
                {renderEditableField(field, value)}
              </div>
            );
          }

          if (TIME_NAMES.has(field.name)) {
            return (
              <span key={field.id} className="free-block-field-time">
                {renderEditableField(field, value)}
                {field.name === '开始时间' && endTimeField && blockFields[endTimeField.id] ? ' - ' : ''}
              </span>
            );
          }

          if (SUBTITLE_NAMES.has(field.name)) {
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
    );
  };

  /** 根据模板类型选择对应的渲染函数 */
  const renderBlockContent = () => {
    if (isCustomDecorationBlock) return null;
    if (isIconBlock) return renderIconBlock();
    if (isAvatarBlock) return renderAvatarBlock();
    if (isFlexboxBlock) return renderFlexboxBlock();
    if (isHeaderInfo) return renderHeaderInfo();
    if (isBasicInfo) return renderBasicInfo();
    if (isSkills) return renderSkills();
    if (isBasicCategory) return renderBasicContent();
    return renderCompositeFields();
  };

  return (
    <div
      ref={cardRef}
      className={`free-block-card ${isPreview ? 'preview-mode' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${isGroupSelected && !isSelected ? 'group-selected' : ''} ${isHovered && !isPreview ? 'hovered' : ''} ${block.locked ? 'locked' : ''} ${isFlexboxDropTarget && isFlexboxBlock ? 'flexbox-drop-target' : ''}`}
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
            borderRadius: blockStyle.borderRadius ?? BLOCK_DEFAULT_BORDER_RADIUS,
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

        {/* 弹性盒子拖入高亮指示层 */}
        {isFlexboxDropTarget && isFlexboxBlock && !isPreview && (
          <div
            className="free-block-flexbox-drop-highlight"
            style={{
              position: 'absolute',
              top: (margin.top || 0) - 1,
              left: (margin.left || 0) - 1,
              right: -(margin.right || 0) - 1,
              bottom: -(margin.bottom || 0) - 1,
              border: '2px dashed #1677ff',
              borderRadius: blockStyle.borderRadius ?? 4,
              backgroundColor: 'rgba(22, 119, 255, 0.06)',
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />
        )}

        {/* 内部内容区 */}
        <div style={innerStyle}>
        {/* 装饰元素渲染层 */}
        <DecorationSvgRenderer decorations={block.decorations} isPreview={isPreview} />

        {/* 块内容（含内边距） */}
        <div style={contentPaddingStyle}>
          {renderBlockContent()}
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

// ========== 弹性盒子子元素渲染器 ==========
/** 弹性盒子内子元素的简化渲染 */
function FlexboxChildRenderer({
  child,
  template,
  colorScheme,
  isPreview,
}: {
  child: BlockInstance;
  template: BlockTemplate | undefined;
  colorScheme: ColorScheme;
  isPreview: boolean;
}) {
  const childFields = child.fields;
  const childStyle = child.style || {};
  const { selectBlock } = useResumeStore();

  // 默认背景色：基础组件和图标透明，其他跟随主题
  const isBasicCategory = template?.category === '基础组件';
  const isIconBlock = child.templateId === TPL_ICON;
  const isAvatarBlock = child.templateId === TPL_AVATAR;
  const isCustomDecorationBlock = child.templateId === TPL_CUSTOM_DECORATION;
  const isTransparentBg = isIconBlock || isAvatarBlock || isBasicCategory || isCustomDecorationBlock;
  const defaultBgColor = isTransparentBg ? 'transparent' : colorScheme.blockBackground;
  const contentBgColor = childStyle.backgroundColor || defaultBgColor;

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    flex: '0 0 auto',
    minWidth: child.width,
    minHeight: child.height,
    overflow: 'hidden',
    cursor: isPreview ? 'default' : 'pointer',
  };

  const contentStyle: React.CSSProperties = {
    width: child.width,
    height: child.height,
    backgroundColor: contentBgColor,
    color: childStyle.color || colorScheme.textPrimary,
    borderRadius: isTransparentBg && childStyle.borderRadius === undefined ? 0 : (childStyle.borderRadius ?? 4),
    opacity: childStyle.opacity ?? 1,
    border: isTransparentBg && !childStyle.borderWidth ? 'none' : (childStyle.borderWidth ? `${childStyle.borderWidth}px ${childStyle.borderStyle || 'solid'} ${childStyle.borderColor || DEFAULT_BORDER_COLOR}` : undefined),
    overflow: isCustomDecorationBlock ? 'visible' : 'hidden',
    ...(isCustomDecorationBlock ? { padding: 0 } : { padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, lineHeight: 1.3, wordBreak: 'break-all' }),
  };

  // 渲染子块的内容
  const renderChildContent = () => {
    // 自定义装饰块渲染（通过 DecorationSvgRenderer）
    if (isCustomDecorationBlock) {
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <DecorationSvgRenderer decorations={child.decorations} isPreview={isPreview} />
        </div>
      );
    }

    if (isIconBlock) {
      const iconColor = childFields['icon-color'] || colorScheme.primary;
      const iconFontSize = Number(childFields['icon-font-size']) || Math.min(child.width, child.height);
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: iconColor }}>
          {renderIconByName(childFields['icon-name'] || 'StarOutlined', {
            style: { fontSize: Math.min(iconFontSize, Math.min(child.width, child.height) - 8), color: iconColor },
          })}
        </div>
      );
    }

    if (isAvatarBlock) {
      const src = childFields['avatar-src'] || '';
      const shape = childFields['avatar-shape'] || 'circle';
      const borderWidth = Number(childFields['avatar-border-width']) || 0;
      const borderColor = childFields['avatar-border-color'] || '#e5e7eb';
      const size = Math.min(child.width, child.height) - 8;
      const borderRadius = shape === 'circle' ? '50%' : (childStyle.borderRadius ?? 4);
      if (src) {
        return <img src={src} alt="头像" style={{ width: size, height: size, borderRadius, objectFit: 'cover', border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none' }} />;
      }
      return (
        <CameraOutlined style={{ fontSize: Math.max(12, size * 0.3), color: '#9ca3af' }} />
      );
    }

    // 基础组件渲染（文本等）
    if (isBasicCategory && template) {
      const fields = [...template.fields].sort((a, b) => a.order - b.order);
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          {fields.map((field) => {
            const value = childFields[field.id];
            if (!value) return null;
            if (field.type === FieldType.RichText) {
              return <div key={field.id} dangerouslySetInnerHTML={{ __html: value }} style={{ fontSize: 10, lineHeight: 1.3 }} />;
            }
            if (field.type === FieldType.TagList) {
              const tags = value.split(',').filter(Boolean);
              return (
                <div key={field.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {tags.map((tag, i) => (
                    <span key={i} style={{ fontSize: 9, padding: '1px 4px', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 2 }}>{tag}</span>
                  ))}
                </div>
              );
            }
            if (field.type === FieldType.Image) {
              return <img key={field.id} src={value} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />;
            }
            if (field.type === FieldType.Rating) {
              const num = parseInt(value) || 0;
              return (
                <div key={field.id} style={{ display: 'flex', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} style={{ fontSize: 8, opacity: num >= star ? 1 : 0.3 }}>⭐</span>
                  ))}
                </div>
              );
            }
            return <span key={field.id} style={{ fontSize: 10 }}>{value}</span>;
          })}
        </div>
      );
    }

    // 组合组件渲染（带字段标签）
    if (template) {
      const fields = [...template.fields].sort((a, b) => a.order - b.order);
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          {fields.slice(0, 3).map((field) => {
            const value = childFields[field.id];
            if (!value) return null;
            if (TITLE_NAMES.has(field.name)) {
              return <div key={field.id} style={{ fontWeight: 600, fontSize: 10 }}>{value}</div>;
            }
            if (SUBTITLE_NAMES.has(field.name)) {
              return <div key={field.id} style={{ fontSize: 9, color: colorScheme.textSecondary }}>{value}</div>;
            }
            if (TIME_NAMES.has(field.name)) {
              return <span key={field.id} style={{ fontSize: 8, color: colorScheme.textMuted }}>{value}</span>;
            }
            if (field.type === FieldType.RichText) {
              return <div key={field.id} dangerouslySetInnerHTML={{ __html: value }} style={{ fontSize: 9, lineHeight: 1.2, color: colorScheme.textSecondary }} />;
            }
            if (field.type === FieldType.TagList) {
              const tags = value.split(',').filter(Boolean);
              return (
                <div key={field.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {tags.map((tag, i) => (
                    <span key={i} style={{ fontSize: 8, padding: '0 3px', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 2 }}>{tag}</span>
                  ))}
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }

    // 其他无模板的块
    return (
      <div style={{ fontSize: 9, color: '#9ca3af' }}>{child.name}</div>
    );
  };

  return (
    <div
      style={containerStyle}
      onClick={(e) => {
        if (isPreview) return;
        e.stopPropagation();
        selectBlock(child.id);
      }}
      draggable={!isPreview}
      onDragStart={(e) => {
        if (isPreview) return;
        e.stopPropagation();
        e.dataTransfer.setData('blockId', child.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div style={contentStyle}>
        {renderChildContent()}
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { Input, Select, Rate } from 'antd';
import type { FieldDefinition, ColorScheme } from '@/types';
import { FieldType } from '@/types';
import InlineRichTextEditor from './InlineRichTextEditor';

interface UseEditableFieldOptions {
  /** 是否为预览模式 */
  isPreview: boolean;
  /** 块是否被锁定 */
  isLocked: boolean;
  /** 块实例ID */
  blockId: string;
  /** 更新块字段值的回调 */
  updateBlockField: (blockId: string, fieldId: string, value: string) => void;
  /** 配色方案 */
  colorScheme: ColorScheme;
}

/**
 * 可编辑字段 Hook
 *
 * 封装了字段的双击编辑、失焦退出编辑、以及不同字段类型的渲染逻辑。
 * 支持的编辑态字段：Text, TextArea, Select, Rating, Date, Link, TagList, RichText
 * 支持的只读态字段：RichText, TagList, Rating, Image, Switch, Link, Text
 */
export function useEditableField(options: UseEditableFieldOptions) {
  const { isPreview, isLocked, blockId, updateBlockField, colorScheme } = options;

  const [editingField, setEditingField] = useState<string | null>(null);

  /** 双击进入编辑 */
  const handleFieldDoubleClick = useCallback(
    (fieldId: string) => {
      if (!isLocked) {
        setEditingField(fieldId);
      }
    },
    [isLocked],
  );

  /** 失焦退出编辑 */
  const handleFieldBlur = useCallback(() => {
    setEditingField(null);
  }, []);

  /**
   * 渲染可编辑字段
   *
   * 根据编辑态/只读态和字段类型返回对应的 React 节点。
   */
  const renderEditableField = (field: FieldDefinition, value: string) => {
    const isEditing = !isPreview && editingField === field.id;

    // ===== 编辑态 =====
    if (isEditing) {
      switch (field.type) {
        case FieldType.RichText:
          return (
            <InlineRichTextEditor
              value={value}
              onChange={(v) => updateBlockField(blockId, field.id, v)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder}
            />
          );
        case FieldType.TextArea:
          return (
            <Input.TextArea
              value={value}
              onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
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
                updateBlockField(blockId, field.id, val);
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
                updateBlockField(blockId, field.id, String(val));
                setEditingField(null);
              }}
            />
          );
        case FieldType.Date:
          return (
            <Input
              type="month"
              value={value}
              onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
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
              onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
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
              onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
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
              onChange={(e) => updateBlockField(blockId, field.id, e.target.value)}
              onBlur={handleFieldBlur}
              placeholder={field.placeholder}
              autoFocus
              size="small"
            />
          );
      }
    }

    // ===== 只读显示 =====

    // 空值占位
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
              <span key={i} className="ant-tag" style={{ background: colorScheme.primary, color: '#fff', fontSize: 11, borderRadius: 3, padding: '1px 6px' }}>{tag.trim()}</span>
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

  return {
    editingField,
    setEditingField,
    handleFieldDoubleClick,
    handleFieldBlur,
    renderEditableField,
  };
}

import type { BlockInstance, BlockTemplate } from '@/types';
import { FieldType } from '@/types';
import './index.less';

interface BlockRendererProps {
  block: BlockInstance;
  template: BlockTemplate | undefined;
  isSelected: boolean;
  onSelect: () => void;
}

export default function BlockRenderer({
  block,
  template,
  isSelected,
  onSelect,
}: BlockRendererProps) {
  if (!template) return null;

  // 按排序获取字段列表
  const fields = [...template.fields].sort((a, b) => a.order - b.order);

  // 渲染单个字段的值
  const renderFieldValue = (fieldId: string, type: FieldType, value: string) => {
    if (!value || value.trim() === '') {
      return <span className="block-renderer-field-empty">点击填写...</span>;
    }

    switch (type) {
      case FieldType.RichText:
        return (
          <div
            className="block-renderer-field-richtext"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        );

      case FieldType.TagList:
        return (
          <div className="block-renderer-field-tags">
            {value.split(',').filter(Boolean).map((tag, i) => (
              <span key={i} className="block-renderer-tag">{tag.trim()}</span>
            ))}
          </div>
        );

      case FieldType.Image:
        return value ? (
          <div className="block-renderer-field-image">
            <img src={value} alt="" />
          </div>
        ) : null;

      case FieldType.Switch:
        return value === 'true' ? '✓' : '';

      case FieldType.Rating:
        return (
          <div className="block-renderer-field-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`block-renderer-star ${star <= parseInt(value) ? 'filled' : ''}`}
              >
                ★
              </span>
            ))}
          </div>
        );

      case FieldType.Link:
        return (
          <a
            className="block-renderer-field-link"
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        );

      default:
        return value;
    }
  };

  // 根据模板名称决定渲染风格
  const isHeaderInfo = template.name === '头部信息';
  const isBasicInfo = template.name === '基本信息';
  const isSkills = template.name === '技能';

  return (
    <div
      className={`block-renderer ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* 选中指示器 */}
      {isSelected && <div className="block-renderer-selected-indicator" />}

      {/* 块标题 */}
      {!isBasicInfo && !isHeaderInfo && (
        <div className="block-renderer-title">
          <span className="block-renderer-title-text">{block.name}</span>
          {!block.visible && <span className="block-renderer-title-hidden">隐藏</span>}
        </div>
      )}

      {/* 头部信息特殊渲染 */}
      {isHeaderInfo ? (
        <div className="block-renderer-header-info">
          {/* 头像 */}
          {fields.find((f) => f.name === '头像') && (
            <div className="block-renderer-header-avatar">
              {block.fields[fields.find((f) => f.name === '头像')!.id] ? (
                <img
                  src={block.fields[fields.find((f) => f.name === '头像')!.id]}
                  alt="头像"
                />
              ) : (
                <div className="block-renderer-header-avatar-placeholder">
                  {block.fields[fields.find((f) => f.name === '姓名')?.id || '']?.[0] || '?'}
                </div>
              )}
            </div>
          )}
          <div className="block-renderer-header-info-main">
            {/* 姓名 */}
            {fields.find((f) => f.name === '姓名') && block.fields[fields.find((f) => f.name === '姓名')!.id] && (
              <div className="block-renderer-header-name">
                {block.fields[fields.find((f) => f.name === '姓名')!.id]}
              </div>
            )}
            {/* 职位 */}
            {fields.find((f) => f.name === '职位') && block.fields[fields.find((f) => f.name === '职位')!.id] && (
              <div className="block-renderer-header-title">
                {block.fields[fields.find((f) => f.name === '职位')!.id]}
              </div>
            )}
            {/* 一句话简介 */}
            {fields.find((f) => f.name === '一句话简介') && block.fields[fields.find((f) => f.name === '一句话简介')!.id] && (
              <div className="block-renderer-header-bio">
                {block.fields[fields.find((f) => f.name === '一句话简介')!.id]}
              </div>
            )}
            {/* 联系方式 */}
            <div className="block-renderer-header-contacts">
              {fields
                .filter((f) => !['头像', '姓名', '职位', '一句话简介'].includes(f.name))
                .map((field) => {
                  const value = block.fields[field.id];
                  if (!value || value.trim() === '') return null;
                  return (
                    <span key={field.id} className="block-renderer-header-contact-item">
                      {renderFieldValue(field.id, field.type, value)}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>
      ) : isBasicInfo ? (
        <div className="block-renderer-basic-info">
          {/* 头像 */}
          {fields.find((f) => f.type === FieldType.Image) && (
            <div className="block-renderer-avatar">
              {block.fields[fields.find((f) => f.type === FieldType.Image)!.id] ? (
                <img
                  src={block.fields[fields.find((f) => f.type === FieldType.Image)!.id]}
                  alt="头像"
                />
              ) : (
                <div className="block-renderer-avatar-placeholder">
                  {block.fields[fields.find((f) => f.name === '姓名')?.id || '']?.[0] || '?'}
                </div>
              )}
            </div>
          )}
          <div className="block-renderer-basic-info-content">
            {/* 姓名 */}
            {fields.find((f) => f.name === '姓名') && (
              <div className="block-renderer-name">
                {renderFieldValue(
                  fields.find((f) => f.name === '姓名')!.id,
                  FieldType.Text,
                  block.fields[fields.find((f) => f.name === '姓名')!.id]
                )}
              </div>
            )}
            {/* 联系方式 */}
            <div className="block-renderer-contact-list">
              {fields
                .filter((f) => f.name !== '姓名' && f.name !== '头像')
                .map((field) => {
                  const value = block.fields[field.id];
                  if (!value || value.trim() === '') return null;
                  return (
                    <span key={field.id} className="block-renderer-contact-item">
                      {renderFieldValue(field.id, field.type, value)}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>
      ) : isSkills ? (
        /* 技能特殊渲染 */
        <div className="block-renderer-skills">
          {fields.map((field) => {
            const value = block.fields[field.id];
            if (!value || value.trim() === '') return null;
            return (
              <div key={field.id} className="block-renderer-skill-item">
                <span className="block-renderer-skill-name">
                  {renderFieldValue(field.id, field.type, value)}
                </span>
                {field.type === FieldType.Rating && (
                  <div className="block-renderer-skill-rating">
                    {renderFieldValue(field.id, FieldType.Rating, value)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* 通用块渲染 */
        <div className="block-renderer-fields">
          {fields.map((field) => {
            const value = block.fields[field.id];
            if (!value || value.trim() === '') return null;

            // 主标题字段（如公司名、学校名）
            const isTitleField = ['公司名', '学校', '项目名', '名称'].includes(field.name);
            // 时间字段
            const isTimeField = ['开始时间', '结束时间', '时间'].includes(field.name);
            // 次标题字段（如职位、学位）
            const isSubtitleField = ['职位', '学位', '专业', '角色'].includes(field.name);

            if (isTitleField) {
              return (
                <div key={field.id} className="block-renderer-field-title-row">
                  <span className="block-renderer-field-title-value">
                    {renderFieldValue(field.id, field.type, value)}
                  </span>
                </div>
              );
            }

            if (isTimeField) {
              return (
                <span key={field.id} className="block-renderer-field-time">
                  {renderFieldValue(field.id, field.type, value)}
                  {field.name === '开始时间' && block.fields[fields.find(f => f.name === '结束时间')?.id || ''] ? ' - ' : ''}
                </span>
              );
            }

            if (isSubtitleField) {
              return (
                <div key={field.id} className="block-renderer-field-subtitle">
                  {renderFieldValue(field.id, field.type, value)}
                </div>
              );
            }

            // 是否至今
            if (field.name === '是否至今' && value === 'true') {
              return <span key={field.id} className="block-renderer-field-time">至今</span>;
            }

            return (
              <div key={field.id} className="block-renderer-field-row">
                <span className="block-renderer-field-label">{field.name}</span>
                <div className="block-renderer-field-value">
                  {renderFieldValue(field.id, field.type, value)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

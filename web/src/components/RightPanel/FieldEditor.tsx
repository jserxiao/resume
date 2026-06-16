/**
 * 字段编辑器渲染
 *
 * 根据字段类型（FieldType）渲染对应的编辑控件：
 * - RichText → 富文本编辑器
 * - TagList → 标签列表编辑器
 * - TextArea → 多行文本
 * - Date → 月份选择
 * - Image → 图片上传/URL输入
 * - Select → 下拉选择
 * - Switch → 开关
 * - Rating → 星级评分
 * - Link → URL输入
 * - Color → 颜色选择器
 * - Number → 数字输入
 * - 默认 → 单行文本
 */
import { Input, InputNumber, Select, Button, ColorPicker, App } from 'antd';
import { CameraOutlined, CloseOutlined } from '@ant-design/icons';
import { FieldType } from '@/types';
import RichTextField from './RichTextField';
import TagListField from './TagListField';
import { uploadImage } from '@/utils/imageUpload';
import { TEXT_SECONDARY_COLOR } from '@/utils/constants';

interface FieldEditorProps {
  field: { id: string; type: FieldType; placeholder: string };
  value: string;
  blockId: string;
  isLocked: boolean;
  updateBlockField: (blockId: string, fieldId: string, value: string) => void;
}

/**
 * 根据字段类型渲染对应的编辑控件
 * @example
 * <FieldEditor field={templateField} value={block.fields[field.id]} blockId={block.id} isLocked={block.locked} updateBlockField={updateBlockField} />
 */
export default function FieldEditor({
  field,
  value,
  blockId,
  isLocked,
  updateBlockField,
}: FieldEditorProps) {
  const { modal } = App.useApp();

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

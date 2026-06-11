import { Input, InputNumber, Slider, Divider, Progress, Button, App } from 'antd';
import { RotateRightOutlined, CameraOutlined, CloseOutlined } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { COMPLETE_COLOR, TEXT_SECONDARY_COLOR } from '@/utils/constants';
import { FieldType } from '@/types';
import type { BlockInstance, BlockTemplate } from '@/types';
import RichTextField from './RichTextField';
import TagListField from './TagListField';
import { uploadImage } from '@/utils/imageUpload';

interface BlockPropertiesPanelProps {
  block: BlockInstance;
  template: BlockTemplate | undefined;
}

/**
 * 块属性编辑面板
 * 包含：块头部操作、分组信息、旋转、填充状态、字段编辑
 */
export default function BlockPropertiesPanel({ block, template }: BlockPropertiesPanelProps) {
  const {
    resume,
    updateBlockField,
    removeBlock,
    cloneBlock,
    toggleBlockVisibility,
    toggleBlockLock,
    renameBlock,
  } = useResumeStore();

  const { modal } = App.useApp();

  if (!resume) return null;

  const isLocked = block.locked;

  return (
    <div className="right-panel-content">
      {/* 块头部信息 */}
      <div className="right-panel-block-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Input
            variant="borderless"
            value={block.name}
            onChange={(e) => renameBlock(block.id, e.target.value)}
            className="right-panel-block-name"
          />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <Button
            type="text"
            size="small"
            onClick={() => toggleBlockVisibility(block.id)}
            style={{ opacity: block.visible ? 1 : 0.4, fontSize: 12 }}
          >
            {block.visible ? '👁' : '🚫'}
          </Button>
          <Button
            type="text"
            size="small"
            onClick={() => toggleBlockLock(block.id)}
            style={{ opacity: block.locked ? 0.4 : 1, fontSize: 12 }}
          >
            {block.locked ? '🔒' : '🔓'}
          </Button>
          <Button
            type="text"
            size="small"
            onClick={() => cloneBlock(block.id)}
            style={{ fontSize: 12 }}
          >
            📋
          </Button>
          <Button
            type="text"
            size="small"
            danger
            onClick={() => removeBlock(block.id)}
            style={{ fontSize: 12 }}
          >
            🗑
          </Button>
        </div>
      </div>

      {/* 分组信息 */}
      {block.groupId && (
        <div className="right-panel-group-info">
          📁 分组: {resume.groups.find(g => g.id === block.groupId)?.name || '未知分组'}
        </div>
      )}

      {/* 位置信息（紧凑） */}
      <div className="right-panel-position-compact">
        <span>X: {Math.round(block.x)} Y: {Math.round(block.y)}</span>
        <span>W: {Math.round(block.width)} H: {Math.round(block.height)}</span>
      </div>

      {/* 旋转 */}
      <div className="right-panel-section-title"><RotateRightOutlined /> 旋转</div>
      <div className="right-panel-field">
        <Slider
          value={block.rotation || 0}
          onChange={(val) => useResumeStore.getState().updateBlockRotation(block.id, val)}
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
          onChange={(val) => useResumeStore.getState().updateBlockRotation(block.id, val ?? 0)}
          size="small"
          style={{ width: '100%' }}
          min={-360}
          max={360}
          step={1}
          suffix="°"
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

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

                {field.type === FieldType.RichText ? (
                  <RichTextField
                    value={value}
                    onChange={(v) => updateBlockField(block.id, field.id, v)}
                    placeholder={field.placeholder}
                    disabled={isLocked}
                  />
                ) : field.type === FieldType.TagList ? (
                  <TagListField
                    value={value}
                    onChange={(v) => updateBlockField(block.id, field.id, v)}
                    placeholder={field.placeholder}
                    disabled={isLocked}
                  />
                ) : field.type === FieldType.TextArea ? (
                  <Input.TextArea
                    value={value}
                    onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isLocked}
                    rows={3}
                  />
                ) : field.type === FieldType.Date ? (
                  <Input
                    type="month"
                    value={value}
                    onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
                    disabled={isLocked}
                    placeholder={field.placeholder || '选择月份'}
                  />
                ) : field.type === FieldType.Image ? (
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
                            onClick={() => updateBlockField(block.id, field.id, '')}
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
                            updateBlockField(block.id, field.id, result);
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
                                updateBlockField(block.id, field.id, urlValue.trim());
                              }
                            },
                          });
                        }}
                      >
                        上传图片
                      </Button>
                    )}
                  </div>
                ) : field.type === FieldType.Select ? (
                  <Input
                    value={value}
                    onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isLocked}
                  />
                ) : field.type === FieldType.Switch ? (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={value === 'true'}
                        onChange={(e) =>
                          updateBlockField(block.id, field.id, e.target.checked ? 'true' : 'false')
                        }
                        disabled={isLocked}
                      />
                      <span style={{ fontSize: 12, color: TEXT_SECONDARY_COLOR }}>{value === 'true' ? '是' : '否'}</span>
                    </label>
                  </div>
                ) : field.type === FieldType.Rating ? (
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        style={{
                          cursor: isLocked ? 'default' : 'pointer',
                          fontSize: 16,
                          opacity: parseInt(value) >= star ? 1 : 0.3,
                        }}
                        onClick={() => !isLocked && updateBlockField(block.id, field.id, String(star))}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                ) : field.type === FieldType.Link ? (
                  <Input
                    type="url"
                    value={value}
                    onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isLocked}
                  />
                ) : field.type === FieldType.Number ? (
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isLocked}
                  />
                ) : (
                  <Input
                    value={value}
                    onChange={(e) => updateBlockField(block.id, field.id, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isLocked}
                  />
                )}

                {field.placeholder && value === '' && (
                  <span className="right-panel-field-hint">{field.placeholder}</span>
                )}
              </div>
            );
          }) : <div className="right-panel-empty-hint">该元素无可编辑字段</div>}
      </div>
    </div>
  );
}

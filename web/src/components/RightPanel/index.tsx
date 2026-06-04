import { useState } from 'react';
import { Button, Input, Select, Switch, Rate, Tabs, Popconfirm, Segmented, Tooltip, Progress, Empty } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  CopyOutlined,
  DeleteOutlined,
  CameraOutlined,
  CloseOutlined,
  FormOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { FieldType } from '@/types';
import RichTextField from './RichTextField';
import TagListField from './TagListField';
import ColorSchemePanel from './ColorSchemePanel';
import './index.less';

export default function RightPanel() {
  const {
    resume,
    blockTemplates,
    editor,
    updateBlockField,
    removeBlock,
    cloneBlock,
    toggleBlockVisibility,
    toggleBlockLock,
    renameBlock,
    setBlockColumn,
  } = useResumeStore();

  const [activeTab, setActiveTab] = useState<'properties' | 'style'>('properties');

  if (!resume) return null;

  const selectedBlock = resume.blocks.find((b) => b.id === editor.selectedBlockId);
  const template = selectedBlock
    ? blockTemplates.find((t) => t.id === selectedBlock.templateId)
    : undefined;

  const isDoubleLayout = resume.layout.type === 'double' || resume.layout.type === 'mixed';

  return (
    <div className="right-panel" style={{ width: editor.rightPanelWidth }}>
      {/* Tab 切换 */}
      <Tabs
        className="right-panel-tabs"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'properties' | 'style')}
        centered
        size="small"
        items={[
          {
            key: 'properties',
            label: (
              <span>
                <FormOutlined /> 属性
              </span>
            ),
          },
          {
            key: 'style',
            label: (
              <span>
                <ProfileOutlined /> 配色
              </span>
            ),
          },
        ]}
      />

      {activeTab === 'style' ? (
        <ColorSchemePanel />
      ) : !selectedBlock || !template ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              <p>选择一个内容块</p>
              <p className="right-panel-empty-hint">点击预览区中的块以编辑属性</p>
            </span>
          }
        />
      ) : (
        <div className="right-panel-content">
          {/* 块头部信息 */}
          <div className="right-panel-block-header">
            <Input
              variant="borderless"
              value={selectedBlock.name}
              onChange={(e) => renameBlock(selectedBlock.id, e.target.value)}
              className="right-panel-block-name"
            />
            <div className="right-panel-block-actions">
              <Tooltip title={selectedBlock.visible ? '隐藏块' : '显示块'}>
                <Button
                  type="text"
                  size="small"
                  icon={selectedBlock.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  onClick={() => toggleBlockVisibility(selectedBlock.id)}
                />
              </Tooltip>
              <Tooltip title={selectedBlock.locked ? '解锁块' : '锁定块'}>
                <Button
                  type="text"
                  size="small"
                  icon={selectedBlock.locked ? <LockOutlined /> : <UnlockOutlined />}
                  onClick={() => toggleBlockLock(selectedBlock.id)}
                />
              </Tooltip>
              <Tooltip title="克隆块">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => cloneBlock(selectedBlock.id)}
                />
              </Tooltip>
              <Popconfirm
                title="确认删除该块？"
                onConfirm={() => removeBlock(selectedBlock.id)}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="删除块">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </div>
          </div>

          {/* 栏位选择（双栏布局时） */}
          {isDoubleLayout && (
            <div className="right-panel-column-select">
              <label className="right-panel-label">栏位</label>
              <Segmented
                size="small"
                value={selectedBlock.column}
                options={[
                  { label: '左栏', value: 'left' },
                  { label: '右栏', value: 'right' },
                ]}
                onChange={(val) => setBlockColumn(selectedBlock.id, val as 'left' | 'right')}
              />
            </div>
          )}

          {/* 填充状态 */}
          <div className="right-panel-fill-status">
            {(() => {
              const values = Object.values(selectedBlock.fields);
              const filled = values.filter((v) => v && v.trim()).length;
              const total = values.length;
              const percent = total ? Math.round((filled / total) * 100) : 0;
              return (
                <Progress
                  percent={percent}
                  size="small"
                  format={() => `${filled}/${total} 已填写`}
                  strokeColor={percent === 100 ? '#22c55e' : undefined}
                />
              );
            })()}
          </div>

          {/* 字段编辑 */}
          <div className="right-panel-fields">
            {[...template.fields]
              .sort((a, b) => a.order - b.order)
              .map((field) => {
                const value = selectedBlock.fields[field.id] || '';
                const isLocked = selectedBlock.locked;

                return (
                  <div key={field.id} className="right-panel-field">
                    <label className="right-panel-label">
                      {field.name}
                      {field.required && <span className="right-panel-required">*</span>}
                    </label>

                    {field.type === FieldType.RichText ? (
                      <RichTextField
                        value={value}
                        onChange={(v) => updateBlockField(selectedBlock.id, field.id, v)}
                        placeholder={field.placeholder}
                        disabled={isLocked}
                      />
                    ) : field.type === FieldType.TagList ? (
                      <TagListField
                        value={value}
                        onChange={(v) => updateBlockField(selectedBlock.id, field.id, v)}
                        placeholder={field.placeholder}
                        disabled={isLocked}
                      />
                    ) : field.type === FieldType.TextArea ? (
                      <Input.TextArea
                        value={value}
                        onChange={(e) => updateBlockField(selectedBlock.id, field.id, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLocked}
                        rows={3}
                      />
                    ) : field.type === FieldType.Date ? (
                      <Input
                        type="month"
                        value={value}
                        onChange={(e) => updateBlockField(selectedBlock.id, field.id, e.target.value)}
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
                                onClick={() => updateBlockField(selectedBlock.id, field.id, '')}
                              />
                            )}
                          </div>
                        ) : (
                          <Button
                            icon={<CameraOutlined />}
                            disabled={isLocked}
                            onClick={() => {
                              const url = prompt('请输入图片URL（后续版本支持上传）:');
                              if (url) updateBlockField(selectedBlock.id, field.id, url);
                            }}
                          >
                            上传图片
                          </Button>
                        )}
                      </div>
                    ) : field.type === FieldType.Select ? (
                      <Select
                        value={value || undefined}
                        onChange={(val) => updateBlockField(selectedBlock.id, field.id, val)}
                        disabled={isLocked}
                        placeholder={field.placeholder || '请选择'}
                        allowClear
                        style={{ width: '100%' }}
                        options={field.options?.map((opt) => ({ label: opt, value: opt }))}
                      />
                    ) : field.type === FieldType.Switch ? (
                      <Switch
                        checked={value === 'true'}
                        onChange={(checked) =>
                          updateBlockField(selectedBlock.id, field.id, checked ? 'true' : 'false')
                        }
                        disabled={isLocked}
                      />
                    ) : field.type === FieldType.Rating ? (
                      <Rate
                        value={parseInt(value) || 0}
                        onChange={(val) =>
                          !isLocked && updateBlockField(selectedBlock.id, field.id, String(val))
                        }
                        disabled={isLocked}
                      />
                    ) : field.type === FieldType.Link ? (
                      <Input
                        type="url"
                        value={value}
                        onChange={(e) => updateBlockField(selectedBlock.id, field.id, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLocked}
                      />
                    ) : field.type === FieldType.Number ? (
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) => updateBlockField(selectedBlock.id, field.id, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLocked}
                      />
                    ) : (
                      <Input
                        value={value}
                        onChange={(e) => updateBlockField(selectedBlock.id, field.id, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLocked}
                      />
                    )}

                    {field.placeholder && value === '' && (
                      <span className="right-panel-field-hint">{field.placeholder}</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

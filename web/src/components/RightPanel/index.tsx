import { useState } from 'react';
import { getGroupBounds as getGroupBoundsUtil } from '@/utils/geometry';
import { Button, Input, InputNumber, Switch, Rate, Tabs, Popconfirm, Tooltip, Progress, Divider, Select, ColorPicker, Slider, Modal } from 'antd';
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
  GroupOutlined,
  SaveOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
  BorderOutlined,
  BgColorsOutlined,
  RotateRightOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { FieldType, type BlockStyle, type BoxSides } from '@/types';
import { BLOCK_DEFAULT_MARGIN, BLOCK_DEFAULT_PADDING, CANVAS_DEFAULT_WIDTH, CANVAS_DEFAULT_HEIGHT, CANVAS_DEFAULT_PADDING, CANVAS_DEFAULT_BACKGROUND } from '@/utils/constants';
import { uploadImage } from '@/utils/imageUpload';
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
    removeBlocks,
    cloneBlock,
    toggleBlockVisibility,
    toggleBlockLock,
    renameBlock,
    updateBlockPosition,
    updateBlockSize,
    updateBlockZIndex,
    updateBlockStyle,
    updateBlockRotation,
    createGroup,
    addBlocksToGroup,
    removeGroup,
    renameGroup,
    updateGroupRotation,
    updateGroupPosition,
    selectGroup,
    saveAsCustomTemplate,
    setCanvasConfig,
  } = useResumeStore();

  const [activeTab, setActiveTab] = useState<'properties' | 'style' | 'layout'>('properties');

  // 批量更新多个块的位置
  const batchUpdatePosition = (blockIds: string[], updates: { dx?: number; dy?: number; x?: number; y?: number }) => {
    if (!resume) return;
    for (const id of blockIds) {
      const block = resume.blocks.find(b => b.id === id);
      if (block) {
        const newX = updates.x !== undefined ? updates.x : block.x + (updates.dx || 0);
        const newY = updates.y !== undefined ? updates.y : block.y + (updates.dy || 0);
        updateBlockPosition(id, newX, newY);
      }
    }
  };

  // 批量更新多个块的尺寸
  const batchUpdateSize = (blockIds: string[], updates: { width?: number; height?: number }) => {
    if (!resume) return;
    for (const id of blockIds) {
      const block = resume.blocks.find(b => b.id === id);
      if (block) {
        updateBlockSize(id, updates.width ?? block.width, updates.height ?? block.height);
      }
    }
  };

  if (!resume) return null;

  const selectedBlockIds = editor.selectedBlockIds;
  const isMultiSelect = selectedBlockIds.length > 1;
  const selectedGroupId = editor.selectedGroupId;

  // 获取选中的分组
  const selectedGroup = selectedGroupId
    ? resume.groups.find((g) => g.id === selectedGroupId)
    : null;

  // 获取选中的块
  const selectedBlocks = selectedBlockIds
    .map(id => resume.blocks.find(b => b.id === id))
    .filter(Boolean) as typeof resume.blocks;

  const selectedBlock = selectedBlocks.length === 1 ? selectedBlocks[0] : null;
  const template = selectedBlock
    ? blockTemplates.find((t) => t.id === selectedBlock.templateId)
    : undefined;

  // 判断是否选中了分组（分组内的元素整体选中）
  const isGroupMode = !!selectedGroup;

  // 多选操作
  const handleCreateGroup = () => {
    if (selectedBlockIds.length < 2) return;
    const groupId = createGroup(`分组 ${resume.groups.length + 1}`);
    addBlocksToGroup(groupId, selectedBlockIds);
    selectGroup(groupId);
  };

  const handleSaveAsCustom = () => {
    if (selectedBlockIds.length < 1) return;
    let inputValue = '';
    Modal.confirm({
      title: '保存为自定义元素',
      content: (
        <Input
          placeholder="请输入自定义元素名称"
          onChange={(e) => { inputValue = e.target.value; }}
          style={{ marginTop: 8 }}
          autoFocus
        />
      ),
      okText: '保存',
      cancelText: '取消',
      onOk: () => {
        if (inputValue.trim()) {
          saveAsCustomTemplate(inputValue.trim(), selectedBlockIds);
        }
      },
    });
  };

  const handleDeleteSelected = () => {
    removeBlocks(selectedBlockIds);
  };

  // 取消分组
  const handleUngroup = () => {
    if (!selectedGroup) return;
    removeGroup(selectedGroup.id);
  };

  // 计算分组边界框
  const groupBounds = isGroupMode && selectedGroup
    ? getGroupBoundsUtil(selectedGroup, resume.blocks)
    : null;

  return (
    <div className="right-panel" style={{ width: editor.rightPanelWidth }}>
      {/* Tab 切换 */}
      <Tabs
        className="right-panel-tabs"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'properties' | 'style' | 'layout')}
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
            key: 'layout',
            label: (
              <span>
                <ProfileOutlined /> 布局
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
      ) : activeTab === 'layout' ? (
        // 布局 Tab
        isGroupMode ? (
          // 选中分组的布局面板 - 只显示位置和旋转，不显示边距、背景等
          <div className="right-panel-content">
            <div className="right-panel-section-title"><GroupOutlined /> 分组布局</div>

            {/* 分组名称 */}
            <div className="right-panel-field">
              <label className="right-panel-label">分组名称</label>
              <Input
                value={selectedGroup!.name}
                onChange={(e) => renameGroup(selectedGroup!.id, e.target.value)}
                size="small"
              />
            </div>

            {/* 分组位置 - 微调 */}
            <div className="right-panel-section-title">位置微调</div>
            <div className="right-panel-position-grid">
              <Tooltip title="向左移动1px">
                <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => updateGroupPosition(selectedGroup!.id, -1, 0)} />
              </Tooltip>
              <Tooltip title="向右移动1px">
                <Button size="small" icon={<ArrowRightOutlined />} onClick={() => updateGroupPosition(selectedGroup!.id, 1, 0)} />
              </Tooltip>
              <Tooltip title="向上移动1px">
                <Button size="small" icon={<ArrowUpOutlined />} onClick={() => updateGroupPosition(selectedGroup!.id, 0, -1)} />
              </Tooltip>
              <Tooltip title="向下移动1px">
                <Button size="small" icon={<ArrowDownOutlined />} onClick={() => updateGroupPosition(selectedGroup!.id, 0, 1)} />
              </Tooltip>
            </div>

            {groupBounds && (
              <div className="right-panel-position-compact">
                <span>X: {Math.round(groupBounds.x)} Y: {Math.round(groupBounds.y)}</span>
                <span>W: {Math.round(groupBounds.width)} H: {Math.round(groupBounds.height)}</span>
              </div>
            )}

            {/* 分组旋转 */}
            <div className="right-panel-section-title"><RotateRightOutlined /> 旋转</div>
            <div className="right-panel-field">
              <Slider
                value={selectedGroup!.rotation || 0}
                onChange={(val) => updateGroupRotation(selectedGroup!.id, val)}
                min={-180}
                max={180}
                step={1}
                marks={{ '-180': '-180°', '-90': '-90°', 0: '0°', 90: '90°', 180: '180°' }}
              />
            </div>
            <div className="right-panel-field compact">
              <label className="right-panel-label">角度</label>
              <InputNumber
                value={selectedGroup!.rotation || 0}
                onChange={(val) => updateGroupRotation(selectedGroup!.id, val ?? 0)}
                size="small"
                style={{ width: '100%' }}
                min={-360}
                max={360}
                step={1}
                addonAfter="°"
              />
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div className="right-panel-group-hint">
              分组不可调整边距、背景等样式，请取消分组后单独调整各元素
            </div>
          </div>
        ) : !selectedBlock ? (
          <div className="right-panel-content">
            <div className="right-panel-section-title">📐 画布设置</div>

            {/* 画布尺寸 */}
            <div className="right-panel-section-title" style={{ fontSize: 12 }}>尺寸</div>
            <div className="right-panel-position-grid">
              <div className="right-panel-field compact">
                <label className="right-panel-label">宽</label>
                <InputNumber
                  value={resume.canvas.width}
                  onChange={(val) => val !== null && setCanvasConfig({ width: val })}
                  size="small"
                  style={{ width: '100%' }}
                  step={1}
                  min={400}
                />
              </div>
              <div className="right-panel-field compact">
                <label className="right-panel-label">高</label>
                <InputNumber
                  value={resume.canvas.height}
                  onChange={(val) => val !== null && setCanvasConfig({ height: val })}
                  size="small"
                  style={{ width: '100%' }}
                  step={1}
                  min={400}
                />
              </div>
            </div>

            {/* 快捷预设 */}
            <div className="right-panel-field">
              <label className="right-panel-label">页面规格</label>
              <Select
                value={`${resume.canvas.width}x${resume.canvas.height}`}
                onChange={(val) => {
                  const [w, h] = val.split('x').map(Number);
                  setCanvasConfig({ width: w, height: h });
                }}
                size="small"
                style={{ width: '100%' }}
                options={[
                  { label: 'A4 (794×1123)', value: '794x1123' },
                  { label: 'A4 横向 (1123×794)', value: '1123x794' },
                  { label: 'Letter (816×1056)', value: '816x1056' },
                  { label: '16:9 (794×447)', value: '794x447' },
                ]}
              />
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {/* 画布内边距 */}
            <div className="right-panel-section-title" style={{ fontSize: 12 }}>内边距</div>
            <div className="right-panel-field compact">
              <label className="right-panel-label">四周</label>
              <InputNumber
                value={resume.canvas.padding}
                onChange={(val) => val !== null && setCanvasConfig({ padding: val })}
                size="small"
                style={{ width: '100%' }}
                step={1}
                min={0}
              />
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {/* 画布背景 */}
            <div className="right-panel-section-title" style={{ fontSize: 12 }}><BgColorsOutlined /> 背景</div>
            <div className="right-panel-field">
              <label className="right-panel-label">背景颜色</label>
              <div className="right-panel-color-row">
                <ColorPicker
                  value={resume.canvas.background || '#ffffff'}
                  onChange={(_, hex) => setCanvasConfig({ background: hex })}
                  size="small"
                />
                <Input
                  value={resume.canvas.background || '#ffffff'}
                  onChange={(e) => setCanvasConfig({ background: e.target.value })}
                  placeholder="#ffffff"
                  size="small"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="right-panel-field">
              <label className="right-panel-label">背景图片</label>
              {resume.canvas.backgroundImage ? (
                <div className="right-panel-image-upload">
                  <div className="right-panel-image-preview">
                    <img src={resume.canvas.backgroundImage} alt="画布背景" />
                    <Button
                      type="text"
                      size="small"
                      danger
                      className="right-panel-image-clear"
                      icon={<CloseOutlined />}
                      onClick={() => setCanvasConfig({ backgroundImage: undefined })}
                    />
                  </div>
                  <Select
                    value={resume.canvas.backgroundSize || 'cover'}
                    onChange={(val) => setCanvasConfig({ backgroundSize: val })}
                    size="small"
                    style={{ width: '100%', marginTop: 4 }}
                    options={[
                      { label: '覆盖 (cover)', value: 'cover' },
                      { label: '包含 (contain)', value: 'contain' },
                      { label: '原始 (auto)', value: 'auto' },
                    ]}
                  />
                </div>
              ) : (
                <Button
                  icon={<CameraOutlined />}
                  onClick={async () => {
                    const result = await uploadImage();
                    if (result) setCanvasConfig({ backgroundImage: result });
                  }}
                  size="small"
                  style={{ width: '100%' }}
                >
                  上传背景图片
                </Button>
              )}
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {/* 重置按钮 */}
            <Button
              size="small"
              onClick={() => setCanvasConfig({
                width: CANVAS_DEFAULT_WIDTH,
                height: CANVAS_DEFAULT_HEIGHT,
                padding: CANVAS_DEFAULT_PADDING,
                background: CANVAS_DEFAULT_BACKGROUND,
                backgroundImage: undefined,
                backgroundSize: undefined,
              })}
              style={{ width: '100%' }}
            >
              重置为默认画布
            </Button>
          </div>
        ) : (
          <div className="right-panel-content">
            {/* 位置 */}
            <div className="right-panel-section-title">位置</div>
            <div className="right-panel-position-grid">
              <div className="right-panel-field compact">
                <label className="right-panel-label">X</label>
                <InputNumber
                  value={Math.round(selectedBlock.x)}
                  onChange={(val) => val !== null && updateBlockPosition(selectedBlock.id, val, selectedBlock.y)}
                  size="small"
                  style={{ width: '100%' }}
                  step={1}
                />
              </div>
              <div className="right-panel-field compact">
                <label className="right-panel-label">Y</label>
                <InputNumber
                  value={Math.round(selectedBlock.y)}
                  onChange={(val) => val !== null && updateBlockPosition(selectedBlock.id, selectedBlock.x, val)}
                  size="small"
                  style={{ width: '100%' }}
                  step={1}
                />
              </div>
            </div>

            {/* 尺寸 */}
            <div className="right-panel-section-title">尺寸</div>
            <div className="right-panel-position-grid">
              <div className="right-panel-field compact">
                <label className="right-panel-label">宽</label>
                <InputNumber
                  value={Math.round(selectedBlock.width)}
                  onChange={(val) => val !== null && updateBlockSize(selectedBlock.id, val, selectedBlock.height)}
                  size="small"
                  style={{ width: '100%' }}
                  min={50}
                  step={1}
                />
              </div>
              <div className="right-panel-field compact">
                <label className="right-panel-label">高</label>
                <InputNumber
                  value={Math.round(selectedBlock.height)}
                  onChange={(val) => val !== null && updateBlockSize(selectedBlock.id, selectedBlock.width, val)}
                  size="small"
                  style={{ width: '100%' }}
                  min={30}
                  step={1}
                />
              </div>
            </div>

            {/* 层级 */}
            <div className="right-panel-field compact">
              <label className="right-panel-label">层级</label>
              <InputNumber
                value={selectedBlock.zIndex}
                onChange={(val) => val !== null && updateBlockZIndex(selectedBlock.id, val)}
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
                value={selectedBlock.rotation || 0}
                onChange={(val) => updateBlockRotation(selectedBlock.id, val)}
                min={-180}
                max={180}
                step={1}
                marks={{ '-180': '-180°', '-90': '-90°', 0: '0°', 90: '90°', 180: '180°' }}
              />
            </div>
            <div className="right-panel-field compact">
              <label className="right-panel-label">角度</label>
              <InputNumber
                value={selectedBlock.rotation || 0}
                onChange={(val) => updateBlockRotation(selectedBlock.id, val ?? 0)}
                size="small"
                style={{ width: '100%' }}
                min={-360}
                max={360}
                step={1}
                addonAfter="°"
              />
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {/* 外边距 */}
            <div className="right-panel-section-title"><BorderOutlined /> 外边距</div>
            <div className="right-panel-sides-grid">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                const labelMap = { top: '上', right: '右', bottom: '下', left: '左' };
                const margin = selectedBlock.style?.margin || BLOCK_DEFAULT_MARGIN;
                return (
                  <div key={side} className="right-panel-field compact">
                    <label className="right-panel-label">{labelMap[side]}</label>
                    <InputNumber
                      value={margin[side]}
                      onChange={(val) => {
                        const current = selectedBlock.style?.margin || { ...BLOCK_DEFAULT_MARGIN };
                        updateBlockStyle(selectedBlock.id, {
                          margin: { ...current, [side]: val || 0 },
                        });
                      }}
                      size="small"
                      style={{ width: '100%' }}
                      min={0}
                      step={1}
                    />
                  </div>
                );
              })}
            </div>

            {/* 内边距 */}
            <div className="right-panel-section-title">内边距</div>
            <div className="right-panel-sides-grid">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                const labelMap = { top: '上', right: '右', bottom: '下', left: '左' };
                const padding = selectedBlock.style?.padding || BLOCK_DEFAULT_PADDING;
                return (
                  <div key={side} className="right-panel-field compact">
                    <label className="right-panel-label">{labelMap[side]}</label>
                    <InputNumber
                      value={padding[side]}
                      onChange={(val) => {
                        const current = selectedBlock.style?.padding || { ...BLOCK_DEFAULT_PADDING };
                        updateBlockStyle(selectedBlock.id, {
                          padding: { ...current, [side]: val || 0 },
                        });
                      }}
                      size="small"
                      style={{ width: '100%' }}
                      min={0}
                      step={1}
                    />
                  </div>
                );
              })}
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {/* 背景颜色 */}
            <div className="right-panel-section-title"><BgColorsOutlined /> 背景</div>
            <div className="right-panel-field">
              <label className="right-panel-label">背景颜色</label>
              <div className="right-panel-color-row">
                <ColorPicker
                  value={selectedBlock.style?.backgroundColor || ''}
                  onChange={(_, hex) => {
                    updateBlockStyle(selectedBlock.id, { backgroundColor: hex });
                  }}
                  size="small"
                  allowClear
                  onClear={() => updateBlockStyle(selectedBlock.id, { backgroundColor: '' })}
                />
                <Input
                  value={selectedBlock.style?.backgroundColor || ''}
                  onChange={(e) => updateBlockStyle(selectedBlock.id, { backgroundColor: e.target.value })}
                  placeholder="跟随主题"
                  size="small"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* 背景图片 */}
            <div className="right-panel-field">
              <label className="right-panel-label">背景图片</label>
              {selectedBlock.style?.backgroundImage ? (
                <div className="right-panel-image-upload">
                  <div className="right-panel-image-preview">
                    <img src={selectedBlock.style.backgroundImage} alt="块背景" />
                    <Button
                      type="text"
                      size="small"
                      danger
                      className="right-panel-image-clear"
                      icon={<CloseOutlined />}
                      onClick={() => updateBlockStyle(selectedBlock.id, { backgroundImage: '' })}
                    />
                  </div>
                  <Select
                    value={selectedBlock.style?.backgroundSize || 'cover'}
                    onChange={(val) => updateBlockStyle(selectedBlock.id, { backgroundSize: val })}
                    size="small"
                    style={{ width: '100%', marginTop: 4 }}
                    options={[
                      { label: '覆盖 (cover)', value: 'cover' },
                      { label: '包含 (contain)', value: 'contain' },
                      { label: '原始 (auto)', value: 'auto' },
                    ]}
                  />
                </div>
              ) : (
                <Button
                  icon={<CameraOutlined />}
                  onClick={async () => {
                    const result = await uploadImage();
                    if (result) updateBlockStyle(selectedBlock.id, { backgroundImage: result });
                  }}
                  size="small"
                  style={{ width: '100%' }}
                >
                  上传背景图片
                </Button>
              )}
            </div>

            {/* 透明度 */}
            <div className="right-panel-field">
              <label className="right-panel-label">透明度</label>
              <Slider
                value={selectedBlock.style?.opacity ?? 1}
                onChange={(val) => updateBlockStyle(selectedBlock.id, { opacity: val })}
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            {/* 圆角 */}
            <div className="right-panel-field compact">
              <label className="right-panel-label">圆角</label>
              <InputNumber
                value={selectedBlock.style?.borderRadius ?? 6}
                onChange={(val) => updateBlockStyle(selectedBlock.id, { borderRadius: val ?? 0 })}
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
                  value={selectedBlock.style?.borderWidth ?? 0}
                  onChange={(val) => updateBlockStyle(selectedBlock.id, { borderWidth: val ?? 0 })}
                  size="small"
                  style={{ width: '100%' }}
                  min={0}
                  step={1}
                />
              </div>
              <div className="right-panel-field compact" style={{ flex: 1 }}>
                <label className="right-panel-label">边框色</label>
                <ColorPicker
                  value={selectedBlock.style?.borderColor || '#e5e7eb'}
                  onChange={(_, hex) => updateBlockStyle(selectedBlock.id, { borderColor: hex })}
                  size="small"
                />
              </div>
            </div>
            <div className="right-panel-field compact">
              <label className="right-panel-label">边框样式</label>
              <Select
                value={selectedBlock.style?.borderStyle || 'solid'}
                onChange={(val) => updateBlockStyle(selectedBlock.id, { borderStyle: val })}
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
          </div>
        )
      ) : isGroupMode ? (
        // 选中分组的属性面板
        <div className="right-panel-content">
          <div className="right-panel-group-header">
            <GroupOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
            <Input
              variant="borderless"
              value={selectedGroup!.name}
              onChange={(e) => renameGroup(selectedGroup!.id, e.target.value)}
              className="right-panel-block-name"
              style={{ color: '#f59e0b' }}
            />
          </div>

          <div className="right-panel-group-info">
            <GroupOutlined /> 包含 {selectedGroup!.blockIds.length} 个元素
          </div>

          {groupBounds && (
            <div className="right-panel-position-compact">
              <span>X: {Math.round(groupBounds.x)} Y: {Math.round(groupBounds.y)}</span>
              <span>W: {Math.round(groupBounds.width)} H: {Math.round(groupBounds.height)}</span>
            </div>
          )}

          {/* 分组旋转 */}
          <div className="right-panel-section-title"><RotateRightOutlined /> 旋转</div>
          <div className="right-panel-field">
            <Slider
              value={selectedGroup!.rotation || 0}
              onChange={(val) => updateGroupRotation(selectedGroup!.id, val)}
              min={-180}
              max={180}
              step={1}
              marks={{ '-180': '-180°', '-90': '-90°', 0: '0°', 90: '90°', 180: '180°' }}
            />
          </div>
          <div className="right-panel-field compact">
            <label className="right-panel-label">角度</label>
            <InputNumber
              value={selectedGroup!.rotation || 0}
              onChange={(val) => updateGroupRotation(selectedGroup!.id, val ?? 0)}
              size="small"
              style={{ width: '100%' }}
              min={-360}
              max={360}
              step={1}
              addonAfter="°"
            />
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* 分组操作 */}
          <div className="right-panel-multi-actions">
            <Button
              icon={<DisconnectOutlined />}
              onClick={handleUngroup}
              block
              danger
            >
              取消分组
            </Button>
            <Button
              icon={<DeleteOutlined />}
              onClick={() => {
                removeBlocks(selectedGroup!.blockIds);
                removeGroup(selectedGroup!.id);
              }}
              block
              danger
            >
              删除分组及所有元素
            </Button>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div className="right-panel-group-hint">
            分组不可调整边距、背景等样式，请取消分组后单独调整各元素
          </div>
        </div>
      ) : isMultiSelect ? (
        // 多选模式
        <div className="right-panel-content">
          <div className="right-panel-multi-info">
            <span className="right-panel-multi-count">
              已选择 {selectedBlockIds.length} 个元素
            </span>
          </div>

          {/* 快速对齐 */}
          <div className="right-panel-section-title">对齐</div>
          <div className="right-panel-align-grid">
            <Tooltip title="左对齐">
              <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => {
                const minX = Math.min(...selectedBlocks.map(b => b.x));
                batchUpdatePosition(selectedBlockIds, { x: minX });
              }}>左</Button>
            </Tooltip>
            <Tooltip title="水平居中">
              <Button size="small" icon={<ColumnWidthOutlined />} onClick={() => {
                const avgX = selectedBlocks.reduce((s, b) => s + b.x + b.width / 2, 0) / selectedBlocks.length;
                for (const id of selectedBlockIds) {
                  const block = resume.blocks.find(b => b.id === id);
                  if (block) updateBlockPosition(id, avgX - block.width / 2, block.y);
                }
              }}>中</Button>
            </Tooltip>
            <Tooltip title="右对齐">
              <Button size="small" icon={<ArrowRightOutlined />} onClick={() => {
                const maxRight = Math.max(...selectedBlocks.map(b => b.x + b.width));
                for (const id of selectedBlockIds) {
                  const block = resume.blocks.find(b => b.id === id);
                  if (block) updateBlockPosition(id, maxRight - block.width, block.y);
                }
              }}>右</Button>
            </Tooltip>
            <Tooltip title="顶部对齐">
              <Button size="small" icon={<ArrowUpOutlined />} onClick={() => {
                const minY = Math.min(...selectedBlocks.map(b => b.y));
                batchUpdatePosition(selectedBlockIds, { y: minY });
              }}>上</Button>
            </Tooltip>
            <Tooltip title="垂直居中">
              <Button size="small" icon={<ColumnHeightOutlined />} onClick={() => {
                const avgY = selectedBlocks.reduce((s, b) => s + b.y + b.height / 2, 0) / selectedBlocks.length;
                for (const id of selectedBlockIds) {
                  const block = resume.blocks.find(b => b.id === id);
                  if (block) updateBlockPosition(id, block.x, avgY - block.height / 2);
                }
              }}>中</Button>
            </Tooltip>
            <Tooltip title="底部对齐">
              <Button size="small" icon={<ArrowDownOutlined />} onClick={() => {
                const maxBottom = Math.max(...selectedBlocks.map(b => b.y + b.height));
                for (const id of selectedBlockIds) {
                  const block = resume.blocks.find(b => b.id === id);
                  if (block) updateBlockPosition(id, block.x, maxBottom - block.height);
                }
              }}>下</Button>
            </Tooltip>
          </div>

          {/* 等间距 */}
          <div className="right-panel-section-title">分布</div>
          <div className="right-panel-distribute-row">
            <Button size="small" onClick={() => {
              // 水平等间距分布
              if (selectedBlocks.length < 3) return;
              const sorted = [...selectedBlocks].sort((a, b) => a.x - b.x);
              const totalWidth = sorted.reduce((s, b) => s + b.width, 0);
              const leftX = sorted[0].x;
              const rightEdge = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
              const gap = (rightEdge - leftX - totalWidth) / (sorted.length - 1);
              let currentX = leftX;
              for (const block of sorted) {
                updateBlockPosition(block.id, currentX, block.y);
                currentX += block.width + gap;
              }
            }}>水平等距</Button>
            <Button size="small" onClick={() => {
              // 垂直等间距分布
              if (selectedBlocks.length < 3) return;
              const sorted = [...selectedBlocks].sort((a, b) => a.y - b.y);
              const totalHeight = sorted.reduce((s, b) => s + b.height, 0);
              const topY = sorted[0].y;
              const bottomEdge = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
              const gap = (bottomEdge - topY - totalHeight) / (sorted.length - 1);
              let currentY = topY;
              for (const block of sorted) {
                updateBlockPosition(block.id, block.x, currentY);
                currentY += block.height + gap;
              }
            }}>垂直等距</Button>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div className="right-panel-multi-actions">
            <Button
              icon={<GroupOutlined />}
              onClick={handleCreateGroup}
              block
            >
              创建分组
            </Button>
            <Button
              icon={<SaveOutlined />}
              onClick={handleSaveAsCustom}
              block
            >
              保存为自定义元素
            </Button>
            <Popconfirm
              title={`确认删除 ${selectedBlockIds.length} 个元素？`}
              onConfirm={handleDeleteSelected}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} block>
                批量删除
              </Button>
            </Popconfirm>
          </div>
        </div>
      ) : !selectedBlock || !template ? (
        <div className="right-panel-content">
          <div className="right-panel-section-title">📐 画布信息</div>
          <div className="right-panel-position-compact">
            <span>画布: {resume.canvas.width} × {resume.canvas.height}px</span>
          </div>
          <div className="right-panel-position-compact">
            <span>内边距: {resume.canvas.padding}px</span>
          </div>
          <div className="right-panel-position-compact">
            <span>元素: {resume.blocks.filter(b => b.visible).length} 个可见</span>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <p className="right-panel-empty-hint">点击编辑区中的块以编辑属性</p>
          <p className="right-panel-empty-hint">按住 Shift 可多选</p>
          <p className="right-panel-empty-hint">点击空白区域取消选中，可在「布局」Tab 编辑画布</p>
        </div>
      ) : (
        // 单选模式 - 属性编辑
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

          {/* 分组信息 */}
          {selectedBlock.groupId && (
            <div className="right-panel-group-info">
              <GroupOutlined /> 分组: {resume.groups.find(g => g.id === selectedBlock.groupId)?.name || '未知分组'}
            </div>
          )}

          {/* 位置信息（紧凑） */}
          <div className="right-panel-position-compact">
            <span>X: {Math.round(selectedBlock.x)} Y: {Math.round(selectedBlock.y)}</span>
            <span>W: {Math.round(selectedBlock.width)} H: {Math.round(selectedBlock.height)}</span>
          </div>

          {/* 旋转 */}
          <div className="right-panel-section-title"><RotateRightOutlined /> 旋转</div>
          <div className="right-panel-field">
            <Slider
              value={selectedBlock.rotation || 0}
              onChange={(val) => updateBlockRotation(selectedBlock.id, val)}
              min={-180}
              max={180}
              step={1}
              marks={{ '-180': '-180°', '-90': '-90°', 0: '0°', 90: '90°', 180: '180°' }}
            />
          </div>
          <div className="right-panel-field compact">
            <label className="right-panel-label">角度</label>
            <InputNumber
              value={selectedBlock.rotation || 0}
              onChange={(val) => updateBlockRotation(selectedBlock.id, val ?? 0)}
              size="small"
              style={{ width: '100%' }}
              min={-360}
              max={360}
              step={1}
              addonAfter="°"
            />
          </div>

          <Divider style={{ margin: '8px 0' }} />

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
                            onClick={async () => {
                              // 优先尝试本地上传
                              const result = await uploadImage();
                              if (result) {
                                updateBlockField(selectedBlock.id, field.id, result);
                                return;
                              }
                              // 上传取消时，提供 URL 输入弹窗
                              let urlValue = '';
                              Modal.confirm({
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
                                    updateBlockField(selectedBlock.id, field.id, urlValue.trim());
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
                        onChange={(e) => updateBlockField(selectedBlock.id, field.id, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLocked}
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

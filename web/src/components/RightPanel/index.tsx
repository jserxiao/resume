import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Divider, Button, InputNumber, Slider } from 'antd';
import {
  FormOutlined,
  ProfileOutlined,
  RotateRightOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import type { BlockInstance } from '@/types';
import BlockActionsToolbar from '@/components/shared/BlockActionsToolbar';
import ColorSchemePanel from './ColorSchemePanel';
import BlockPropertiesPanel from './BlockPropertiesPanel';
import BlockLayoutPanel from './BlockLayoutPanel';
import GroupPanel from './GroupPanel';
import MultiSelectPanel from './MultiSelectPanel';
import CanvasLayoutPanel from './CanvasLayoutPanel';
import './index.less';

export default function RightPanel() {
  const navigate = useNavigate();

  // 暴露 navigate 给 CanvasLayoutPanel 使用（避免在子组件中重复 useNavigate）
  (window as any).__navigate = navigate;

  const {
    resume,
    blockTemplates,
    editor,
    customDecorations,
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
    removeGroup,
    removeCustomDecoration,
    setCanvasConfig,
  } = useResumeStore();

  const [activeTab, setActiveTab] = useState<'properties' | 'style' | 'layout'>('properties');

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

  // 是否为自定义装饰块
  const isCustomDecorationBlock = selectedBlock?.templateId === 'custom-decoration';

  // 判断是否选中了分组
  const isGroupMode = !!selectedGroup;

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
        /* 布局 Tab */
        isGroupMode ? (
          <GroupPanel group={selectedGroup!} isLayoutTab />
        ) : !selectedBlock ? (
          <CanvasLayoutPanel resume={resume} />
        ) : (
          <BlockLayoutPanel block={selectedBlock} />
        )
      ) : isCustomDecorationBlock && selectedBlock ? (
        /* 自定义装饰块属性面板 */
        <CustomDecorationPropertiesPanel block={selectedBlock} navigate={navigate} />
      ) : isGroupMode ? (
        /* 选中分组的属性面板 */
        <GroupPanel group={selectedGroup!} />
      ) : isMultiSelect ? (
        /* 多选模式 */
        <MultiSelectPanel selectedBlockIds={selectedBlockIds} selectedBlocks={selectedBlocks} />
      ) : !selectedBlock ? (
        /* 无选中 - 画布信息 */
        <EmptyPropertiesPanel resume={resume} />
      ) : (
        /* 单选模式 - 属性编辑 */
        <BlockPropertiesPanel block={selectedBlock} template={template} />
      )}
    </div>
  );
}

// ========== 自定义装饰块属性面板 ==========
function CustomDecorationPropertiesPanel({ block, navigate }: { block: BlockInstance; navigate: ReturnType<typeof useNavigate> }) {
  const { removeBlock, cloneBlock, toggleBlockVisibility, toggleBlockLock, renameBlock, updateBlockPosition, updateBlockSize, updateBlockZIndex, updateBlockRotation, updateBlockStyle } = useResumeStore();

  return (
    <div className="right-panel-content">
      <div className="right-panel-block-header">
        <BlockActionsToolbar
          name={block.name}
          onNameChange={(val) => renameBlock(block.id, val)}
          nameStyle={{ color: '#1a56db' }}
          visible={block.visible}
          locked={block.locked}
          onToggleVisibility={() => toggleBlockVisibility(block.id)}
          onToggleLock={() => toggleBlockLock(block.id)}
          onClone={() => cloneBlock(block.id)}
          onDelete={() => removeBlock(block.id)}
        />
      </div>

      {/* 装饰类型标识 */}
      <div className="right-panel-group-info" style={{ color: '#1a56db' }}>
        <StarOutlined /> 自定义装饰
      </div>

      {/* 位置信息 */}
      <div className="right-panel-position-compact">
        <span>X: {Math.round(block.x)} Y: {Math.round(block.y)}</span>
        <span>W: {Math.round(block.width)} H: {Math.round(block.height)}</span>
      </div>

      {/* 位置微调 */}
      <div className="right-panel-section-title">位置微调</div>
      <div className="right-panel-position-grid">
        <div className="right-panel-field compact">
          <label className="right-panel-label">X</label>
          <InputNumber
            value={Math.round(block.x)}
            onChange={(val) => val !== null && updateBlockPosition(block.id, val, block.y)}
            size="small"
            style={{ width: '100%' }}
            step={1}
          />
        </div>
        <div className="right-panel-field compact">
          <label className="right-panel-label">Y</label>
          <InputNumber
            value={Math.round(block.y)}
            onChange={(val) => val !== null && updateBlockPosition(block.id, block.x, val)}
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
            value={Math.round(block.width)}
            onChange={(val) => val !== null && updateBlockSize(block.id, val, block.height)}
            size="small"
            style={{ width: '100%' }}
            min={20}
            step={1}
          />
        </div>
        <div className="right-panel-field compact">
          <label className="right-panel-label">高</label>
          <InputNumber
            value={Math.round(block.height)}
            onChange={(val) => val !== null && updateBlockSize(block.id, block.width, val)}
            size="small"
            style={{ width: '100%' }}
            min={20}
            step={1}
          />
        </div>
      </div>

      {/* 层级 */}
      <div className="right-panel-field compact">
        <label className="right-panel-label">层级</label>
        <InputNumber
          value={block.zIndex}
          onChange={(val) => val !== null && updateBlockZIndex(block.id, val)}
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
          value={block.rotation || 0}
          onChange={(val) => updateBlockRotation(block.id, val)}
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
          onChange={(val) => updateBlockRotation(block.id, val ?? 0)}
          size="small"
          style={{ width: '100%' }}
          min={-360}
          max={360}
          step={1}
          addonAfter="°"
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 透明度 */}
      <div className="right-panel-field">
        <label className="right-panel-label">透明度</label>
        <Slider
          value={block.style?.opacity ?? 1}
          onChange={(val) => updateBlockStyle(block.id, { opacity: val })}
          min={0}
          max={1}
          step={0.05}
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 编辑装饰按钮 */}
      <Button
        icon={<FormOutlined />}
        onClick={() => {
          const deco = (block.decorations[0] as any);
          if (deco?.decorationId) {
            navigate(`/decoration-editor?id=${deco.decorationId}`);
          }
        }}
        block
        style={{ marginBottom: 6 }}
      >
        编辑装饰图形
      </Button>
    </div>
  );
}

// ========== 无选中 - 画布信息面板 ==========
function EmptyPropertiesPanel({ resume }: { resume: NonNullable<ReturnType<typeof useResumeStore.getState>['resume']> }) {
  return (
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
  );
}

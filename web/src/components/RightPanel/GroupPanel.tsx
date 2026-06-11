import { Input, InputNumber, Slider, Divider, Button } from 'antd';
import { GroupOutlined, RotateRightOutlined, DisconnectOutlined, DeleteOutlined } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import type { BlockGroup } from '@/types';
import { getGroupBounds as getGroupBoundsUtil } from '@/utils/geometry';

interface GroupPanelProps {
  group: BlockGroup;
  /** 是否为布局 Tab（布局 Tab 只显示位置和旋转，不显示边距背景等） */
  isLayoutTab?: boolean;
}

/**
 * 分组属性/布局面板
 * 属性 Tab: 分组名称、元素数量、位置信息、旋转、操作按钮
 * 布局 Tab: 位置微调、旋转、提示
 */
export default function GroupPanel({ group, isLayoutTab = false }: GroupPanelProps) {
  const { resume, renameGroup, updateGroupRotation, updateGroupPosition, removeGroup, removeBlocks } = useResumeStore();

  if (!resume) return null;

  const groupBounds = getGroupBoundsUtil(group, resume.blocks);

  if (isLayoutTab) {
    return (
      <div className="right-panel-content">
        <div className="right-panel-section-title"><GroupOutlined /> 分组布局</div>

        {/* 分组名称 */}
        <div className="right-panel-field">
          <label className="right-panel-label">分组名称</label>
          <Input
            value={group.name}
            onChange={(e) => renameGroup(group.id, e.target.value)}
            size="small"
          />
        </div>

        {/* 分组位置 - 微调 */}
        <div className="right-panel-section-title">位置微调</div>
        <div className="right-panel-position-grid">
          <Button size="small" onClick={() => updateGroupPosition(group.id, -1, 0)}>← 左移</Button>
          <Button size="small" onClick={() => updateGroupPosition(group.id, 1, 0)}>右移 →</Button>
          <Button size="small" onClick={() => updateGroupPosition(group.id, 0, -1)}>↑ 上移</Button>
          <Button size="small" onClick={() => updateGroupPosition(group.id, 0, 1)}>↓ 下移</Button>
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
            value={group.rotation || 0}
            onChange={(val) => updateGroupRotation(group.id, val)}
            min={-180}
            max={180}
            step={1}
            marks={{ '-180': '-180°', '-90': '-90°', 0: '0°', 90: '90°', 180: '180°' }}
          />
        </div>
        <div className="right-panel-field compact">
          <label className="right-panel-label">角度</label>
          <InputNumber
            value={group.rotation || 0}
            onChange={(val) => updateGroupRotation(group.id, val ?? 0)}
            size="small"
            style={{ width: '100%' }}
            min={-360}
            max={360}
            step={1}
            suffix="°"
          />
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div className="right-panel-group-hint">
          分组不可调整边距、背景等样式，请取消分组后单独调整各元素
        </div>
      </div>
    );
  }

  // 属性 Tab
  return (
    <div className="right-panel-content">
      <div className="right-panel-group-header">
        <GroupOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
        <Input
          variant="borderless"
          value={group.name}
          onChange={(e) => renameGroup(group.id, e.target.value)}
          className="right-panel-block-name"
          style={{ color: '#f59e0b' }}
        />
      </div>

      <div className="right-panel-group-info">
        <GroupOutlined /> 包含 {group.blockIds.length} 个元素
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
          value={group.rotation || 0}
          onChange={(val) => updateGroupRotation(group.id, val)}
          min={-180}
          max={180}
          step={1}
          marks={{ '-180': '-180°', '-90': '-90°', 0: '0°', 90: '90°', 180: '180°' }}
        />
      </div>
      <div className="right-panel-field compact">
        <label className="right-panel-label">角度</label>
        <InputNumber
          value={group.rotation || 0}
          onChange={(val) => updateGroupRotation(group.id, val ?? 0)}
          size="small"
          style={{ width: '100%' }}
          min={-360}
          max={360}
          step={1}
          suffix="°"
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 分组操作 */}
      <div className="right-panel-multi-actions">
        <Button
          icon={<DisconnectOutlined />}
          onClick={() => removeGroup(group.id)}
          block
          danger
        >
          取消分组
        </Button>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => {
            removeBlocks(group.blockIds);
            removeGroup(group.id);
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
  );
}

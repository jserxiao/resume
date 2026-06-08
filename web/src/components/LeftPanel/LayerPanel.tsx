import { useResumeStore } from '@/store';
import { Button, Tooltip, Empty } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  GroupOutlined,
} from '@ant-design/icons';
import './LayerPanel.less';

/** 图层项（统一的数据结构） */
interface LayerItem {
  type: 'group' | 'block';
  id: string;
  name: string;
  zIndex: number;
  visible: boolean;
  locked: boolean;
}

/**
 * 图层面板
 * - 未选中分组时：显示舞台上所有图层（分组作为整体显示 + 未分组的独立块）
 * - 选中分组时：显示该分组内的图层列表
 * - 支持点击选中、可见性切换、锁定切换、层级调整
 */
export default function LayerPanel() {
  const {
    resume,
    editor,
    selectBlock,
    selectGroup,
    toggleBlockVisibility,
    toggleBlockLock,
    moveBlockZIndex,
  } = useResumeStore();

  if (!resume) return null;

  const selectedGroupId = editor.selectedGroupId;

  /** 获取舞台图层列表（未选中分组时） */
  const getStageLayerItems = (): LayerItem[] => {
    const ungroupedBlocks = resume.blocks.filter((b) => !b.groupId);
    const groups = resume.groups;
    const items: LayerItem[] = [];

    // 添加分组（以分组内最高 zIndex 作为分组的层级）
    for (const group of groups) {
      const groupBlocks = resume.blocks.filter((b) => group.blockIds.includes(b.id));
      const maxZ = groupBlocks.length > 0 ? Math.max(...groupBlocks.map((b) => b.zIndex)) : 0;
      const allVisible = groupBlocks.length > 0 && groupBlocks.every((b) => b.visible);
      const anyLocked = groupBlocks.some((b) => b.locked);
      items.push({
        type: 'group',
        id: group.id,
        name: group.name,
        zIndex: maxZ,
        visible: allVisible,
        locked: anyLocked,
      });
    }

    // 添加未分组的块
    for (const block of ungroupedBlocks) {
      items.push({
        type: 'block',
        id: block.id,
        name: block.name,
        zIndex: block.zIndex,
        visible: block.visible,
        locked: block.locked,
      });
    }

    // 按 zIndex 降序排列
    return items.sort((a, b) => b.zIndex - a.zIndex);
  };

  /** 获取分组内图层列表 */
  const getGroupLayerItems = (): LayerItem[] => {
    if (!selectedGroupId) return [];
    const group = resume.groups.find((g) => g.id === selectedGroupId);
    if (!group) return [];
    return group.blockIds
      .map((id) => resume.blocks.find((b) => b.id === id))
      .filter((b): b is NonNullable<typeof b> => b != null)
      .map((b) => ({
        type: 'block' as const,
        id: b.id,
        name: b.name,
        zIndex: b.zIndex,
        visible: b.visible,
        locked: b.locked,
      }))
      .sort((a, b) => b.zIndex - a.zIndex);
  };

  const layers = selectedGroupId ? getGroupLayerItems() : getStageLayerItems();

  const handleLayerClick = (item: LayerItem) => {
    if (item.type === 'group') {
      selectGroup(item.id);
    } else {
      selectBlock(item.id);
    }
  };

  const handleVisibilityToggle = (e: React.MouseEvent, item: LayerItem) => {
    e.stopPropagation();
    if (item.type === 'group') {
      const group = resume.groups.find((g) => g.id === item.id);
      if (group) {
        for (const blockId of group.blockIds) {
          const block = resume.blocks.find((b) => b.id === blockId);
          if (block && block.visible === item.visible) {
            toggleBlockVisibility(blockId);
          }
        }
      }
    } else {
      toggleBlockVisibility(item.id);
    }
  };

  const handleLockToggle = (e: React.MouseEvent, item: LayerItem) => {
    e.stopPropagation();
    if (item.type === 'group') {
      const group = resume.groups.find((g) => g.id === item.id);
      if (group) {
        for (const blockId of group.blockIds) {
          const block = resume.blocks.find((b) => b.id === blockId);
          if (block && block.locked !== !item.locked) {
            toggleBlockLock(blockId);
          }
        }
      }
    } else {
      toggleBlockLock(item.id);
    }
  };

  const handleZIndexMove = (e: React.MouseEvent, blockId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    e.stopPropagation();
    moveBlockZIndex(blockId, direction);
  };

  const isSelected = (item: LayerItem) => {
    if (item.type === 'group') {
      return editor.selectedGroupId === item.id;
    }
    return editor.selectedBlockIds.includes(item.id);
  };

  const groupName = selectedGroupId
    ? resume.groups.find((g) => g.id === selectedGroupId)?.name || '分组'
    : null;

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <span className="layer-panel-title">
          {groupName ? `📊 ${groupName} 图层` : '📊 舞台图层'}
        </span>
      </div>
      {layers.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={selectedGroupId ? '分组内无元素' : '画布上无元素'}
          style={{ padding: '20px 0' }}
        />
      ) : (
        <div className="layer-panel-list">
          {layers.map((item) => (
            <div
              key={item.id}
              className={`layer-panel-item ${isSelected(item) ? 'selected' : ''} ${!item.visible ? 'hidden-layer' : ''} ${item.type === 'group' ? 'group-layer' : ''}`}
              onClick={() => handleLayerClick(item)}
            >
              {item.type === 'group' && (
                <GroupOutlined className="layer-panel-group-icon" />
              )}
              <span className="layer-panel-item-name">{item.name}</span>
              <span className="layer-panel-item-zindex">z:{item.zIndex}</span>
              <div className="layer-panel-item-actions" onClick={(e) => e.stopPropagation()}>
                <Tooltip title={item.visible ? '隐藏' : '显示'}>
                  <Button
                    type="text"
                    size="small"
                    icon={item.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    className="layer-panel-action-btn"
                    onClick={(e) => handleVisibilityToggle(e, item)}
                  />
                </Tooltip>
                <Tooltip title={item.locked ? '解锁' : '锁定'}>
                  <Button
                    type="text"
                    size="small"
                    icon={item.locked ? <LockOutlined /> : <UnlockOutlined />}
                    className="layer-panel-action-btn"
                    onClick={(e) => handleLockToggle(e, item)}
                  />
                </Tooltip>
                {item.type === 'block' && (
                  <>
                    <Tooltip title="上移一层">
                      <Button type="text" size="small" icon={<ArrowUpOutlined />} className="layer-panel-action-btn" onClick={(e) => handleZIndexMove(e, item.id, 'up')} />
                    </Tooltip>
                    <Tooltip title="下移一层">
                      <Button type="text" size="small" icon={<ArrowDownOutlined />} className="layer-panel-action-btn" onClick={(e) => handleZIndexMove(e, item.id, 'down')} />
                    </Tooltip>
                    <Tooltip title="置顶">
                      <Button type="text" size="small" icon={<VerticalAlignTopOutlined />} className="layer-panel-action-btn" onClick={(e) => handleZIndexMove(e, item.id, 'top')} />
                    </Tooltip>
                    <Tooltip title="置底">
                      <Button type="text" size="small" icon={<VerticalAlignBottomOutlined />} className="layer-panel-action-btn" onClick={(e) => handleZIndexMove(e, item.id, 'bottom')} />
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Button, Tooltip, Empty, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
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
  ProfileOutlined,
  PushpinOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import './index.less';

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
 * 图层悬浮面板
 * - 悬浮在画布上方，可拖拽移动位置
 * - 可折叠/展开，不影响编辑区域布局
 * - 未选中分组时：显示舞台上所有图层
 * - 选中分组时：显示该分组内的图层列表
 */
export default function LayerDrawer() {
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

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

  /** 获取舞台图层列表 */
  const getStageLayerItems = (): LayerItem[] => {
    const ungroupedBlocks = resume.blocks.filter((b) => !b.groupId);
    const groups = resume.groups;
    const items: LayerItem[] = [];

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

  // 初始化位置：默认放在左侧面板右侧
  useEffect(() => {
    if (position === null && panelRef.current) {
      const leftPanelWidth = editor.leftPanelWidth || 260;
      setPosition({ x: leftPanelWidth + 8, y: 56 });
    }
  }, [editor.leftPanelWidth, position]);

  /** 开始拖拽 */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current || !pinned) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
    e.preventDefault();
  };

  /** 拖拽中 */
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  /** 获取图层项的下拉菜单 */
  const getLayerMenuItems = (item: LayerItem): MenuProps['items'] => [
    {
      key: 'up',
      label: '上移一层',
      icon: <ArrowUpOutlined />,
      onClick: ({ domEvent }) => handleZIndexMove(domEvent as React.MouseEvent, item.id, 'up'),
    },
    {
      key: 'down',
      label: '下移一层',
      icon: <ArrowDownOutlined />,
      onClick: ({ domEvent }) => handleZIndexMove(domEvent as React.MouseEvent, item.id, 'down'),
    },
    {
      key: 'top',
      label: '置顶',
      icon: <VerticalAlignTopOutlined />,
      onClick: ({ domEvent }) => handleZIndexMove(domEvent as React.MouseEvent, item.id, 'top'),
    },
    {
      key: 'bottom',
      label: '置底',
      icon: <VerticalAlignBottomOutlined />,
      onClick: ({ domEvent }) => handleZIndexMove(domEvent as React.MouseEvent, item.id, 'bottom'),
    },
  ];

  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
      }
    : {
        position: 'fixed',
        left: (editor.leftPanelWidth || 260) + 8,
        top: 56,
        zIndex: 1000,
      };

  return (
    <div
      ref={panelRef}
      className={`layer-drawer ${collapsed ? 'layer-drawer--collapsed' : ''} ${isDragging ? 'layer-drawer--dragging' : ''} ${pinned ? 'layer-drawer--pinned' : ''}`}
      style={style}
    >
      {/* 标题栏：可拖拽 */}
      <div className="layer-drawer-header" onMouseDown={handleMouseDown}>
        <div className="layer-drawer-header-left">
          <ProfileOutlined className="layer-drawer-header-icon" />
          {!collapsed && (
            <span className="layer-drawer-header-title">
              {groupName ? `${groupName} 图层` : '舞台图层'}
            </span>
          )}
        </div>
        <div className="layer-drawer-header-actions" onMouseDown={(e) => e.stopPropagation()}>
          <Tooltip title={pinned ? '取消固定' : '固定位置'}>
            <Button
              type="text"
              size="small"
              className={`layer-drawer-header-btn ${pinned ? 'is-active' : ''}`}
              icon={<PushpinOutlined />}
              onClick={() => setPinned(!pinned)}
            />
          </Tooltip>
          <Tooltip title={collapsed ? '展开' : '收起'}>
            <Button
              type="text"
              size="small"
              className="layer-drawer-header-btn"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? '展开' : '收起'}
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 图层面板内容 */}
      {!collapsed && (
        <div className="layer-drawer-content">
          {layers.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={selectedGroupId ? '分组内无元素' : '画布上无元素'}
              style={{ padding: '20px 0' }}
            />
          ) : (
            <div className="layer-drawer-list">
              {layers.map((item) => (
                <div
                  key={item.id}
                  className={`layer-drawer-item ${isSelected(item) ? 'selected' : ''} ${!item.visible ? 'hidden-layer' : ''} ${item.type === 'group' ? 'group-layer' : ''}`}
                  onClick={() => handleLayerClick(item)}
                >
                  {item.type === 'group' && (
                    <GroupOutlined className="layer-drawer-group-icon" />
                  )}
                  <span className="layer-drawer-item-name">{item.name}</span>
                  <span className="layer-drawer-item-zindex">z:{item.zIndex}</span>
                  <div className="layer-drawer-item-actions" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={item.visible ? '隐藏' : '显示'}>
                      <Button
                        type="text"
                        size="small"
                        icon={item.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        className="layer-drawer-action-btn"
                        onClick={(e) => handleVisibilityToggle(e, item)}
                      />
                    </Tooltip>
                    <Tooltip title={item.locked ? '解锁' : '锁定'}>
                      <Button
                        type="text"
                        size="small"
                        icon={item.locked ? <LockOutlined /> : <UnlockOutlined />}
                        className="layer-drawer-action-btn"
                        onClick={(e) => handleLockToggle(e, item)}
                      />
                    </Tooltip>
                    {item.type === 'block' && (
                      <Dropdown
                        menu={{ items: getLayerMenuItems(item) }}
                        placement="bottomRight"
                        trigger={['click']}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined />}
                          className="layer-drawer-action-btn"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Dropdown>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

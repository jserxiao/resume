import { useState, useCallback, useRef } from 'react';
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
  LeftOutlined,
  RightOutlined,
  MoreOutlined,
  DownOutlined,
  RightOutlined as ExpandIcon,
  ScissorOutlined,
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
  /** 分组内的子图层 */
  children?: LayerItem[];
  /** 所属分组ID */
  groupId?: string;
}

interface LayerDrawerProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * 图层悬浮面板
 * - 嵌入左侧面板内，使用 position:absolute 定位到右侧
 * - 可折叠/展开，收起时只显示一个切换按钮
 * - 始终显示舞台图层（分组作为整体 + 未分组的独立块）
 * - 分组可展开/折叠，展开后显示内部子图层
 * - 选中分组时自动展开该分组
 * - 按住 Shift 点击可多选块图层
 * - 右键菜单支持创建分组 / 取消分组
 * - 支持拖拽图层到分组自动加入分组
 */
export default function LayerDrawer({ collapsed, onToggle }: LayerDrawerProps) {
  const {
    resume,
    editor,
    selectBlock,
    selectBlocks,
    addToSelection,
    clearSelection,
    selectGroup,
    toggleBlockVisibility,
    toggleBlockLock,
    moveBlockZIndex,
    createGroup,
    addBlocksToGroup,
    removeBlocksFromGroup,
    removeGroup,
  } = useResumeStore();

  // 记录哪些分组是展开的
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // 拖拽状态
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const dragItemRef = useRef<LayerItem | null>(null);

  if (!resume) return null;

  const selectedGroupId = editor.selectedGroupId;
  const selectedBlockIds = editor.selectedBlockIds;

  /** 获取舞台图层列表（始终显示完整图层树） */
  const getStageLayerItems = (): LayerItem[] => {
    const ungroupedBlocks = resume.blocks.filter((b) => !b.groupId);
    const groups = resume.groups;
    const items: LayerItem[] = [];

    for (const group of groups) {
      const groupBlocks = resume.blocks.filter((b) => group.blockIds.includes(b.id));
      const maxZ = groupBlocks.length > 0 ? Math.max(...groupBlocks.map((b) => b.zIndex)) : 0;
      const allVisible = groupBlocks.length > 0 && groupBlocks.every((b) => b.visible);
      const anyLocked = groupBlocks.some((b) => b.locked);

      const children: LayerItem[] = groupBlocks
        .map((b) => ({
          type: 'block' as const,
          id: b.id,
          name: b.name,
          zIndex: b.zIndex,
          visible: b.visible,
          locked: b.locked,
          groupId: group.id,
        }))
        .sort((a, b) => b.zIndex - a.zIndex);

      items.push({
        type: 'group',
        id: group.id,
        name: group.name,
        zIndex: maxZ,
        visible: allVisible,
        locked: anyLocked,
        children,
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

  const layers = getStageLayerItems();

  // 选中分组时自动展开
  const isGroupExpanded = (groupId: string) => {
    return expandedGroupIds.has(groupId) || selectedGroupId === groupId;
  };

  const toggleGroupExpand = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  /** 点击图层项 - 支持 Shift 多选 */
  const handleLayerClick = (e: React.MouseEvent, item: LayerItem) => {
    if (item.type === 'group') {
      // 分组不支持多选，直接选中
      selectGroup(item.id);
      return;
    }

    if (e.shiftKey) {
      // Shift + 点击：追加/取消选择
      if (selectedBlockIds.includes(item.id)) {
        // 已选中则移除
        const newIds = selectedBlockIds.filter((id) => id !== item.id);
        selectBlocks(newIds);
      } else {
        // 未选中则追加
        addToSelection(item.id);
      }
    } else {
      // 普通点击
      if (selectedBlockIds.length > 1 && selectedBlockIds.includes(item.id)) {
        // 已多选且点击的是已选中的项，不做变更
        return;
      }
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

  // ========== 拖拽逻辑 ==========

  const handleDragStart = (e: React.DragEvent, item: LayerItem) => {
    dragItemRef.current = item;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    // 添加拖拽样式
    (e.currentTarget as HTMLElement).classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    dragItemRef.current = null;
    setDragOverGroupId(null);
    setDragOverEmpty(false);
    (e.currentTarget as HTMLElement).classList.remove('dragging');
    // 清除所有拖拽高亮
    document.querySelectorAll('.layer-drawer-item--drag-over').forEach((el) => {
      el.classList.remove('layer-drawer-item--drag-over');
    });
    document.querySelectorAll('.layer-drawer-content--drag-over').forEach((el) => {
      el.classList.remove('layer-drawer-content--drag-over');
    });
  };

  const handleDragOverGroup = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(groupId);
    setDragOverEmpty(false);
  };

  const handleDragLeaveGroup = (e: React.DragEvent, groupId: string) => {
    // 只有真正离开分组区域时才清除高亮
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverGroupId((prev) => (prev === groupId ? null : prev));
  };

  const handleDropOnGroup = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDragOverGroupId(null);

    const dragItem = dragItemRef.current;
    if (!dragItem) return;

    // 不能拖拽分组到分组
    if (dragItem.type === 'group') return;
    // 不能拖拽自己到自己所在的分组
    if (dragItem.groupId === groupId) return;

    // 如果块已在其他分组中，先从原分组移除
    if (dragItem.groupId) {
      removeBlocksFromGroup(dragItem.groupId, [dragItem.id]);
    }

    // 加入目标分组
    addBlocksToGroup(groupId, [dragItem.id]);
  };

  // 拖拽到空白区域 = 从分组中移出
  const [dragOverEmpty, setDragOverEmpty] = useState(false);

  const handleDragOverEmpty = (e: React.DragEvent) => {
    // 只有拖拽了分组内的块才处理
    const dragItem = dragItemRef.current;
    if (!dragItem || dragItem.type === 'group' || !dragItem.groupId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverEmpty(true);
    setDragOverGroupId(null);
  };

  const handleDragLeaveEmpty = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverEmpty(false);
  };

  const handleDropOnEmpty = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverEmpty(false);

    const dragItem = dragItemRef.current;
    if (!dragItem || dragItem.type === 'group' || !dragItem.groupId) return;

    // 从分组中移出
    removeBlocksFromGroup(dragItem.groupId, [dragItem.id]);
    // 选中该块
    selectBlock(dragItem.id);
  };

  // ========== 右键菜单 ==========

  /** 获取块图层的右键菜单 */
  const getBlockContextMenu = useCallback((item: LayerItem): MenuProps['items'] => {
    const items: NonNullable<MenuProps['items']> = [];

    // 如果当前有多个块选中，且当前项也在选中列表中，则可以对选中项进行分组
    if (selectedBlockIds.length >= 2 && selectedBlockIds.includes(item.id)) {
      items.push({
        key: 'group',
        label: `创建分组（${selectedBlockIds.length} 个元素）`,
        icon: <GroupOutlined />,
        onClick: () => {
          // 先将属于其他分组的块移出原分组
          const blockGroupMap = new Map<string, string[]>();
          for (const id of selectedBlockIds) {
            const block = resume.blocks.find((b) => b.id === id);
            if (block?.groupId) {
              const list = blockGroupMap.get(block.groupId) || [];
              list.push(id);
              blockGroupMap.set(block.groupId, list);
            }
          }
          for (const [gId, bIds] of blockGroupMap) {
            removeBlocksFromGroup(gId, bIds);
          }
          const groupId = createGroup(`分组 ${resume.groups.length + 1}`);
          addBlocksToGroup(groupId, selectedBlockIds);
          selectGroup(groupId);
        },
      });
    }

    // 如果块属于某个分组，提供取消分组选项
    if (item.groupId) {
      items.push({
        key: 'ungroup-self',
        label: '从分组中移出',
        icon: <ScissorOutlined />,
        onClick: () => {
          removeBlocksFromGroup(item.groupId!, [item.id]);
        },
      });
    }

    // 层级调整
    items.push({ type: 'divider' });
    items.push({
      key: 'up',
      label: '上移一层',
      icon: <ArrowUpOutlined />,
      onClick: () => moveBlockZIndex(item.id, 'up'),
    });
    items.push({
      key: 'down',
      label: '下移一层',
      icon: <ArrowDownOutlined />,
      onClick: () => moveBlockZIndex(item.id, 'down'),
    });
    items.push({
      key: 'top',
      label: '置顶',
      icon: <VerticalAlignTopOutlined />,
      onClick: () => moveBlockZIndex(item.id, 'top'),
    });
    items.push({
      key: 'bottom',
      label: '置底',
      icon: <VerticalAlignBottomOutlined />,
      onClick: () => moveBlockZIndex(item.id, 'bottom'),
    });

    return items;
  }, [selectedBlockIds, resume, createGroup, addBlocksToGroup, selectGroup, removeBlocksFromGroup, moveBlockZIndex]);

  /** 获取分组的右键菜单 */
  const getGroupContextMenu = useCallback((item: LayerItem): MenuProps['items'] => {
    return [
      {
        key: 'ungroup',
        label: '取消分组',
        icon: <ScissorOutlined />,
        onClick: () => {
          removeGroup(item.id);
        },
      },
    ];
  }, [removeGroup]);

  /** 获取空白区域的右键菜单 */
  const getEmptyAreaContextMenu = useCallback((): MenuProps['items'] => {
    if (selectedBlockIds.length >= 2) {
      return [
        {
          key: 'group',
          label: `创建分组（${selectedBlockIds.length} 个元素）`,
          icon: <GroupOutlined />,
          onClick: () => {
            // 先将属于其他分组的块移出原分组
            const blockGroupMap = new Map<string, string[]>();
            for (const id of selectedBlockIds) {
              const block = resume.blocks.find((b) => b.id === id);
              if (block?.groupId) {
                const list = blockGroupMap.get(block.groupId) || [];
                list.push(id);
                blockGroupMap.set(block.groupId, list);
              }
            }
            for (const [gId, bIds] of blockGroupMap) {
              removeBlocksFromGroup(gId, bIds);
            }
            const groupId = createGroup(`分组 ${resume.groups.length + 1}`);
            addBlocksToGroup(groupId, selectedBlockIds);
            selectGroup(groupId);
          },
        },
      ];
    }
    return [];
  }, [selectedBlockIds, resume, createGroup, addBlocksToGroup, selectGroup, removeBlocksFromGroup]);

  /** 获取图层项的下拉菜单（MoreOutlined 按钮） */
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

  /** 点击空白区域取消选中 */
  const handleContentClick = (e: React.MouseEvent) => {
    // 只在点击列表空白区域时取消选中
    if ((e.target as HTMLElement).closest('.layer-drawer-item')) return;
    clearSelection();
  };

  /** 渲染子图层项（分组内的块） */
  const renderChildItem = (item: LayerItem) => (
    <Dropdown
      key={item.id}
      menu={{ items: getBlockContextMenu(item) }}
      trigger={['contextMenu']}
    >
      <div
        className={`layer-drawer-item layer-drawer-item--child ${isSelected(item) ? 'selected' : ''} ${!item.visible ? 'hidden-layer' : ''}`}
        onClick={(e) => handleLayerClick(e, item)}
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        onDragEnd={handleDragEnd}
      >
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
        </div>
      </div>
    </Dropdown>
  );

  // ========== 标题栏按钮逻辑 ==========
  // 选中分组 → 显示「取消分组」按钮
  // 选中多个块 → 显示「创建分组」按钮
  // 选中分组内的单个块 → 显示「从分组中移出」按钮
  const renderHeaderActions = () => {
    const actions = [];

    if (selectedGroupId) {
      // 选中了分组 → 取消分组按钮
      actions.push(
        <Tooltip title="取消分组" key="ungroup">
          <Button
            type="text"
            size="small"
            className="layer-drawer-header-btn"
            icon={<ScissorOutlined />}
            onClick={() => {
              removeGroup(selectedGroupId);
            }}
          />
        </Tooltip>
      );
    } else if (selectedBlockIds.length >= 2) {
      // 多个块选中 → 创建分组按钮
      actions.push(
        <Tooltip title={`创建分组（${selectedBlockIds.length} 个元素）`} key="group">
          <Button
            type="text"
            size="small"
            className="layer-drawer-header-btn"
            icon={<GroupOutlined />}
            onClick={() => {
              // 先将属于其他分组的块移出原分组
              const blockGroupMap = new Map<string, string[]>();
              for (const id of selectedBlockIds) {
                const block = resume.blocks.find((b) => b.id === id);
                if (block?.groupId) {
                  const list = blockGroupMap.get(block.groupId) || [];
                  list.push(id);
                  blockGroupMap.set(block.groupId, list);
                }
              }
              for (const [gId, bIds] of blockGroupMap) {
                removeBlocksFromGroup(gId, bIds);
              }
              const groupId = createGroup(`分组 ${resume.groups.length + 1}`);
              addBlocksToGroup(groupId, selectedBlockIds);
              selectGroup(groupId);
            }}
          />
        </Tooltip>
      );
    } else if (selectedBlockIds.length === 1) {
      // 选中单个块 - 检查是否在分组内
      const blockId = selectedBlockIds[0];
      const block = resume.blocks.find((b) => b.id === blockId);
      if (block?.groupId) {
        // 在分组内 → 显示「从分组中移出」按钮
        actions.push(
          <Tooltip title="从分组中移出" key="remove-from-group">
            <Button
              type="text"
              size="small"
              className="layer-drawer-header-btn"
              icon={<ScissorOutlined />}
              onClick={() => {
                removeBlocksFromGroup(block.groupId!, [blockId]);
              }}
            />
          </Tooltip>
        );
      } else {
        // 独立块 → 可以创建分组（只有1个时没意义，但也显示方便后续多选）
        // 不显示任何分组按钮
      }
    }

    // 收起按钮
    actions.push(
      <Tooltip title="收起" key="collapse">
        <Button
          type="text"
          size="small"
          className="layer-drawer-header-btn"
          icon={<LeftOutlined />}
          onClick={onToggle}
        />
      </Tooltip>
    );

    return actions;
  };

  return (
    <div className={`layer-drawer ${collapsed ? 'layer-drawer--collapsed' : ''}`}>
      {/* 收起状态：只显示切换按钮 */}
      {collapsed && (
        <Tooltip title="展开图层面板" placement="right">
          <div className="layer-drawer-toggle-btn" onClick={onToggle}>
            <ProfileOutlined />
            <RightOutlined className="layer-drawer-toggle-arrow" />
          </div>
        </Tooltip>
      )}

      {/* 展开状态：完整图层面板 */}
      {!collapsed && (
        <>
          {/* 标题栏 */}
          <div className="layer-drawer-header">
            <div className="layer-drawer-header-left">
              <ProfileOutlined className="layer-drawer-header-icon" />
              <span className="layer-drawer-header-title">
                舞台图层
                {selectedBlockIds.length > 0 && (
                  <span className="layer-drawer-header-count">
                    ({selectedBlockIds.length})
                  </span>
                )}
              </span>
            </div>
            <div className="layer-drawer-header-actions">
              {renderHeaderActions()}
            </div>
          </div>

          {/* 图层面板内容 */}
          <Dropdown
            menu={{ items: getEmptyAreaContextMenu() }}
            trigger={['contextMenu']}
          >
            <div className={`layer-drawer-content ${dragOverEmpty ? 'layer-drawer-content--drag-over' : ''}`} onClick={handleContentClick}
              onDragOver={handleDragOverEmpty}
              onDragLeave={handleDragLeaveEmpty}
              onDrop={handleDropOnEmpty}
            >
              {layers.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="画布上无元素"
                  style={{ padding: '20px 0' }}
                />
              ) : (
                <div className="layer-drawer-list">
                  {layers.map((item) => {
                    if (item.type === 'group') {
                      const expanded = isGroupExpanded(item.id);
                      return (
                        <Dropdown
                          key={item.id}
                          menu={{ items: getGroupContextMenu(item) }}
                          trigger={['contextMenu']}
                        >
                          <div className="layer-drawer-group-wrapper">
                            {/* 分组行 */}
                            <div
                              className={`layer-drawer-item ${isSelected(item) ? 'selected' : ''} ${!item.visible ? 'hidden-layer' : ''} group-layer ${dragOverGroupId === item.id ? 'layer-drawer-item--drag-over' : ''}`}
                              onClick={() => selectGroup(item.id)}
                              onDragOver={(e) => handleDragOverGroup(e, item.id)}
                              onDragLeave={(e) => handleDragLeaveGroup(e, item.id)}
                              onDrop={(e) => handleDropOnGroup(e, item.id)}
                            >
                              {/* 展开/折叠箭头 */}
                              <span
                                className="layer-drawer-group-expand"
                                onClick={(e) => toggleGroupExpand(e, item.id)}
                              >
                                {expanded ? <DownOutlined /> : <ExpandIcon />}
                              </span>
                              <GroupOutlined className="layer-drawer-group-icon" />
                              <span className="layer-drawer-item-name">{item.name}</span>
                              {/* 分组不显示 z-index */}
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
                              </div>
                            </div>
                            {/* 分组子图层 */}
                            {expanded && item.children && (
                              <div className="layer-drawer-group-children">
                                {item.children.map((child) => renderChildItem(child))}
                              </div>
                            )}
                          </div>
                        </Dropdown>
                      );
                    }

                    // 普通块图层
                    return (
                      <Dropdown
                        key={item.id}
                        menu={{ items: getBlockContextMenu(item) }}
                        trigger={['contextMenu']}
                      >
                        <div
                          className={`layer-drawer-item ${isSelected(item) ? 'selected' : ''} ${!item.visible ? 'hidden-layer' : ''}`}
                          onClick={(e) => handleLayerClick(e, item)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                        >
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
                          </div>
                        </div>
                      </Dropdown>
                    );
                  })}
                </div>
              )}
            </div>
          </Dropdown>
        </>
      )}
    </div>
  );
}

import { useCallback } from 'react';
import { Button, Tooltip, Empty, Dropdown, Popconfirm } from 'antd';
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
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { useLayerItems } from './useLayerItems';
import { useLayerDrag } from './useLayerDrag';
import { useLayerContextMenu, useCreateGroupFromBlocks } from './useLayerContextMenu.tsx';
import type { LayerItem } from './useLayerItems';
import './index.less';

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
  const resume = useResumeStore((s) => s.resume);
  const editor = useResumeStore((s) => s.editor);
  const selectBlock = useResumeStore((s) => s.selectBlock);
  const selectBlocks = useResumeStore((s) => s.selectBlocks);
  const addToSelection = useResumeStore((s) => s.addToSelection);
  const clearSelection = useResumeStore((s) => s.clearSelection);
  const selectGroup = useResumeStore((s) => s.selectGroup);
  const toggleBlockVisibility = useResumeStore((s) => s.toggleBlockVisibility);
  const toggleBlockLock = useResumeStore((s) => s.toggleBlockLock);
  const moveBlockZIndex = useResumeStore((s) => s.moveBlockZIndex);
  const removeGroup = useResumeStore((s) => s.removeGroup);
  const removeBlocksFromGroup = useResumeStore((s) => s.removeBlocksFromGroup);
  const removeBlock = useResumeStore((s) => s.removeBlock);
  const removeBlocks = useResumeStore((s) => s.removeBlocks);
  const saveAsGroupTemplate = useResumeStore((s) => s.saveAsGroupTemplate);
  const selectBlockInGroup = useResumeStore((s) => s.selectBlockInGroup);

  // 使用提取的 hooks
  const { layers, isGroupExpanded, toggleGroupExpand, isSelected } = useLayerItems();
  const drag = useLayerDrag();
  const contextMenu = useLayerContextMenu();
  const createGroupFromBlocks = useCreateGroupFromBlocks();

  const selectedGroupId = editor.selectedGroupId;
  const selectedBlockIds = editor.selectedBlockIds;

  if (!resume) return null;

  /** 点击图层项 - 支持 Shift 多选 */
  const handleLayerClick = (e: React.MouseEvent, item: LayerItem) => {
    if (item.type === 'group') {
      selectGroup(item.id);
      return;
    }

    // 如果点击的元素属于当前选中的分组，保留分组选中状态（"进入分组"选择子元素）
    if (item.groupId && item.groupId === selectedGroupId) {
      if (e.shiftKey) {
        addToSelection(item.id);
      } else {
        selectBlockInGroup(item.id, item.groupId);
      }
      return;
    }

    if (e.shiftKey) {
      if (selectedBlockIds.includes(item.id)) {
        const newIds = selectedBlockIds.filter((id) => id !== item.id);
        selectBlocks(newIds);
      } else {
        addToSelection(item.id);
      }
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

  /** 点击空白区域取消选中 */
  const handleContentClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.layer-drawer-item')) return;
    clearSelection();
  };

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

  /** 渲染子图层项（分组内的块） */
  const renderChildItem = (item: LayerItem) => (
    <Dropdown
      key={item.id}
      menu={{ items: contextMenu.getBlockContextMenu(item) }}
      trigger={['contextMenu']}
    >
      <div
        className={`layer-drawer-item layer-drawer-item--child ${isSelected(item) ? 'selected' : ''} ${!item.visible ? 'hidden-layer' : ''}`}
        onClick={(e) => handleLayerClick(e, item)}
        draggable
        onDragStart={(e) => drag.handleDragStart(e, item)}
        onDragEnd={drag.handleDragEnd}
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
          <Popconfirm
            title="确定删除该图层？"
            onConfirm={() => removeBlock(item.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                className="layer-drawer-action-btn layer-drawer-action-btn--danger"
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
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

  // ========== 标题栏按钮逻辑 ==========
  const renderHeaderActions = () => {
    const actions = [];

    if (selectedGroupId) {
      actions.push(
        <Tooltip title="添加到分组组件" key="save-group">
          <Button
            type="text"
            size="small"
            className="layer-drawer-header-btn"
            icon={<SaveOutlined />}
            onClick={() => saveAsGroupTemplate(selectedGroupId)}
          />
        </Tooltip>
      );
      actions.push(
        <Tooltip title="取消分组" key="ungroup">
          <Button
            type="text"
            size="small"
            className="layer-drawer-header-btn"
            icon={<ScissorOutlined />}
            onClick={() => removeGroup(selectedGroupId)}
          />
        </Tooltip>
      );
    } else if (selectedBlockIds.length >= 2) {
      actions.push(
        <Tooltip title={`创建分组（${selectedBlockIds.length} 个元素）`} key="group">
          <Button
            type="text"
            size="small"
            className="layer-drawer-header-btn"
            icon={<GroupOutlined />}
            onClick={() => createGroupFromBlocks(selectedBlockIds)}
          />
        </Tooltip>
      );
    } else if (selectedBlockIds.length === 1) {
      const blockId = selectedBlockIds[0];
      const block = resume.blocks.find((b) => b.id === blockId);
      if (block?.groupId) {
        actions.push(
          <Tooltip title="从分组中移出" key="remove-from-group">
            <Button
              type="text"
              size="small"
              className="layer-drawer-header-btn"
              icon={<ScissorOutlined />}
              onClick={() => removeBlocksFromGroup(block.groupId!, [blockId])}
            />
          </Tooltip>
        );
      }
    }

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
      {collapsed && (
        <Tooltip title="展开图层面板" placement="right">
          <div className="layer-drawer-toggle-btn" onClick={onToggle}>
            <ProfileOutlined />
            <RightOutlined className="layer-drawer-toggle-arrow" />
          </div>
        </Tooltip>
      )}

      {!collapsed && (
        <>
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

          <Dropdown
            menu={{ items: contextMenu.getEmptyAreaContextMenu() }}
            trigger={['contextMenu']}
          >
            <div
              className={`layer-drawer-content ${drag.dragOverEmpty ? 'layer-drawer-content--drag-over' : ''}`}
              onClick={handleContentClick}
              onDragOver={drag.handleDragOverEmpty}
              onDragLeave={drag.handleDragLeaveEmpty}
              onDrop={drag.handleDropOnEmpty}
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
                          menu={{ items: contextMenu.getGroupContextMenu(item) }}
                          trigger={['contextMenu']}
                        >
                          <div className="layer-drawer-group-wrapper">
                            <div
                              className={`layer-drawer-item ${isSelected(item) ? 'selected' : ''} ${!item.visible ? 'hidden-layer' : ''} group-layer ${drag.dragOverGroupId === item.id ? 'layer-drawer-item--drag-over' : ''}`}
                              onClick={() => selectGroup(item.id)}
                              onDragOver={(e) => drag.handleDragOverGroup(e, item.id)}
                              onDragLeave={(e) => drag.handleDragLeaveGroup(e, item.id)}
                              onDrop={(e) => drag.handleDropOnGroup(e, item.id)}
                            >
                              <span
                                className="layer-drawer-group-expand"
                                onClick={(e) => toggleGroupExpand(e, item.id)}
                              >
                                {expanded ? <DownOutlined /> : <ExpandIcon />}
                              </span>
                              <GroupOutlined className="layer-drawer-group-icon" />
                              <span className="layer-drawer-item-name">{item.name}</span>
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
                                <Popconfirm
                                  title="确定删除该分组及其所有元素？"
                                  onConfirm={() => removeBlocks(item.children?.map(c => c.id) || [])}
                                  okText="删除"
                                  cancelText="取消"
                                  okButtonProps={{ danger: true }}
                                >
                                  <Tooltip title="删除">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      className="layer-drawer-action-btn layer-drawer-action-btn--danger"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </Tooltip>
                                </Popconfirm>
                                {item.children && item.children.length > 0 && (
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
                            {expanded && item.children && (
                              <div className="layer-drawer-group-children">
                                {item.children.map((child) => renderChildItem(child))}
                              </div>
                            )}
                          </div>
                        </Dropdown>
                      );
                    }

                    return (
                      <Dropdown
                        key={item.id}
                        menu={{ items: contextMenu.getBlockContextMenu(item) }}
                        trigger={['contextMenu']}
                      >
                        <div
                          className={`layer-drawer-item ${isSelected(item) ? 'selected' : ''} ${!item.visible ? 'hidden-layer' : ''}`}
                          onClick={(e) => handleLayerClick(e, item)}
                          draggable
                          onDragStart={(e) => drag.handleDragStart(e, item)}
                          onDragEnd={drag.handleDragEnd}
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
                            <Popconfirm
                              title="确定删除该图层？"
                              onConfirm={() => removeBlock(item.id)}
                              okText="删除"
                              cancelText="取消"
                              okButtonProps={{ danger: true }}
                            >
                              <Tooltip title="删除">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  className="layer-drawer-action-btn layer-drawer-action-btn--danger"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </Tooltip>
                            </Popconfirm>
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

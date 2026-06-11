import { useCallback } from 'react';
import type { MenuProps } from 'antd';
import {
  GroupOutlined,
  ScissorOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import type { LayerItem } from './useLayerItems';

/**
 * 创建分组的通用逻辑
 * 先将属于其他分组的块移出原分组，然后创建新分组并加入
 */
export function useCreateGroupFromBlocks() {
  const resume = useResumeStore((s) => s.resume);
  const createGroup = useResumeStore((s) => s.createGroup);
  const addBlocksToGroup = useResumeStore((s) => s.addBlocksToGroup);
  const removeBlocksFromGroup = useResumeStore((s) => s.removeBlocksFromGroup);
  const selectGroup = useResumeStore((s) => s.selectGroup);

  return useCallback((blockIds: string[]) => {
    if (!resume) return;
    // 先将属于其他分组的块移出原分组
    const blockGroupMap = new Map<string, string[]>();
    for (const id of blockIds) {
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
    addBlocksToGroup(groupId, blockIds);
    selectGroup(groupId);
  }, [resume, createGroup, addBlocksToGroup, removeBlocksFromGroup, selectGroup]);
}

/**
 * 图层面板右键菜单 hook
 * - 块图层右键：创建分组 / 从分组移出 / 层级调整
 * - 分组右键：取消分组
 * - 空白区域右键：创建分组
 */
export function useLayerContextMenu() {
  const resume = useResumeStore((s) => s.resume);
  const editor = useResumeStore((s) => s.editor);
  const removeBlocksFromGroup = useResumeStore((s) => s.removeBlocksFromGroup);
  const removeGroup = useResumeStore((s) => s.removeGroup);
  const moveBlockZIndex = useResumeStore((s) => s.moveBlockZIndex);
  const createGroupFromBlocks = useCreateGroupFromBlocks();

  const selectedBlockIds = editor.selectedBlockIds;

  /** 获取块图层的右键菜单 */
  const getBlockContextMenu = useCallback((item: LayerItem): MenuProps['items'] => {
    const items: NonNullable<MenuProps['items']> = [];

    // 如果当前有多个块选中，且当前项也在选中列表中，则可以对选中项进行分组
    if (selectedBlockIds.length >= 2 && selectedBlockIds.includes(item.id)) {
      items.push({
        key: 'group',
        label: `创建分组（${selectedBlockIds.length} 个元素）`,
        icon: <GroupOutlined />,
        onClick: () => createGroupFromBlocks(selectedBlockIds),
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
  }, [selectedBlockIds, createGroupFromBlocks, removeBlocksFromGroup, moveBlockZIndex]);

  /** 获取分组的右键菜单 */
  const getGroupContextMenu = useCallback((item: LayerItem): MenuProps['items'] => {
    return [
      {
        key: 'ungroup',
        label: '取消分组',
        icon: <ScissorOutlined />,
        onClick: () => removeGroup(item.id),
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
          onClick: () => createGroupFromBlocks(selectedBlockIds),
        },
      ];
    }
    return [];
  }, [selectedBlockIds, createGroupFromBlocks]);

  return {
    getBlockContextMenu,
    getGroupContextMenu,
    getEmptyAreaContextMenu,
  };
}

import { useMemo, useState, useCallback } from 'react';
import { useResumeStore } from '@/store';

/** 图层项（统一的数据结构） */
export interface LayerItem {
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

/**
 * 图层列表计算 hook
 * - 计算舞台图层树（分组 + 未分组块），按 zIndex 降序
 * - 管理分组展开/折叠状态
 * - 提供选中判断
 */
export function useLayerItems() {
  const resume = useResumeStore((s) => s.resume);
  const editor = useResumeStore((s) => s.editor);

  // 记录哪些分组是展开的
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  const selectedGroupId = editor.selectedGroupId;
  const selectedBlockIds = editor.selectedBlockIds;

  /** 计算舞台图层列表（始终显示完整图层树） */
  const layers = useMemo<LayerItem[]>(() => {
    if (!resume) return [];

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
  }, [resume]);

  // 选中分组时自动展开
  const isGroupExpanded = useCallback((groupId: string) => {
    return expandedGroupIds.has(groupId) || selectedGroupId === groupId;
  }, [expandedGroupIds, selectedGroupId]);

  const toggleGroupExpand = useCallback((e: React.MouseEvent, groupId: string) => {
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
  }, []);

  /** 判断图层项是否选中 */
  const isSelected = useCallback((item: LayerItem) => {
    if (item.type === 'group') {
      return selectedGroupId === item.id;
    }
    return selectedBlockIds.includes(item.id);
  }, [selectedGroupId, selectedBlockIds]);

  return {
    layers,
    isGroupExpanded,
    toggleGroupExpand,
    isSelected,
    selectedGroupId,
    selectedBlockIds,
  };
}

import { useState, useRef, useCallback } from 'react';
import { useResumeStore } from '@/store';
import type { LayerItem } from './useLayerItems';

/**
 * 图层面板拖拽 hook
 * - 拖拽块到分组：自动加入分组
 * - 拖拽块到空白区域：从分组中移出
 */
export function useLayerDrag() {
  const addBlocksToGroup = useResumeStore((s) => s.addBlocksToGroup);
  const removeBlocksFromGroup = useResumeStore((s) => s.removeBlocksFromGroup);
  const selectBlock = useResumeStore((s) => s.selectBlock);

  // 拖拽状态
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [dragOverEmpty, setDragOverEmpty] = useState(false);
  const dragItemRef = useRef<LayerItem | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, item: LayerItem) => {
    dragItemRef.current = item;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
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
  }, []);

  const handleDragOverGroup = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(groupId);
    setDragOverEmpty(false);
  }, []);

  const handleDragLeaveGroup = useCallback((e: React.DragEvent, groupId: string) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return;
    setDragOverGroupId((prev) => (prev === groupId ? null : prev));
  }, []);

  const handleDropOnGroup = useCallback((e: React.DragEvent, groupId: string) => {
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
  }, [addBlocksToGroup, removeBlocksFromGroup]);

  const handleDragOverEmpty = useCallback((e: React.DragEvent) => {
    const dragItem = dragItemRef.current;
    if (!dragItem || dragItem.type === 'group' || !dragItem.groupId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverEmpty(true);
    setDragOverGroupId(null);
  }, []);

  const handleDragLeaveEmpty = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return;
    setDragOverEmpty(false);
  }, []);

  const handleDropOnEmpty = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverEmpty(false);

    const dragItem = dragItemRef.current;
    if (!dragItem || dragItem.type === 'group' || !dragItem.groupId) return;

    // 从分组中移出
    removeBlocksFromGroup(dragItem.groupId, [dragItem.id]);
    // 选中该块
    selectBlock(dragItem.id);
  }, [removeBlocksFromGroup, selectBlock]);

  return {
    dragOverGroupId,
    dragOverEmpty,
    handleDragStart,
    handleDragEnd,
    handleDragOverGroup,
    handleDragLeaveGroup,
    handleDropOnGroup,
    handleDragOverEmpty,
    handleDragLeaveEmpty,
    handleDropOnEmpty,
  };
}

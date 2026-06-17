import { useState, useRef, useCallback } from 'react';
import { useResumeStore } from '@/store';
import type { LayerItem } from './useLayerItems';

/** 拖拽插入位置 */
export type DropPosition = 'before' | 'after' | null;

/**
 * 图层面板拖拽 hook
 * - 拖拽块到分组：自动加入分组
 * - 拖拽块到空白区域：从分组中移出
 * - 拖拽块到另一个块：排序（改变 zIndex）
 */
export function useLayerDrag() {
  const addBlocksToGroup = useResumeStore((s) => s.addBlocksToGroup);
  const removeBlocksFromGroup = useResumeStore((s) => s.removeBlocksFromGroup);
  const selectBlock = useResumeStore((s) => s.selectBlock);
  const reorderBlock = useResumeStore((s) => s.reorderBlock);

  // 拖拽状态
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [dragOverEmpty, setDragOverEmpty] = useState(false);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
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
    setDragOverItemId(null);
    setDropPosition(null);
    (e.currentTarget as HTMLElement).classList.remove('dragging');
    // 清除所有拖拽高亮
    document.querySelectorAll('.layer-drawer-item--drag-over').forEach((el) => {
      el.classList.remove('layer-drawer-item--drag-over');
    });
    document.querySelectorAll('.layer-drawer-content--drag-over').forEach((el) => {
      el.classList.remove('layer-drawer-content--drag-over');
    });
    document.querySelectorAll('.layer-drawer-item--drop-before, .layer-drawer-item--drop-after').forEach((el) => {
      el.classList.remove('layer-drawer-item--drop-before', 'layer-drawer-item--drop-after');
    });
  }, []);

  const handleDragOverGroup = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(groupId);
    setDragOverEmpty(false);
    setDragOverItemId(null);
    setDropPosition(null);
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

  /**
   * 拖拽经过一个块项 — 判断是在上方还是下方
   */
  const handleDragOverItem = useCallback((e: React.DragEvent, item: LayerItem) => {
    const dragItem = dragItemRef.current;
    if (!dragItem) return;
    // 不允许拖到自身
    if (dragItem.id === item.id) return;
    // 不允许拖到分组上（分组走自己的逻辑）
    if (item.type === 'group') return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // 根据鼠标在项中的垂直位置判断插入点
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos: DropPosition = e.clientY < midY ? 'before' : 'after';

    setDragOverItemId(item.id);
    setDropPosition(pos);
    setDragOverGroupId(null);
    setDragOverEmpty(false);
  }, []);

  const handleDragLeaveItem = useCallback((e: React.DragEvent, itemId: string) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return;
    setDragOverItemId((prev) => (prev === itemId ? null : prev));
    setDropPosition(null);
  }, []);

  /**
   * 放置到一个块项上 — 执行排序
   * 注意：图层面板按 zIndex 降序排列（上方=高zIndex），但 reorderBlock 内部按升序处理。
   * 所以视觉上的 before（在目标上方）= reorderBlock 的 after（更高zIndex），
   * 视觉上的 after（在目标下方）= reorderBlock 的 before（更低zIndex）。
   */
  const handleDropOnItem = useCallback((e: React.DragEvent, item: LayerItem) => {
    e.preventDefault();
    setDragOverItemId(null);
    setDropPosition(null);

    const dragItem = dragItemRef.current;
    if (!dragItem || dragItem.id === item.id) return;
    if (dragItem.type === 'group' || item.type === 'group') return;

    // 翻转 position：视觉 before → reorderBlock after，视觉 after → reorderBlock before
    const reversedPosition = dropPosition === 'before' ? 'after' : 'before';

    // 同层级排序
    if (dragItem.groupId === item.groupId) {
      reorderBlock(dragItem.id, item.id, reversedPosition);
    } else if (!dragItem.groupId && !item.groupId) {
      reorderBlock(dragItem.id, item.id, reversedPosition);
    } else {
      // 不同分组 → 如果目标是分组内的块，将拖拽块加入该分组
      if (item.groupId) {
        if (dragItem.groupId) {
          removeBlocksFromGroup(dragItem.groupId, [dragItem.id]);
        }
        addBlocksToGroup(item.groupId, [dragItem.id]);
      }
    }

    selectBlock(dragItem.id);
  }, [reorderBlock, selectBlock, dropPosition, addBlocksToGroup, removeBlocksFromGroup]);

  const handleDragOverEmpty = useCallback((e: React.DragEvent) => {
    const dragItem = dragItemRef.current;
    if (!dragItem || dragItem.type === 'group' || !dragItem.groupId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverEmpty(true);
    setDragOverGroupId(null);
    setDragOverItemId(null);
    setDropPosition(null);
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
    dragOverItemId,
    dropPosition,
    handleDragStart,
    handleDragEnd,
    handleDragOverGroup,
    handleDragLeaveGroup,
    handleDropOnGroup,
    handleDragOverItem,
    handleDragLeaveItem,
    handleDropOnItem,
    handleDragOverEmpty,
    handleDragLeaveEmpty,
    handleDropOnEmpty,
  };
}

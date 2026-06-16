/**
 * 弹性盒子子元素列表
 *
 * 支持拖拽排序、点击选中、移出弹性盒子
 */
import { useState, useCallback } from 'react';
import { Button, Tooltip } from 'antd';
import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import type { Resume } from '@/types';
import { TEXT_HINT_COLOR } from '@/utils/constants';

interface FlexboxChildListProps {
  flexboxId: string;
  resume: Resume | null;
  removeBlockFromFlexbox: (blockId: string, flexboxId: string) => void;
  reorderFlexboxChildren: (flexboxId: string, childIds: string[]) => void;
  isLocked: boolean;
}

export default function FlexboxChildList({
  flexboxId,
  resume,
  removeBlockFromFlexbox,
  reorderFlexboxChildren,
  isLocked,
}: FlexboxChildListProps) {
  const { selectBlock } = useResumeStore();
  const childBlocks = resume?.blocks.filter(
    (b) => b.groupId === flexboxId && b.visible
  ) ?? [];
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, childId: string) => {
    setDragItemId(childId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('flexboxChildId', childId);
    e.dataTransfer.setData('flexboxId', flexboxId);
  }, [flexboxId]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const draggedId = e.dataTransfer.getData('flexboxChildId');
    if (!draggedId) return;

    const currentIds = childBlocks.map((b) => b.id);
    const fromIndex = currentIds.indexOf(draggedId);
    if (fromIndex === -1 || fromIndex === targetIndex) return;

    const newIds = [...currentIds];
    newIds.splice(fromIndex, 1);
    newIds.splice(targetIndex, 0, draggedId);
    reorderFlexboxChildren(flexboxId, newIds);
    setDragItemId(null);
  }, [childBlocks, flexboxId, reorderFlexboxChildren]);

  const handleDragEnd = useCallback(() => {
    setDragItemId(null);
    setDragOverIndex(null);
  }, []);

  if (childBlocks.length === 0) {
    return (
      <div style={{ color: TEXT_HINT_COLOR, fontSize: 11, padding: '4px 0' }}>
        暂无子元素，拖拽元素到弹性盒子上可添加
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {childBlocks.map((child, index) => (
        <div
          key={child.id}
          draggable={!isLocked}
          onDragStart={(e) => handleDragStart(e, child.id)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 6px',
            borderRadius: 4,
            backgroundColor: dragOverIndex === index ? 'rgba(22, 119, 255, 0.08)' : dragItemId === child.id ? 'rgba(0,0,0,0.03)' : 'transparent',
            border: dragOverIndex === index ? '1px dashed #1677ff' : '1px solid transparent',
            cursor: isLocked ? 'default' : 'pointer',
            fontSize: 11,
            transition: 'background-color 0.15s',
          }}
          onClick={() => selectBlock(child.id)}
        >
          <HolderOutlined style={{ fontSize: 10, color: TEXT_HINT_COLOR, cursor: isLocked ? 'default' : 'grab' }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {child.name}
          </span>
          <span style={{ fontSize: 9, color: TEXT_HINT_COLOR }}>
            {child.templateName}
          </span>
          <Tooltip title="移出弹性盒子">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              style={{ fontSize: 10, color: TEXT_HINT_COLOR, minWidth: 20, width: 20, height: 20, padding: 0 }}
              disabled={isLocked}
              onClick={(e) => {
                e.stopPropagation();
                removeBlockFromFlexbox(child.id, flexboxId);
              }}
            />
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

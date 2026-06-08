import type { BlockGroup } from '@/types';
import { getGroupBounds } from '@/utils/geometry';

interface GroupBorderProps {
  group: BlockGroup;
  blocks: { id: string; x: number; y: number; width: number; height: number }[];
  isSelected: boolean;
  isPreview: boolean;
}

/**
 * 分组边框组件
 * 渲染分组的虚线边框和名称标签
 */
export default function GroupBorder({ group, blocks, isSelected, isPreview }: GroupBorderProps) {
  const bounds = getGroupBounds(group, blocks);
  if (!bounds) return null;

  const rotation = group.rotation || 0;

  return (
    <div
      className={`editor-canvas-group-border ${isSelected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: bounds.x - 4,
        top: bounds.y - 4,
        width: bounds.width + 8,
        height: bounds.height + 8,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: `${bounds.width / 2 + 4}px ${bounds.height / 2 + 4}px`,
        pointerEvents: 'none',
        zIndex: 9990,
      }}
    >
      {!isPreview && (
        <span className="editor-canvas-group-label">{group.name}</span>
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { useResumeStore, calculateAlignGuides } from '@/store';
import { GRID_SIZE, RESIZE_MIN_WIDTH, RESIZE_MIN_HEIGHT, getDefaultBlockWidth, getDefaultBlockHeight } from '@/utils/constants';
import { getDecoPathBounds } from '@/utils/geometry';
import { useDistanceIndicators } from './useDistanceIndicators';
import { useAlignGuides } from './useAlignGuides';
import DistanceIndicators from './DistanceIndicators';
import AlignGuideOverlay from './AlignGuideOverlay';
import { useMarqueeSelection } from './useMarqueeSelection';
import FreeBlockCard from './FreeBlockCard';
import GroupBorder from './GroupBorder';
import CanvasOverlay from './CanvasOverlay';
import './index.less';

interface EditorCanvasProps {
  mode?: 'edit' | 'preview';
}

/**
 * 编辑画布 —— 自由定位编辑/预览区域
 * mode='edit'  —— 支持拖入块模板、自由定位、对齐线、距离显示
 * mode='preview' —— 只读预览，隐藏所有编辑元素
 */
export default function EditorCanvas({ mode = 'edit' }: EditorCanvasProps) {
  const isPreview = mode === 'preview';
  const {
    resume,
    blockTemplates,
    editor,
    addBlock,
    selectBlock,
    selectGroup,
    addToSelection,
    selectBlocks,
    clearSelection,
    updateBlockPosition,
    updateBlockSize,
    updateBlockField,
  } = useResumeStore();

  const pageRef = useRef<HTMLDivElement>(null);
  const [dragOverSlot, setDragOverSlot] = useState(false);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // 标记块拖拽已处理选择，防止 onClick 重复处理
  const blockDragStartedRef = useRef(false);

  // 使用封装的 hooks
  const { refreshDistances, clearDistances, distances, activeBlockPos } = useDistanceIndicators(isPreview);
  const { updateAlignGuides, clearAlignGuides, alignGuides } = useAlignGuides(isPreview);
  const marquee = useMarqueeSelection(
    isPreview,
    pageRef,
    useCallback(() => {
      clearSelection();
      setActiveBlockId(null);
    }, [clearSelection]),
    clearDistances,
  );

  // 拖拽状态
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    blockStartX: number;
    blockStartY: number;
    blockId: string;
    multiBlockPositions?: Record<string, { x: number; y: number }>;
  } | null>(null);

  // 调整大小状态
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    blockStartW: number;
    blockStartH: number;
    blockId: string;
    direction: string;
  } | null>(null);

  if (!resume) return null;

  const { colorScheme, canvas } = resume;
  const visibleBlocks = resume.blocks.filter((b) => b.visible);

  // 页面样式
  const pageStyle: React.CSSProperties = {
    width: canvas.width,
    minHeight: canvas.height,
    backgroundColor: canvas.background || colorScheme.background,
    ...(canvas.backgroundImage ? {
      backgroundImage: `url(${canvas.backgroundImage})`,
      backgroundSize: canvas.backgroundSize || 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    } : {}),
    '--resume-primary': colorScheme.primary,
    '--resume-secondary': colorScheme.secondary,
    '--resume-text': colorScheme.textPrimary,
    '--resume-text-secondary': colorScheme.textSecondary,
    '--resume-text-muted': colorScheme.textMuted,
    '--resume-accent': colorScheme.accent,
    '--resume-block-bg': colorScheme.blockBackground,
  } as React.CSSProperties;

  // 处理从左侧面板拖入模板
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSlot(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(false);
    const templateId = e.dataTransfer.getData('templateId');
    const customTemplateId = e.dataTransfer.getData('customTemplateId');
    const customDecorationId = e.dataTransfer.getData('customDecorationId');
    const groupId = e.dataTransfer.getData('groupId');
    const antdIconName = e.dataTransfer.getData('antdIconName');

    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (templateId) {
      // 拖拽预览图鼠标在中心，放置时也需要以鼠标为中心
      const { blockTemplates } = useResumeStore.getState();
      const template = blockTemplates.find(t => t.id === templateId);
      const bw = getDefaultBlockWidth(template?.category || '');
      const bh = getDefaultBlockHeight(template?.name || '');
      addBlock(templateId, mouseX - bw / 2, mouseY - bh / 2);
    } else if (customDecorationId) {
      // 拖入自定义装饰元素
      const { addBlockFromCustomDecoration, customDecorations } = useResumeStore.getState();
      const decoration = customDecorations.find(d => d.id === customDecorationId);
      if (decoration) {
        const allAnchors = decoration.paths.flatMap(p => p.anchors);
        if (allAnchors.length > 0) {
          // 基于贝塞尔曲线实际采样点计算边界框，避免控制柄远离曲线导致大片空白
          const pathBounds = decoration.paths.map(p => getDecoPathBounds(p.anchors, p.isClosed)).filter(Boolean) as { minX: number; minY: number; maxX: number; maxY: number }[];
          const minX = Math.min(...pathBounds.map(b => b.minX));
          const minY = Math.min(...pathBounds.map(b => b.minY));
          const maxX = Math.max(...pathBounds.map(b => b.maxX));
          const maxY = Math.max(...pathBounds.map(b => b.maxY));
          const rangeX = maxX - minX;
          const rangeY = maxY - minY;
          const aspectRatio = rangeX > 0 && rangeY > 0 ? rangeX / rangeY : 1;
          const baseSize = Math.max(60, Math.round(Math.max(rangeX, rangeY) * 2));
          const bw = Math.round(aspectRatio >= 1 ? baseSize : baseSize * aspectRatio);
          const bh = Math.round(aspectRatio >= 1 ? baseSize / aspectRatio : baseSize);
          addBlockFromCustomDecoration(customDecorationId, mouseX - bw / 2, mouseY - bh / 2);
        } else {
          addBlockFromCustomDecoration(customDecorationId, mouseX, mouseY);
        }
      }
    } else if (customTemplateId) {
      const { addBlockFromCustomTemplate, customElementTemplates } = useResumeStore.getState();
      const template = customElementTemplates.find(t => t.id === customTemplateId);
      if (template && template.blocks.length > 0) {
        const minX = Math.min(...template.blocks.map(b => b.relativeX));
        const minY = Math.min(...template.blocks.map(b => b.relativeY));
        const maxX = Math.max(...template.blocks.map(b => b.relativeX + b.width));
        const maxY = Math.max(...template.blocks.map(b => b.relativeY + b.height));
        const bw = maxX - minX;
        const bh = maxY - minY;
        addBlockFromCustomTemplate(customTemplateId, mouseX - bw / 2, mouseY - bh / 2);
      } else {
        addBlockFromCustomTemplate(customTemplateId, mouseX, mouseY);
      }
    } else if (antdIconName) {
      // 拖入 antd 图标
      const { addBlockFromIcon } = useResumeStore.getState();
      addBlockFromIcon(antdIconName, mouseX - 15, mouseY - 15);
    } else if (groupId) {
      // 拖入分组 - 获取分组中的所有块
      const { getGroupBlocks, resume: r } = useResumeStore.getState();
      if (r) {
        const groupBlocks = getGroupBlocks(groupId);
        if (groupBlocks.length > 0) {
          const minX = Math.min(...groupBlocks.map((b) => b.x));
          const minY = Math.min(...groupBlocks.map((b) => b.y));
          const maxX = Math.max(...groupBlocks.map((b) => b.x + b.width));
          const maxY = Math.max(...groupBlocks.map((b) => b.y + b.height));
          const bw = maxX - minX;
          const bh = maxY - minY;
          for (const gb of groupBlocks) {
            addBlock(gb.templateId, mouseX - bw / 2 + (gb.x - minX), mouseY - bh / 2 + (gb.y - minY), gb.width, gb.height);
          }
        }
      }
    }
  }, [addBlock]);

  // 块拖拽开始
  const handleBlockDragStart = useCallback((blockId: string, e: React.MouseEvent) => {
    if (isPreview) return;
    e.stopPropagation();

    const block = resume.blocks.find((b) => b.id === blockId);
    if (!block || block.locked) return;

    // 标记拖拽已开始处理选择，防止 onClick 重复
    blockDragStartedRef.current = true;

    // 如果块属于分组且分组尚未被选中，则选中整个分组
    if (block.groupId && editor.selectedGroupId !== block.groupId) {
      selectGroup(block.groupId);
    } else if (block.groupId && editor.selectedGroupId === block.groupId) {
      // 分组已选中，拖拽分组内的块时保持分组选中
    } else if (e.shiftKey) {
      // Shift多选（无分组块）
      if (!editor.selectedBlockIds.includes(blockId)) {
        addToSelection(blockId);
      }
    } else {
      if (!editor.selectedBlockIds.includes(blockId)) {
        selectBlock(blockId);
      }
    }

    setDraggingBlockId(blockId);
    setActiveBlockId(blockId);

    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      blockStartX: block.x,
      blockStartY: block.y,
      blockId,
    };

    // 如果有多选或分组选中，记录所有相关块的位置
    const currentSelectedIds = useResumeStore.getState().editor.selectedBlockIds;
    if (currentSelectedIds.includes(blockId) && currentSelectedIds.length > 1) {
      const blockPositions: Record<string, { x: number; y: number }> = {};
      for (const id of currentSelectedIds) {
        const b = resume.blocks.find((bl) => bl.id === id);
        if (b) {
          blockPositions[id] = { x: b.x, y: b.y };
        }
      }
      dragStateRef.current.multiBlockPositions = blockPositions;
    }
  }, [isPreview, resume, selectBlock, selectGroup, addToSelection, selectBlocks, editor.selectedBlockIds, editor.selectedGroupId]);

  // 全局鼠标移动和松开事件
  useEffect(() => {
    if (isPreview) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 框选拖拽中（由 hook 处理，其他拖拽暂停）
      if (marquee.handleMarqueeMouseMove(e)) return;

      if (dragStateRef.current) {
        const { startX, startY, blockStartX, blockStartY, blockId, multiBlockPositions } = dragStateRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newX = blockStartX + dx;
        let newY = blockStartY + dy;

        // 网格吸附
        if (editor.snapToGrid) {
          const grid = editor.gridSize || GRID_SIZE;
          newX = Math.round(newX / grid) * grid;
          newY = Math.round(newY / grid) * grid;
        }

        // 计算对齐线
        const currentBlock = { ...resume.blocks.find((b) => b.id === blockId)!, x: newX, y: newY };
        const otherBlocks = resume.blocks.filter((b) => b.id !== blockId && b.visible);

        if (editor.showAlignGuides) {
          const result = calculateAlignGuides(currentBlock, otherBlocks, resume.canvas);
          if (result.x !== null) newX = result.x;
          if (result.y !== null) newY = result.y;
          updateAlignGuides(result.guides);
        }

        // 更新位置
        updateBlockPosition(blockId, newX, newY);

        // 实时更新距离标注
        refreshDistances(blockId);

        // 如果是多选拖拽，同时移动其他选中的块
        if (multiBlockPositions) {
          for (const [id, pos] of Object.entries(multiBlockPositions)) {
            if (id !== blockId) {
              updateBlockPosition(id, pos.x + dx, pos.y + dy);
            }
          }
        }
      }

      if (resizeStateRef.current) {
        const { startX, startY, blockStartW, blockStartH, blockId, direction } = resizeStateRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newW = blockStartW;
        let newH = blockStartH;

        if (direction.includes('e')) newW = Math.max(RESIZE_MIN_WIDTH, blockStartW + dx);
        if (direction.includes('s')) newH = Math.max(RESIZE_MIN_HEIGHT, blockStartH + dy);
        if (direction.includes('w')) {
          newW = Math.max(RESIZE_MIN_WIDTH, blockStartW - dx);
          const currentBlock = resume.blocks.find((b) => b.id === blockId);
          if (currentBlock) {
            updateBlockPosition(blockId, currentBlock.x + (currentBlock.width - newW), currentBlock.y);
          }
        }
        if (direction.includes('n')) {
          newH = Math.max(RESIZE_MIN_HEIGHT, blockStartH - dy);
          const currentBlock = resume.blocks.find((b) => b.id === blockId);
          if (currentBlock) {
            updateBlockPosition(blockId, currentBlock.x, currentBlock.y + (currentBlock.height - newH));
          }
        }

        updateBlockSize(blockId, newW, newH);

        // 图标块：拖拽缩放时同步更新字号
        const currentBlock = resume.blocks.find((b) => b.id === blockId);
        if (currentBlock?.templateId === 'antd-icon') {
          updateBlockField(blockId, 'icon-font-size', String(Math.round(Math.min(newW, newH))));
        }

        // 实时更新距离标注
        refreshDistances(blockId);
      }
    };

    const handleMouseUp = () => {
      // 完成框选（由 hook 处理）
      if (marquee.handleMarqueeMouseUp()) return;

      if (dragStateRef.current) {
        clearAlignGuides();
        setDraggingBlockId(null);
        dragStateRef.current = null;
      }
      if (resizeStateRef.current) {
        setResizingBlockId(null);
        resizeStateRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPreview, editor.snapToGrid, editor.gridSize, editor.showAlignGuides, resume, updateBlockPosition, updateBlockSize, refreshDistances, updateAlignGuides, clearAlignGuides, marquee]);

  // 块调整大小开始
  const handleBlockResizeStart = useCallback((blockId: string, direction: string, e: React.MouseEvent) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();

    const block = resume.blocks.find((b) => b.id === blockId);
    if (!block || block.locked) return;

    setResizingBlockId(blockId);
    setActiveBlockId(blockId);
    resizeStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      blockStartW: block.width,
      blockStartH: block.height,
      blockId,
      direction,
    };
  }, [isPreview, resume]);

  // 块选中时更新距离（距离检测始终基于选中的元素）
  const handleBlockSelect = useCallback((blockId: string, e?: React.MouseEvent) => {
    if (isPreview) return;
    // 如果 mouseDown 已经处理了选择，跳过（防止重复处理）
    if (blockDragStartedRef.current) {
      blockDragStartedRef.current = false;
      refreshDistances(blockId);
      return;
    }
    const block = resume.blocks.find((b) => b.id === blockId);
    if (!block) return;

    // 如果块属于分组，始终选中整个分组而不是单个块
    if (block.groupId) {
      if (e?.shiftKey) {
        // Shift+点击分组内块：追加整个分组到选中
        const group = resume.groups.find((g) => g.id === block.groupId);
        if (group) {
          const newSelectedIds = new Set(editor.selectedBlockIds);
          for (const id of group.blockIds) {
            newSelectedIds.add(id);
          }
          selectBlocks([...newSelectedIds]);
          selectGroup(block.groupId);
        }
      } else {
        selectGroup(block.groupId);
      }
    } else if (e?.shiftKey) {
      // 无分组的块，Shift多选
      addToSelection(blockId);
    } else {
      selectBlock(blockId);
    }
    setActiveBlockId(blockId);
    refreshDistances(blockId);
  }, [isPreview, resume, selectBlock, selectGroup, addToSelection, selectBlocks, editor.selectedBlockIds, refreshDistances]);

  const handleBlockHover = useCallback((blockId: string) => {
    if (isPreview || !blockId || !resume) return;
    if (dragStateRef.current || resizeStateRef.current) return;
    if (!editor.selectedBlockId) {
      setActiveBlockId(blockId);
      refreshDistances(blockId);
    }
  }, [isPreview, resume, refreshDistances, editor.selectedBlockId]);

  const handleBlockLeave = useCallback(() => {
    // 离开块时不立即清除，保持当前选中块的距离显示
  }, []);

  return (
    <div className={`editor-canvas ${isPreview ? 'preview-mode' : ''}`}>
      <div
        ref={pageRef}
        className="editor-canvas-page"
        style={pageStyle}
        onDragOver={isPreview ? undefined : handleDragOver}
        onDragLeave={isPreview ? undefined : handleDragLeave}
        onDrop={isPreview ? undefined : handleDrop}
        onMouseDown={isPreview ? undefined : marquee.handleCanvasMouseDown}
        onClick={marquee.handleCanvasClick}
      >
        {/* 画布覆盖层：内边距、网格、对齐线、距离、提示、框选 */}
        <CanvasOverlay
          padding={canvas.padding}
          showGrid={editor.snapToGrid}
          gridSize={editor.gridSize || GRID_SIZE}
          isPreview={isPreview}
          showDropHint={dragOverSlot}
          showEmpty={visibleBlocks.length === 0}
          alignGuides={<AlignGuideOverlay isPreview={isPreview} alignGuides={alignGuides} />}
          distances={<DistanceIndicators isPreview={isPreview} activeBlockPos={activeBlockPos} distances={distances} />}
          marquee={marquee.renderMarquee()}
        />

        {/* 渲染分组边框 */}
        {resume.groups.map((group) => (
          <GroupBorder
            key={`group-${group.id}`}
            group={group}
            blocks={visibleBlocks}
            isSelected={!isPreview && editor.selectedGroupId === group.id}
            isPreview={isPreview}
          />
        ))}

        {/* 渲染所有块 */}
        {visibleBlocks.map((block) => {
          const template = blockTemplates.find((t) => t.id === block.templateId);
          const isSelected = !isPreview && (
            editor.selectedBlockId === block.id || editor.selectedBlockIds.includes(block.id)
          );
          const isDragging = draggingBlockId === block.id;
          const isResizing = resizingBlockId === block.id;
          const isGroupSelected = block.groupId && editor.selectedBlockIds.some(id => {
            const b = resume.blocks.find(bl => bl.id === id);
            return b && b.groupId === block.groupId;
          });

          return (
            <FreeBlockCard
              key={block.id}
              block={block}
              template={template}
              isSelected={isSelected}
              isDragging={isDragging}
              isResizing={isResizing}
              isGroupSelected={!!isGroupSelected}
              colorScheme={colorScheme}
              mode={mode}
              onSelect={(e) => handleBlockSelect(block.id, e)}
              onDragStart={(e) => handleBlockDragStart(block.id, e)}
              onResizeStart={(direction, e) => handleBlockResizeStart(block.id, direction, e)}
              onMouseEnter={() => handleBlockHover(block.id)}
              onMouseLeave={handleBlockLeave}
            />
          );
        })}
      </div>
    </div>
  );
}

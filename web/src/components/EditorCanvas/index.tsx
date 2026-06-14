import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import { useResumeStore, calculateAlignGuides } from '@/store';
import { GRID_SIZE, RESIZE_MIN_WIDTH, RESIZE_MIN_HEIGHT, getDefaultBlockWidth, getDefaultBlockHeight } from '@/utils/constants';
import { useDistanceIndicators } from './useDistanceIndicators';
import { useAlignGuides } from './useAlignGuides';
import DistanceIndicators from './DistanceIndicators';
import AlignGuideOverlay from './AlignGuideOverlay';
import { useMarqueeSelection } from './useMarqueeSelection';
import FreeBlockCard from './FreeBlockCard';
import GroupBorder from './GroupBorder';
import CanvasOverlay from './CanvasOverlay';
import WatermarkOverlay from './WatermarkOverlay';
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
    addToSelection,
    clearSelection,
    updateBlockPosition,
    updateBlockSize,
    updateBlockField,
    registerDistanceRefresh,
  } = useResumeStore();

  const pageRef = useRef<HTMLDivElement>(null);
  const [dragOverSlot, setDragOverSlot] = useState(false);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  // 弹性盒子拖入高亮状态
  const [flexboxDropTargetId, setFlexboxDropTargetId] = useState<string | null>(null);

  // 标记块拖拽已处理选择，防止 onClick 重复处理
  const blockDragStartedRef = useRef(false);

  // 使用封装的 hooks
  const { refreshDistances, clearDistances, distances, activeBlockPos } = useDistanceIndicators(isPreview);
  const { updateAlignGuides, clearAlignGuides, alignGuides } = useAlignGuides(isPreview);

  // 将 refreshDistances 注册到 store，供键盘快捷键等外部逻辑调用
  useEffect(() => {
    if (!isPreview) {
      registerDistanceRefresh(refreshDistances);
      return () => registerDistanceRefresh(null);
    }
  }, [isPreview, refreshDistances, registerDistanceRefresh]);
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

    // 检测是否拖到弹性盒子区域
    const flexboxTarget = findFlexboxAtPoint(e.clientX, e.clientY);
    setFlexboxDropTargetId(flexboxTarget);

    if (flexboxTarget) {
      setDragOverSlot(false);
    } else {
      setDragOverSlot(true);
    }
  }, [resume]);

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(false);
    setFlexboxDropTargetId(null);
  }, []);

  // 检测鼠标位置是否在某个弹性盒子块内
  const findFlexboxAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    if (!pageRef.current || !resume) return null;
    const rect = pageRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    // 查找弹性盒子块
    const flexboxBlocks = resume.blocks.filter(
      (b) => b.templateId === 'tpl-flexbox' && b.visible
    );
    // 从上到下（zIndex 最大的优先匹配）
    const sorted = [...flexboxBlocks].sort((a, b) => b.zIndex - a.zIndex);
    for (const fb of sorted) {
      if (
        mouseX >= fb.x && mouseX <= fb.x + fb.width &&
        mouseY >= fb.y && mouseY <= fb.y + fb.height
      ) {
        return fb.id;
      }
    }
    return null;
  }, [resume]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(false);

    // 检测是否落入弹性盒子
    const flexboxTarget = findFlexboxAtPoint(e.clientX, e.clientY);

    // 拖拽的块 ID（从画布内拖拽时设置）
    const draggedBlockId = e.dataTransfer.getData('blockId');

    const templateId = e.dataTransfer.getData('templateId');
    const customTemplateId = e.dataTransfer.getData('customTemplateId');
    const customDecorationId = e.dataTransfer.getData('customDecorationId');
    const groupTemplateId = e.dataTransfer.getData('groupTemplateId');
    const antdIconName = e.dataTransfer.getData('antdIconName');

    // 如果拖入的是画布上已有的块到弹性盒子
    if (flexboxTarget && draggedBlockId) {
      const { addBlockToFlexbox } = useResumeStore.getState();
      const success = addBlockToFlexbox(draggedBlockId, flexboxTarget);
      if (!success) {
        message.warning('分组元素不能放置到弹性盒子中');
      }
      setFlexboxDropTargetId(null);
      return;
    }

    // 如果拖出弹性盒子子元素到画布空白处，自动移出弹性盒子
    if (!flexboxTarget && draggedBlockId) {
      const block = resume.blocks.find((b) => b.id === draggedBlockId);
      if (block?.groupId) {
        const parentBlock = resume.blocks.find((b) => b.id === block.groupId);
        if (parentBlock && parentBlock.templateId === 'tpl-flexbox') {
          const { removeBlockFromFlexbox } = useResumeStore.getState();
          // 计算落点位置
          if (pageRef.current) {
            const rect = pageRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            // 先移出，再更新位置到鼠标落点
            removeBlockFromFlexbox(draggedBlockId, block.groupId!);
            const { updateBlockPosition } = useResumeStore.getState();
            updateBlockPosition(draggedBlockId, mouseX - block.width / 2, mouseY - block.height / 2);
          } else {
            removeBlockFromFlexbox(draggedBlockId, block.groupId!);
          }
          setFlexboxDropTargetId(null);
          return;
        }
      }
    }

    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (templateId) {
      // 不允许将弹性盒子自身拖入另一个弹性盒子
      if (flexboxTarget && templateId === 'tpl-flexbox') {
        setFlexboxDropTargetId(null);
        return;
      }
      // 拖拽预览图鼠标在中心，放置时也需要以鼠标为中心
      const { blockTemplates } = useResumeStore.getState();
      const template = blockTemplates.find(t => t.id === templateId);
      const bw = getDefaultBlockWidth(template?.category || '');
      const bh = getDefaultBlockHeight(template?.name || '');

      if (flexboxTarget) {
        // 从左侧面板拖入到弹性盒子
        addBlock(templateId, mouseX - bw / 2, mouseY - bh / 2);
        const { addBlockToFlexbox, resume: updatedResume } = useResumeStore.getState();
        // 找到刚添加的块
        const newBlock = updatedResume?.blocks[updatedResume.blocks.length - 1];
        if (newBlock) {
          const success = addBlockToFlexbox(newBlock.id, flexboxTarget);
          if (!success) {
            message.warning('分组元素不能放置到弹性盒子中');
          }
        }
        setFlexboxDropTargetId(null);
        return;
      }

      addBlock(templateId, mouseX - bw / 2, mouseY - bh / 2);
    } else if (flexboxTarget && groupTemplateId) {
      // 分组组件模板不允许拖入弹性盒子
      message.warning('分组元素不能放置到弹性盒子中');
      setFlexboxDropTargetId(null);
      return;
    } else if (flexboxTarget && (customDecorationId || customTemplateId || antdIconName)) {
      // 其他类型的拖入暂不加入弹性盒子，正常处理
      setFlexboxDropTargetId(null);
    } else if (customDecorationId) {
      // 拖入自定义装饰元素
      const { addBlockFromCustomDecoration, customDecorations } = useResumeStore.getState();
      const decoration = customDecorations.find(d => d.id === customDecorationId);
      if (decoration) {
        // 使用保存时的舞台尺寸作为默认块尺寸
        const sw = decoration.stageWidth || 400;
        const sh = decoration.stageHeight || 400;
        const bw = Math.max(60, Math.round(sw));
        const bh = Math.max(60, Math.round(sh));
        addBlockFromCustomDecoration(customDecorationId, mouseX - bw / 2, mouseY - bh / 2);
      }
    } else if (groupTemplateId) {
      // 拖入分组组件模板 - 创建分组
      const { addBlockFromGroupTemplate, groupTemplates } = useResumeStore.getState();
      const template = groupTemplates.find(t => t.id === groupTemplateId);
      if (template && template.blocks.length > 0) {
        const minX = Math.min(...template.blocks.map(b => b.relativeX));
        const minY = Math.min(...template.blocks.map(b => b.relativeY));
        const maxX = Math.max(...template.blocks.map(b => b.relativeX + b.width));
        const maxY = Math.max(...template.blocks.map(b => b.relativeY + b.height));
        const bw = maxX - minX;
        const bh = maxY - minY;
        addBlockFromGroupTemplate(groupTemplateId, mouseX - bw / 2, mouseY - bh / 2);
      } else {
        addBlockFromGroupTemplate(groupTemplateId, mouseX, mouseY);
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
      if (flexboxTarget) {
        const { addBlockFromIcon, addBlockToFlexbox, resume: updatedResume } = useResumeStore.getState();
        addBlockFromIcon(antdIconName, mouseX - 15, mouseY - 15);
        const newBlock = updatedResume?.blocks[updatedResume.blocks.length - 1];
        if (newBlock) {
          addBlockToFlexbox(newBlock.id, flexboxTarget);
        }
        setFlexboxDropTargetId(null);
        return;
      }
      const { addBlockFromIcon } = useResumeStore.getState();
      addBlockFromIcon(antdIconName, mouseX - 15, mouseY - 15);
    }

    setFlexboxDropTargetId(null);
  }, [addBlock, findFlexboxAtPoint]);

  // 块拖拽开始
  const handleBlockDragStart = useCallback((blockId: string, e: React.MouseEvent) => {
    if (isPreview) return;
    e.stopPropagation();

    const block = resume.blocks.find((b) => b.id === blockId);
    if (!block || block.locked) return;

    // 标记拖拽已开始处理选择，防止 onClick 重复
    blockDragStartedRef.current = true;

    // 画布上点击/拖拽分组内的元素时，直接选中该元素，不选中分组
    // 只有在图层面板点击分组才选中分组（由 LayerDrawer 处理）
    // 弹性盒子子元素也通过 groupId 关联，直接选中该块进行拖拽
    if (block.groupId) {
      // 分组内的块/弹性盒子子块，直接选中该块进行拖拽
      if (!editor.selectedBlockIds.includes(blockId)) {
        selectBlock(blockId);
      }
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

    // 立即刷新距离标注，避免快速点击其他元素时距离标注不更新
    refreshDistances(blockId);

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
  }, [isPreview, resume, selectBlock, addToSelection, editor.selectedBlockIds, refreshDistances]);

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

        // 检测是否拖到了弹性盒子上
        const fbTarget = findFlexboxAtPoint(e.clientX, e.clientY);
        setFlexboxDropTargetId(fbTarget);

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

    const handleMouseUp = (e: MouseEvent) => {
      // 完成框选（由 hook 处理）
      if (marquee.handleMarqueeMouseUp()) return;

      if (dragStateRef.current) {
        const { blockId, blockStartX, blockStartY, startX, startY } = dragStateRef.current;

        // 检查是否拖到了弹性盒子上，如果是则加入弹性盒子
        const fbTarget = findFlexboxAtPoint(e.clientX, e.clientY);
        if (fbTarget && fbTarget !== blockId) {
          const block = resume.blocks.find((b) => b.id === blockId);
          // 不允许弹性盒子嵌套
        if (block && block.templateId !== 'tpl-flexbox' && block.groupId !== fbTarget) {
          const { addBlockToFlexbox } = useResumeStore.getState();
          const success = addBlockToFlexbox(blockId, fbTarget);
          if (!success) {
            message.warning('分组元素不能放置到弹性盒子中');
          }
        }
        }

        // 检查弹性盒子子元素是否被拖出了弹性盒子
        const block = resume.blocks.find((b) => b.id === blockId);
        if (block?.groupId) {
          const parentBlock = resume.blocks.find((b) => b.id === block.groupId);
          if (parentBlock) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const movedDistance = Math.sqrt(dx * dx + dy * dy);
            // 只有明显移动了才检查是否拖出
            if (movedDistance > 5) {
              const newBlock = useResumeStore.getState().resume?.blocks.find((b) => b.id === blockId);
              if (newBlock?.groupId) {
                // 检查拖拽结束位置是否在弹性盒子外
                const isOutside =
                  newBlock.x < parentBlock.x - 10 ||
                  newBlock.x + newBlock.width > parentBlock.x + parentBlock.width + 10 ||
                  newBlock.y < parentBlock.y - 10 ||
                  newBlock.y + newBlock.height > parentBlock.y + parentBlock.height + 10;
                if (isOutside) {
                  const { removeBlockFromFlexbox } = useResumeStore.getState();
                  removeBlockFromFlexbox(blockId, block.groupId!);
                }
              }
            }
          }
        }

        clearAlignGuides();
        setDraggingBlockId(null);
        setFlexboxDropTargetId(null);
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
  }, [isPreview, editor.snapToGrid, editor.gridSize, editor.showAlignGuides, resume, updateBlockPosition, updateBlockSize, refreshDistances, updateAlignGuides, clearAlignGuides, marquee, findFlexboxAtPoint]);

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

    // 画布上点击分组内的元素时，直接选中该元素（显示元素配置面板）
    // 只有图层面板中点击分组才选中分组（由 LayerDrawer 处理）
    if (block.groupId) {
      if (e?.shiftKey) {
        // Shift+点击分组内块：追加该块到选中
        addToSelection(blockId);
      } else {
        selectBlock(blockId);
      }
    } else if (e?.shiftKey) {
      // 无分组的块，Shift多选
      addToSelection(blockId);
    } else {
      selectBlock(blockId);
    }
    setActiveBlockId(blockId);
    refreshDistances(blockId);
  }, [isPreview, resume, selectBlock, addToSelection, refreshDistances]);

  const handleBlockHover = useCallback((blockId: string) => {
    if (isPreview || !blockId || !resume) return;
    if (dragStateRef.current || resizeStateRef.current) return;
    // 始终更新距离标注，支持快速 hover 不同元素时实时展示距离
    if (!editor.selectedBlockId || editor.selectedBlockId !== blockId) {
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

        {/* 水印层 */}
        {canvas.watermark && (
          <WatermarkOverlay
            watermark={canvas.watermark}
            canvasWidth={canvas.width}
            canvasHeight={canvas.height}
          />
        )}

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

        {/* 渲染所有块（弹性盒子子元素由弹性盒子内部渲染，不在画布顶层渲染） */}
        {visibleBlocks.map((block) => {
          // 跳过弹性盒子子元素的顶层渲染
          if (block.groupId) {
            const parentBlock = resume.blocks.find((b) => b.id === block.groupId);
            if (parentBlock && parentBlock.templateId === 'tpl-flexbox') {
              return null;
            }
          }

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
              isFlexboxDropTarget={flexboxDropTargetId === block.id}
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

import { useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlusOutlined } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import SortableBlockCard from './SortableBlockCard';
import './index.less';

/**
 * 编辑画布 —— 按布局分割的编辑区域
 * 支持从左侧拖入块模板、放置后显示删除按钮、块内字段可即时编辑
 */
export default function EditorCanvas() {
  const { resume, blockTemplates, editor, addBlockToSlot, removeBlock, updateBlockField, selectBlock } = useResumeStore();
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  if (!resume) return null;

  const { colorScheme, layout } = resume;
  const isDoubleLayout = layout.type === 'double' || layout.type === 'mixed';

  // 密度对应的字号/行距
  const densityStyles: Record<string, { fontSize: number; lineHeight: number; spacing: number }> = {
    compact: { fontSize: 12, lineHeight: 1.4, spacing: 8 },
    standard: { fontSize: 13, lineHeight: 1.5, spacing: 12 },
    spacious: { fontSize: 14, lineHeight: 1.65, spacing: 16 },
  };
  const density = densityStyles[layout.density] || densityStyles.standard;

  const leftRatio = layout.columnRatio[0] / 100;
  const rightRatio = layout.columnRatio[1] / 100;

  const headerBlocks = resume.blocks.filter((b) => b.column === 'header' && b.visible);
  const leftBlocks = resume.blocks.filter((b) => b.column === 'left' && b.visible);
  const rightBlocks = resume.blocks.filter((b) => b.column === 'right' && b.visible);

  return (
    <div className="editor-canvas">
      <div
        className="editor-canvas-page"
        style={{
          backgroundColor: colorScheme.background,
          fontSize: density.fontSize,
          lineHeight: density.lineHeight,
          '--resume-primary': colorScheme.primary,
          '--resume-secondary': colorScheme.secondary,
          '--resume-text': colorScheme.textPrimary,
          '--resume-text-secondary': colorScheme.textSecondary,
          '--resume-text-muted': colorScheme.textMuted,
          '--resume-accent': colorScheme.accent,
          '--resume-block-bg': colorScheme.blockBackground,
          '--resume-spacing': `${density.spacing}px`,
        } as React.CSSProperties}
      >
        {/* 头部槽位 —— 可拖入块 */}
        <HeaderSlot
          blocks={headerBlocks}
          blockTemplates={blockTemplates}
          selectedBlockId={editor.selectedBlockId}
          dragOverSlot={dragOverSlot}
          setDragOverSlot={setDragOverSlot}
          addBlockToSlot={addBlockToSlot}
          removeBlock={removeBlock}
          updateBlockField={updateBlockField}
          selectBlock={selectBlock}
          density={density}
          colorScheme={colorScheme}
        />

        {isDoubleLayout ? (
          <div className="editor-canvas-body double">
            <ColumnSlot
              id="left"
              width={`${leftRatio * 100}%`}
              blocks={leftBlocks}
              blockTemplates={blockTemplates}
              selectedBlockId={editor.selectedBlockId}
              dragOverSlot={dragOverSlot}
              setDragOverSlot={setDragOverSlot}
              addBlockToSlot={addBlockToSlot}
              removeBlock={removeBlock}
              updateBlockField={updateBlockField}
              selectBlock={selectBlock}
              density={density}
              colorScheme={colorScheme}
            />
            <ColumnSlot
              id="right"
              width={`${rightRatio * 100}%`}
              blocks={rightBlocks}
              blockTemplates={blockTemplates}
              selectedBlockId={editor.selectedBlockId}
              dragOverSlot={dragOverSlot}
              setDragOverSlot={setDragOverSlot}
              addBlockToSlot={addBlockToSlot}
              removeBlock={removeBlock}
              updateBlockField={updateBlockField}
              selectBlock={selectBlock}
              density={density}
              colorScheme={colorScheme}
            />
          </div>
        ) : (
          <div className="editor-canvas-body single">
            <ColumnSlot
              id="right"
              width="100%"
              blocks={rightBlocks}
              blockTemplates={blockTemplates}
              selectedBlockId={editor.selectedBlockId}
              dragOverSlot={dragOverSlot}
              setDragOverSlot={setDragOverSlot}
              addBlockToSlot={addBlockToSlot}
              removeBlock={removeBlock}
              updateBlockField={updateBlockField}
              selectBlock={selectBlock}
              density={density}
              colorScheme={colorScheme}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 头部槽位组件 ==========
interface HeaderSlotProps {
  blocks: ReturnType<typeof useResumeStore>['resume'] extends { blocks: infer B } | null ? B : never;
  blockTemplates: ReturnType<typeof useResumeStore>['blockTemplates'];
  selectedBlockId: string | null;
  dragOverSlot: string | null;
  setDragOverSlot: (slot: string | null) => void;
  addBlockToSlot: (templateId: string, column: 'header' | 'left' | 'right', index?: number) => void;
  removeBlock: (blockId: string) => void;
  updateBlockField: (blockId: string, fieldId: string, value: string) => void;
  selectBlock: (blockId: string | null) => void;
  density: { fontSize: number; lineHeight: number; spacing: number };
  colorScheme: ReturnType<typeof useResumeStore>['resume'] extends { colorScheme: infer C } | null ? C : never;
}

function HeaderSlot({
  blocks,
  blockTemplates,
  selectedBlockId,
  dragOverSlot,
  setDragOverSlot,
  addBlockToSlot,
  removeBlock,
  updateBlockField,
  selectBlock,
  density,
  colorScheme,
}: HeaderSlotProps) {
  const slotKey = 'header';
  const isDragOver = dragOverSlot === slotKey;

  const { setNodeRef, isOver } = useDroppable({
    id: slotKey,
    data: { column: 'header' },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSlot(slotKey);
  }, [setDragOverSlot]);

  const handleDragLeave = useCallback(() => {
    if (dragOverSlot === slotKey) {
      setDragOverSlot(null);
    }
  }, [dragOverSlot, setDragOverSlot]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(null);
    const templateId = e.dataTransfer.getData('templateId');
    if (templateId) {
      addBlockToSlot(templateId, 'header');
    }
  }, [addBlockToSlot, setDragOverSlot]);

  const blockIds = blocks.map((b) => b.id);

  return (
    <div
      ref={setNodeRef}
      className={`editor-canvas-header-slot ${isDragOver || isOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        {blocks.map((block) => {
          const template = blockTemplates.find((t) => t.id === block.templateId);
          return (
            <SortableBlockCard
              key={block.id}
              block={block}
              template={template}
              isSelected={selectedBlockId === block.id}
              onSelect={() => selectBlock(block.id)}
              onDelete={() => removeBlock(block.id)}
              onUpdateField={(fieldId, value) => updateBlockField(block.id, fieldId, value)}
              density={density}
              colorScheme={colorScheme}
            />
          );
        })}
      </SortableContext>

      {blocks.length === 0 && (
        <div className="editor-canvas-header-empty">
          <PlusOutlined style={{ fontSize: 20, color: '#d0d0d0' }} />
          <p>拖入块到头部</p>
        </div>
      )}
    </div>
  );
}

// ========== 栏位槽位组件 ==========
interface ColumnSlotProps {
  id: 'left' | 'right';
  width: string;
  blocks: ReturnType<typeof useResumeStore>['resume'] extends { blocks: infer B } | null ? B : never;
  blockTemplates: ReturnType<typeof useResumeStore>['blockTemplates'];
  selectedBlockId: string | null;
  dragOverSlot: string | null;
  setDragOverSlot: (slot: string | null) => void;
  addBlockToSlot: (templateId: string, column: 'header' | 'left' | 'right', index?: number) => void;
  removeBlock: (blockId: string) => void;
  updateBlockField: (blockId: string, fieldId: string, value: string) => void;
  selectBlock: (blockId: string | null) => void;
  density: { fontSize: number; lineHeight: number; spacing: number };
  colorScheme: ReturnType<typeof useResumeStore>['resume'] extends { colorScheme: infer C } | null ? C : never;
}

function ColumnSlot({
  id,
  width,
  blocks,
  blockTemplates,
  selectedBlockId,
  dragOverSlot,
  setDragOverSlot,
  addBlockToSlot,
  removeBlock,
  updateBlockField,
  selectBlock,
  density,
  colorScheme,
}: ColumnSlotProps) {
  const slotKey = `${id}`;
  const isDragOver = dragOverSlot === slotKey;

  const { setNodeRef, isOver } = useDroppable({
    id: slotKey,
    data: { column: id },
  });

  // 处理拖入
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSlot(slotKey);
  }, [slotKey, setDragOverSlot]);

  const handleDragLeave = useCallback(() => {
    if (dragOverSlot === slotKey) {
      setDragOverSlot(null);
    }
  }, [slotKey, dragOverSlot, setDragOverSlot]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(null);
    const templateId = e.dataTransfer.getData('templateId');
    if (templateId) {
      addBlockToSlot(templateId, id);
    }
  }, [id, addBlockToSlot, setDragOverSlot]);

  const blockIds = blocks.map((b) => b.id);

  return (
    <div
      ref={setNodeRef}
      className={`editor-canvas-column ${id} ${isDragOver || isOver ? 'drag-over' : ''}`}
      style={{ width }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        <div className="editor-canvas-column-content">
          {blocks.map((block) => {
            const template = blockTemplates.find((t) => t.id === block.templateId);
            return (
              <SortableBlockCard
                key={block.id}
                block={block}
                template={template}
                isSelected={selectedBlockId === block.id}
                onSelect={() => selectBlock(block.id)}
                onDelete={() => removeBlock(block.id)}
                onUpdateField={(fieldId, value) => updateBlockField(block.id, fieldId, value)}
                density={density}
                colorScheme={colorScheme}
              />
            );
          })}

          {blocks.length === 0 && (
            <div className="editor-canvas-empty-slot">
              <PlusOutlined style={{ fontSize: 20, color: '#d0d0d0' }} />
              <p>拖入块到此处</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

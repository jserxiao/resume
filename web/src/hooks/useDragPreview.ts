import { useRef, useCallback } from 'react';
import type { BlockTemplate, CustomElementTemplate, BlockGroup, BlockInstance, CustomDecorationDefinition, ColorScheme } from '@/types';
import {
  createBlockDragPreview,
  createCustomElementDragPreview,
  createGroupDragPreview,
  createCustomDecorationDragPreview,
  cleanupDragPreview,
} from '@/utils/dragPreview';

interface UseDragPreviewOptions {
  /** 块模板列表，用于通过 templateId 查找模板 */
  blockTemplates: BlockTemplate[];
  /** 自定义元素模板列表 */
  customElementTemplates: CustomElementTemplate[];
  /** 自定义装饰列表 */
  customDecorations: CustomDecorationDefinition[];
  /** 当前简历块列表（用于分组拖拽预览） */
  blocks: BlockInstance[];
  /** 分组列表 */
  groups: BlockGroup[];
  /** 当前配色方案 */
  colorScheme?: ColorScheme;
}

/**
 * 拖拽预览管理 Hook
 *
 * 封装了拖拽预览元素的创建、设置和清理逻辑。
 * 支持：块模板、自定义元素、分组、自定义装饰四种拖拽类型。
 */
export function useDragPreview(options: UseDragPreviewOptions) {
  const { blockTemplates, customElementTemplates, customDecorations, blocks, groups, colorScheme } = options;

  // 拖拽预览元素引用，用于拖拽结束后清理
  const dragPreviewRef = useRef<HTMLElement | null>(null);

  /** 清理上一个拖拽预览元素 */
  const cleanupPrevPreview = useCallback(() => {
    if (dragPreviewRef.current) {
      cleanupDragPreview(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }
  }, []);

  /** 拖拽开始（块模板） */
  const handleBlockDragStart = useCallback(
    (e: React.DragEvent, templateId: string) => {
      e.dataTransfer.setData('templateId', templateId);
      e.dataTransfer.effectAllowed = 'copy';

      const template = blockTemplates.find((t) => t.id === templateId);
      if (template && colorScheme) {
        cleanupPrevPreview();
        const previewEl = createBlockDragPreview(template, colorScheme);
        dragPreviewRef.current = previewEl;
        e.dataTransfer.setDragImage(previewEl, previewEl.offsetWidth / 2, previewEl.offsetHeight / 2);
      }
    },
    [blockTemplates, colorScheme, cleanupPrevPreview],
  );

  /** 拖拽开始（自定义元素） */
  const handleCustomDragStart = useCallback(
    (e: React.DragEvent, templateId: string) => {
      e.dataTransfer.setData('customTemplateId', templateId);
      e.dataTransfer.effectAllowed = 'copy';

      const template = customElementTemplates.find((t) => t.id === templateId);
      if (template && colorScheme) {
        cleanupPrevPreview();
        const previewEl = createCustomElementDragPreview(template, colorScheme);
        dragPreviewRef.current = previewEl;
        e.dataTransfer.setDragImage(previewEl, previewEl.offsetWidth / 2, previewEl.offsetHeight / 2);
      }
    },
    [customElementTemplates, colorScheme, cleanupPrevPreview],
  );

  /** 拖拽开始（分组） */
  const handleGroupDragStart = useCallback(
    (e: React.DragEvent, groupId: string) => {
      e.dataTransfer.setData('groupId', groupId);
      e.dataTransfer.effectAllowed = 'copy';

      const group = groups.find((g) => g.id === groupId);
      if (group && colorScheme) {
        cleanupPrevPreview();
        const previewEl = createGroupDragPreview(group, blocks, colorScheme);
        dragPreviewRef.current = previewEl;
        e.dataTransfer.setDragImage(previewEl, previewEl.offsetWidth / 2, previewEl.offsetHeight / 2);
      }
    },
    [groups, blocks, colorScheme, cleanupPrevPreview],
  );

  /** 拖拽开始（自定义装饰） */
  const handleDecorationDragStart = useCallback(
    (e: React.DragEvent, decorationId: string) => {
      e.dataTransfer.setData('customDecorationId', decorationId);
      e.dataTransfer.effectAllowed = 'copy';

      const decoration = customDecorations.find((d) => d.id === decorationId);
      if (decoration) {
        cleanupPrevPreview();
        const previewEl = createCustomDecorationDragPreview(decoration);
        dragPreviewRef.current = previewEl;
        e.dataTransfer.setDragImage(previewEl, previewEl.offsetWidth / 2, previewEl.offsetHeight / 2);
      }
    },
    [customDecorations, cleanupPrevPreview],
  );

  /** 拖拽结束后清理预览元素 */
  const handleDragEnd = useCallback(() => {
    cleanupPrevPreview();
  }, [cleanupPrevPreview]);

  return {
    handleBlockDragStart,
    handleCustomDragStart,
    handleGroupDragStart,
    handleDecorationDragStart,
    handleDragEnd,
  };
}

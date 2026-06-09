import { useState, useCallback, useRef, useEffect } from 'react';
import { useResumeStore } from '@/store';
import { rectsOverlap } from '@/utils/geometry';
import type { Rect } from '@/utils/geometry';

/** 框选起始信息 */
interface MarqueeStart {
  startX: number;
  startY: number;
  isShiftKey: boolean;
  hasMoved: boolean; // 是否已实际拖动（超过阈值）
}

/**
 * 框选 Hook
 * 管理画布空白区域的框选状态、事件处理和矩形渲染
 *
 * @param isPreview - 是否为预览模式
 * @param containerRef - 画布容器 ref
 * @param onClearSelection - 清除选中回调
 * @param onClearDistances - 清除距离标注回调
 *
 * @returns marqueeRect - 当前框选矩形（用于渲染）
 * @returns handleCanvasMouseDown - 画布 mousedown 事件处理
 * @returns handleCanvasClick - 画布 click 事件处理（需配合使用，防止框选完成后误取消选择）
 * @returns renderMarquee - 渲染框选矩形
 * @returns isMarqueeActive - 当前是否正在框选
 */
export function useMarqueeSelection(
  isPreview: boolean,
  containerRef: React.RefObject<HTMLDivElement | null>,
  onClearSelection: () => void,
  onClearDistances: () => void,
) {
  const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null);
  const marqueeStartRef = useRef<MarqueeStart | null>(null);
  const marqueeRectRef = useRef<Rect | null>(null);
  const justFinishedRef = useRef(false);

  /** 判断点击目标是否为画布空白区域 */
  const isCanvasArea = (e: React.MouseEvent): boolean => {
    const target = e.target as HTMLElement;
    return (
      e.target === e.currentTarget ||
      target.classList.contains('editor-canvas-page') ||
      target.classList.contains('editor-canvas-grid') ||
      target.classList.contains('editor-canvas-padding-area') ||
      target.classList.contains('editor-canvas-empty') ||
      target.classList.contains('editor-canvas-drop-hint')
    );
  };

  /** 画布 mousedown —— 开始框选或取消选择 */
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isPreview) return;
      if (!isCanvasArea(e)) return;

      // 阻止文字选中
      e.preventDefault();

      // 如果不是 Shift 键，先清除选择
      if (!e.shiftKey) {
        onClearSelection();
        onClearDistances();
      }

      // 开始框选
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      marqueeStartRef.current = { startX, startY, isShiftKey: e.shiftKey, hasMoved: false };
    },
    [isPreview, containerRef, onClearSelection, onClearDistances],
  );

  /** 画布 click —— 点击空白区域取消选择 */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPreview) return;
      // 如果刚完成框选，不触发 click 取消选择
      if (justFinishedRef.current) {
        justFinishedRef.current = false;
        return;
      }
      if (isCanvasArea(e)) {
        onClearSelection();
        onClearDistances();
      }
    },
    [isPreview, onClearSelection, onClearDistances],
  );

  /** 完成框选 —— 检测与框选矩形相交的块 */
  const finishMarquee = useCallback(() => {
    const start = marqueeStartRef.current;
    const currentRect = marqueeRectRef.current;
    if (!start || !currentRect) return false;

    const { isShiftKey } = start;
    const { x, y, width, height } = currentRect;

    // 只有框选区域有一定大小时才选择
    if (width > 3 && height > 3) {
      const state = useResumeStore.getState();
      if (state.resume) {
        const overlappedIds = state.resume.blocks
          .filter((b) => {
            if (!b.visible || b.locked) return false;
            return rectsOverlap(currentRect, { x: b.x, y: b.y, width: b.width, height: b.height });
          })
          .map((b) => b.id);

        if (overlappedIds.length > 0) {
          const { selectBlocks } = useResumeStore.getState();
          if (isShiftKey) {
            const existingIds = new Set(state.editor.selectedBlockIds);
            for (const id of overlappedIds) {
              existingIds.add(id);
            }
            selectBlocks([...existingIds]);
          } else {
            selectBlocks(overlappedIds);
          }
        }
      }
    }

    marqueeStartRef.current = null;
    marqueeRectRef.current = null;
    setMarqueeRect(null);
    justFinishedRef.current = true;
    return true;
  }, []);

  /** 全局 mousemove 中的框选拖拽处理，返回 true 表示框选正在处理（不处理其他拖拽） */
  const handleMarqueeMouseMove = useCallback(
    (e: MouseEvent): boolean => {
      if (!marqueeStartRef.current) return false;
      const container = containerRef.current;
      if (!container) return false;

      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const { startX, startY } = marqueeStartRef.current;
      const dx = Math.abs(currentX - startX);
      const dy = Math.abs(currentY - startY);

      // 只有拖动超过阈值才进入框选状态，避免点击时出现框选矩形
      if (!marqueeStartRef.current.hasMoved) {
        if (dx > 3 || dy > 3) {
          marqueeStartRef.current.hasMoved = true;
        } else {
          // 还没开始实际拖动，返回 false 让其他逻辑正常处理
          return true;
        }
      }

      const newRect: Rect = {
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: dx,
        height: dy,
      };
      marqueeRectRef.current = newRect;
      setMarqueeRect(newRect);
      return true;
    },
    [containerRef],
  );

  /** 全局 mouseup 中的框选完成处理，返回 true 表示框选已完成 */
  const handleMarqueeMouseUp = useCallback((): boolean => {
    if (!marqueeStartRef.current) return false;
    // 如果没有实际拖动，只是点击，直接清理框选状态
    if (!marqueeStartRef.current.hasMoved) {
      marqueeStartRef.current = null;
      marqueeRectRef.current = null;
      setMarqueeRect(null);
      return true;
    }
    finishMarquee();
    return true;
  }, [finishMarquee]);

  /** 是否正在框选 */
  const isMarqueeActive = marqueeStartRef.current !== null;

  /** 渲染框选矩形 */
  const renderMarquee = () => {
    if (isPreview || !marqueeRect || marqueeRect.width <= 1 || marqueeRect.height <= 1) return null;
    return (
      <div
        className="editor-canvas-marquee"
        style={{
          position: 'absolute',
          left: marqueeRect.x,
          top: marqueeRect.y,
          width: marqueeRect.width,
          height: marqueeRect.height,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
    );
  };

  return {
    marqueeRect,
    isMarqueeActive,
    handleCanvasMouseDown,
    handleCanvasClick,
    handleMarqueeMouseMove,
    handleMarqueeMouseUp,
    renderMarquee,
  };
}

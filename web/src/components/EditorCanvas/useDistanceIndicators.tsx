import { useState, useCallback } from 'react';
import { useResumeStore, calculateDistances } from '@/store';
import { DISTANCE_LINE_COLOR, DISTANCE_TEXT_COLOR, DISTANCE_TEXT_BG, DISTANCE_TEXT_FONT_SIZE } from '@/utils/constants';

/** 距离标注数据 */
export interface DistanceData {
  direction: 'horizontal' | 'vertical';
  from: number;
  to: number;
  value: number;
}

/**
 * 距离指示器 Hook
 * 管理当前活跃块的距离计算和渲染状态
 */
export function useDistanceIndicators(isPreview: boolean) {
  const [distances, setDistances] = useState<DistanceData[]>([]);
  const [activeBlockPos, setActiveBlockPos] = useState<{ x: number; y: number } | null>(null);

  /** 刷新距离标注（实时调用，直接从 store 读取最新数据） */
  const refreshDistances = useCallback((blockId: string) => {
    if (isPreview || !blockId) return;
    const { resume: r } = useResumeStore.getState();
    if (!r) return;
    const block = r.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const otherBlocks = r.blocks.filter((b) => b.id !== blockId && b.visible);
    const dists = calculateDistances(block, otherBlocks, r.canvas);
    setDistances(dists);
    setActiveBlockPos({ x: block.x, y: block.y });
  }, [isPreview]);

  /** 清除距离标注 */
  const clearDistances = useCallback(() => {
    setDistances([]);
    setActiveBlockPos(null);
  }, []);

  /** 渲染距离标注（对齐到元素左上角，位置裁剪到画布内边距区域） */
  const renderDistances = () => {
    if (isPreview || !activeBlockPos || distances.length === 0) return null;

    // 获取画布尺寸用于裁剪
    const { resume: r } = useResumeStore.getState();
    if (!r) return null;
    const { padding, width, height } = r.canvas;

    // 将距离线位置裁剪到画布内边距区域
    const clampY = (y: number) => Math.max(padding, Math.min(y, height - padding));
    const clampX = (x: number) => Math.max(padding, Math.min(x, width - padding));

    return (
      <div className="editor-canvas-distances">
        {distances.map((dist, i) => {
          if (dist.direction === 'horizontal') {
            return (
              <div
                key={i}
                className="editor-canvas-distance horizontal"
                style={{
                  left: dist.from,
                  top: clampY(activeBlockPos.y - 1),
                  width: dist.to - dist.from,
                  borderTopColor: DISTANCE_LINE_COLOR,
                }}
              >
                <span
                  className="editor-canvas-distance-value"
                  style={{
                    color: DISTANCE_TEXT_COLOR,
                    background: DISTANCE_TEXT_BG,
                    fontSize: DISTANCE_TEXT_FONT_SIZE,
                  }}
                >
                  {Math.abs(Math.round(dist.value))}px
                </span>
              </div>
            );
          } else {
            return (
              <div
                key={i}
                className="editor-canvas-distance vertical"
                style={{
                  top: dist.from,
                  left: clampX(activeBlockPos.x - 1),
                  height: dist.to - dist.from,
                  borderLeftColor: DISTANCE_LINE_COLOR,
                }}
              >
                <span
                  className="editor-canvas-distance-value"
                  style={{
                    color: DISTANCE_TEXT_COLOR,
                    background: DISTANCE_TEXT_BG,
                    fontSize: DISTANCE_TEXT_FONT_SIZE,
                  }}
                >
                  {Math.abs(Math.round(dist.value))}px
                </span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return {
    distances,
    activeBlockPos,
    refreshDistances,
    clearDistances,
    renderDistances,
  };
}

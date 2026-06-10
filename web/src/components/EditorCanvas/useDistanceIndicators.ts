import { useState, useCallback } from 'react';
import { useResumeStore, calculateDistances } from '@/store';

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

  return {
    distances,
    activeBlockPos,
    refreshDistances,
    clearDistances,
  };
}

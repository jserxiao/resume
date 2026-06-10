import { useState, useCallback } from 'react';
import type { AlignGuide } from '@/types';

/**
 * 对齐线 Hook
 * 管理对齐线的显示和清除
 */
export function useAlignGuides(isPreview: boolean) {
  const [alignGuides, setAlignGuides] = useState<AlignGuide[]>([]);

  /** 设置对齐线 */
  const updateAlignGuides = useCallback((guides: AlignGuide[]) => {
    if (isPreview) return;
    setAlignGuides(guides);
  }, [isPreview]);

  /** 清除对齐线 */
  const clearAlignGuides = useCallback(() => {
    setAlignGuides([]);
  }, []);

  return {
    alignGuides,
    updateAlignGuides,
    clearAlignGuides,
  };
}

import { useState, useCallback } from 'react';
import type { AlignGuide } from '@/types';
import { ALIGN_GUIDE_COLOR } from '@/utils/constants';

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

  /** 渲染对齐线 */
  const renderAlignGuides = () => {
    if (isPreview || alignGuides.length === 0) return null;
    return (
      <div className="editor-canvas-align-guides">
        {alignGuides.map((guide, i) => (
          <div
            key={i}
            className={`editor-canvas-align-guide ${guide.type}`}
            style={
              guide.type === 'horizontal'
                ? {
                  top: guide.position,
                  left: guide.start,
                  width: guide.end - guide.start,
                  background: ALIGN_GUIDE_COLOR,
                }
                : {
                  left: guide.position,
                  top: guide.start,
                  height: guide.end - guide.start,
                  background: ALIGN_GUIDE_COLOR,
                }
            }
          />
        ))}
      </div>
    );
  };

  return {
    alignGuides,
    updateAlignGuides,
    clearAlignGuides,
    renderAlignGuides,
  };
}

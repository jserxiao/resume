import type { AlignGuide } from '@/types';
import { ALIGN_GUIDE_COLOR } from '@/utils/constants';

interface AlignGuideOverlayProps {
  isPreview: boolean;
  alignGuides: AlignGuide[];
}

/**
 * 对齐线渲染组件
 */
export default function AlignGuideOverlay({ isPreview, alignGuides }: AlignGuideOverlayProps) {
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
}

import { DISTANCE_LINE_COLOR, DISTANCE_TEXT_COLOR, DISTANCE_TEXT_BG, DISTANCE_TEXT_FONT_SIZE } from '@/utils/constants';
import { useResumeStore } from '@/store';
import type { DistanceData } from './useDistanceIndicators';

interface DistanceIndicatorsProps {
  isPreview: boolean;
  activeBlockPos: { x: number; y: number } | null;
  distances: DistanceData[];
}

/**
 * 距离标注渲染组件
 */
export default function DistanceIndicators({ isPreview, activeBlockPos, distances }: DistanceIndicatorsProps) {
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
}

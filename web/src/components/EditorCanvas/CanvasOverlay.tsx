import {
  CANVAS_PADDING_INDICATOR_COLOR,
  CANVAS_PADDING_INDICATOR_BORDER_COLOR,
} from '@/utils/constants';

interface CanvasOverlayProps {
  /** 画布内边距值 */
  padding: number;
  /** 是否显示网格 */
  showGrid: boolean;
  /** 网格大小 */
  gridSize: number;
  /** 是否为预览模式 */
  isPreview: boolean;
  /** 是否显示拖入提示 */
  showDropHint: boolean;
  /** 是否显示空状态 */
  showEmpty: boolean;
  /** 对齐线渲染 */
  alignGuides: React.ReactNode;
  /** 距离标注渲染 */
  distances: React.ReactNode;
  /** 框选矩形渲染 */
  marquee: React.ReactNode;
}

/**
 * 画布覆盖层组件
 * 统一渲染画布上的辅助元素：内边距区域、网格、对齐线、距离标注、拖入提示、空状态、框选矩形
 */
export default function CanvasOverlay({
  padding,
  showGrid,
  gridSize,
  isPreview,
  showDropHint,
  showEmpty,
  alignGuides,
  distances,
  marquee,
}: CanvasOverlayProps) {
  return (
    <>
      {/* 画布内边距区域（编辑模式下暗色显示） */}
      {!isPreview && padding > 0 && (
        <div
          className="editor-canvas-padding-area"
          style={{
            position: 'absolute',
            top: padding,
            left: padding,
            right: padding,
            bottom: padding,
            border: `1px dashed ${CANVAS_PADDING_INDICATOR_BORDER_COLOR}`,
            backgroundColor: CANVAS_PADDING_INDICATOR_COLOR,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* 网格 */}
      {showGrid && !isPreview && (
        <div
          className="editor-canvas-grid"
          style={{
            backgroundSize: `${gridSize}px ${gridSize}px`,
          }}
        />
      )}

      {/* 对齐线 */}
      {alignGuides}

      {/* 距离标注 */}
      {distances}

      {/* 拖入提示 */}
      {showDropHint && !isPreview && (
        <div className="editor-canvas-drop-hint">
          释放以放置元素
        </div>
      )}

      {/* 空状态提示 */}
      {showEmpty && !isPreview && (
        <div className="editor-canvas-empty">
          <div className="editor-canvas-empty-icon">📋</div>
          <p className="editor-canvas-empty-title">从左侧拖拽模板到此处</p>
          <p className="editor-canvas-empty-hint">自由放置元素到任意位置</p>
        </div>
      )}

      {/* 框选矩形 */}
      {marquee}
    </>
  );
}

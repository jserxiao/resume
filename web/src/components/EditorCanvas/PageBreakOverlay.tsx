import {
  PAGE_BREAK_LINE_COLOR,
  PAGE_BREAK_LABEL_BG,
  PAGE_BREAK_LABEL_COLOR,
} from '@/utils/constants';

interface PageBreakOverlayProps {
  /** 分页线 Y 坐标列表 */
  breakPositions: number[];
  /** 画布宽度 */
  canvasWidth: number;
  /** 是否为预览模式 */
  isPreview: boolean;
  /** 每页高度 */
  pageHeight: number;
}

/**
 * 分页分隔线覆盖层
 * 在编辑模式下渲染虚线分页符 + 页码标签
 * 在预览模式下渲染淡色分页线
 */
export default function PageBreakOverlay({
  breakPositions,
  canvasWidth,
  isPreview,
  pageHeight,
}: PageBreakOverlayProps) {
  if (breakPositions.length === 0) return null;

  if (isPreview) {
    // 预览模式：渲染淡色分页线
    return (
      <>
        {breakPositions.map((y, idx) => (
          <div
            key={`page-break-${idx}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: y,
              height: 0,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: 1,
                borderTop: `1px dashed rgba(0, 0, 0, 0.1)`,
              }}
            />
          </div>
        ))}
      </>
    );
  }

  // 编辑模式：渲染虚线分页符 + 页码标签
  return (
    <>
      {breakPositions.map((y, idx) => (
        <div
          key={`page-break-${idx}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: y,
            height: 0,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {/* 分隔线 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 1,
              borderTop: `2px dashed ${PAGE_BREAK_LINE_COLOR}`,
            }}
          />
          {/* 页码标签 - 左侧 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: -10,
              fontSize: 10,
              color: PAGE_BREAK_LABEL_COLOR,
              backgroundColor: PAGE_BREAK_LABEL_BG,
              padding: '1px 6px',
              borderRadius: '0 0 4px 0',
              lineHeight: '16px',
              whiteSpace: 'nowrap',
            }}
          >
            第 {idx + 1} 页
          </div>
          {/* 页码标签 - 右侧 */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: -10,
              fontSize: 10,
              color: PAGE_BREAK_LABEL_COLOR,
              backgroundColor: PAGE_BREAK_LABEL_BG,
              padding: '1px 6px',
              borderRadius: '0 0 0 4px',
              lineHeight: '16px',
              whiteSpace: 'nowrap',
            }}
          >
            第 {idx + 2} 页
          </div>
        </div>
      ))}

      {/* 底部总页数标签 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 2,
          fontSize: 10,
          color: PAGE_BREAK_LABEL_COLOR,
          backgroundColor: PAGE_BREAK_LABEL_BG,
          padding: '1px 6px',
          borderRadius: '0 4px 0 0',
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        共 {breakPositions.length + 1} 页（每页 {pageHeight}px）
      </div>
    </>
  );
}

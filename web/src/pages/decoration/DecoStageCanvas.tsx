/**
 * 装饰编辑器 — SVG 画布渲染组件
 *
 * 负责：
 * - 网格渲染
 * - 路径 SVG 渲染（填充 + 描边 + 逐边着色）
 * - 追踪线渲染
 * - 辅助线与距离标注渲染
 * - 锚点、控制柄、边中点渲染
 * - 鼠标位置指示器
 * - 选区裁剪矩形
 */
import React from 'react';
import { DECO_GRID_SIZE, DECO_CLOSE_THRESHOLD } from '@/utils/constants';
import type { AnchorPixel, EditablePath, GuideLine, DistanceLabel } from './types';
import type { ShapeType } from '@/utils/geometry';

interface DecoStageCanvasProps {
  stageWidth: number;
  stageHeight: number;
  paths: EditablePath[];
  activePathIdx: number;
  activePath: EditablePath;
  isMouseOnStage: boolean;
  mousePos: AnchorPixel | null;
  guideLines: GuideLine[];
  distances: DistanceLabel[];
  selectedAnchorIdx: number | null;
  selectedEdgeIdx: number | null;
  selectionRect: { startX: number; startY: number; endX: number; endY: number } | null;
  activeShape: ShapeType;
  isSelecting: boolean;
  getEdgeMidpoint: (edgeIdx: number) => AnchorPixel | null;
  getEdgeCount: (path: EditablePath) => number;
  onStageClick: (e: React.MouseEvent) => void;
  onStageContextMenu: (e: React.MouseEvent) => void;
  onStageMouseDown: (e: React.MouseEvent) => void;
  onStageMouseMove: (e: React.MouseEvent) => void;
  onStageMouseLeave: () => void;
  onAnchorMouseDown: (idx: number, e: React.MouseEvent) => void;
  onAnchorClick: (idx: number, e: React.MouseEvent) => void;
  onHandleOutMouseDown: (idx: number, e: React.MouseEvent) => void;
  onHandleInMouseDown: (idx: number, e: React.MouseEvent) => void;
  onEdgeMidMouseDown: (edgeIdx: number, mid: AnchorPixel, e: React.MouseEvent) => void;
  onEdgeMidClick: (edgeIdx: number, e: React.MouseEvent) => void;
  stageRef: React.RefObject<HTMLDivElement | null>;
}

export default function DecoStageCanvas({
  stageWidth,
  stageHeight,
  paths,
  activePathIdx,
  activePath,
  isMouseOnStage,
  mousePos,
  guideLines,
  distances,
  selectedAnchorIdx,
  selectedEdgeIdx,
  selectionRect,
  activeShape,
  isSelecting,
  getEdgeMidpoint,
  getEdgeCount,
  onStageClick,
  onStageContextMenu,
  onStageMouseDown,
  onStageMouseMove,
  onStageMouseLeave,
  onAnchorMouseDown,
  onAnchorClick,
  onHandleOutMouseDown,
  onHandleInMouseDown,
  onEdgeMidMouseDown,
  onEdgeMidClick,
  stageRef,
}: DecoStageCanvasProps) {
  // ===== 渲染网格 =====
  const renderGrid = () => {
    const lines: React.ReactNode[] = [];
    for (let x = 0; x <= stageWidth; x += DECO_GRID_SIZE) {
      lines.push(
        <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={stageHeight} stroke="#e5e7eb" strokeWidth={0.5} />,
      );
    }
    for (let y = 0; y <= stageHeight; y += DECO_GRID_SIZE) {
      lines.push(
        <line key={`h-${y}`} x1={0} y1={y} x2={stageWidth} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />,
      );
    }
    lines.push(
      <line key="cx" x1={stageWidth / 2} y1={0} x2={stageWidth / 2} y2={stageHeight} stroke="#93c5fd" strokeWidth={0.8} strokeDasharray="4 4" />,
      <line key="cy" x1={0} y1={stageHeight / 2} x2={stageWidth} y2={stageHeight / 2} stroke="#93c5fd" strokeWidth={0.8} strokeDasharray="4 4" />,
    );
    return (
      <svg className="deco-editor-grid" width={stageWidth} height={stageHeight}>
        {lines}
      </svg>
    );
  };

  // ===== 渲染所有路径 SVG =====
  const renderPaths = () => {
    return paths.map((path, pathIdx) => {
      if (!path.visible || path.anchors.length === 0) return null;
      const isActive = pathIdx === activePathIdx;

      // 构建 SVG path d 属性
      let pathD = `M ${path.anchors[0].x} ${path.anchors[0].y}`;
      for (let i = 1; i < path.anchors.length; i++) {
        const prev = path.anchors[i - 1];
        const curr = path.anchors[i];
        const control = prev.handleOut || curr.handleIn;
        if (control) {
          pathD += ` Q ${control.x} ${control.y} ${curr.x} ${curr.y}`;
        } else {
          pathD += ` L ${curr.x} ${curr.y}`;
        }
      }

      if (path.isClosed && path.anchors.length >= 3) {
        const last = path.anchors[path.anchors.length - 1];
        const first = path.anchors[0];
        const control = last.handleOut || first.handleIn;
        if (control) {
          pathD += ` Q ${control.x} ${control.y} ${first.x} ${first.y}`;
        } else {
          pathD += ` L ${first.x} ${first.y}`;
        }
        pathD += ' Z';
      }

      // 追踪线（仅当前活跃路径）
      let trackingPathD = '';
      if (isActive && !path.isClosed && isMouseOnStage && mousePos && path.anchors.length > 0) {
        const last = path.anchors[path.anchors.length - 1];
        const first = path.anchors[0];

        const isNearClose = path.anchors.length >= 3 && (() => {
          const dx = mousePos.x - first.x;
          const dy = mousePos.y - first.y;
          return Math.sqrt(dx * dx + dy * dy) < DECO_CLOSE_THRESHOLD;
        })();

        if (isNearClose) {
          if (last.handleOut) {
            trackingPathD = `M ${last.x} ${last.y} Q ${last.handleOut.x} ${last.handleOut.y} ${first.x} ${first.y}`;
          } else {
            trackingPathD = `M ${last.x} ${last.y} L ${first.x} ${first.y}`;
          }
        } else {
          if (last.handleOut) {
            trackingPathD = `M ${last.x} ${last.y} Q ${last.handleOut.x} ${last.handleOut.y} ${mousePos.x} ${mousePos.y}`;
          } else {
            trackingPathD = `M ${last.x} ${last.y} L ${mousePos.x} ${mousePos.y}`;
          }
        }
      }

      return (
        <svg key={path.id} className="deco-editor-svg-layer" width={stageWidth} height={stageHeight}>
          {path.clipRect && (
            <defs>
              <clipPath id={`clip-${path.id}`}>
                <rect x={path.clipRect.x} y={path.clipRect.y} width={path.clipRect.width} height={path.clipRect.height} />
              </clipPath>
            </defs>
          )}
          <g clipPath={path.clipRect ? `url(#clip-${path.id})` : undefined}>
            {path.isClosed && path.anchors.length >= 3 && (
              <path d={pathD} fill={path.fillColor} stroke="none" />
            )}
            {path.edgeColors && path.edgeColors.some((c, i) => c && c !== path.strokeColor) ? (
              (() => {
                const n = path.anchors.length;
                const edgeCount = path.isClosed ? n : n - 1;
                const segments: React.ReactNode[] = [];
                for (let i = 0; i < edgeCount; i++) {
                  const from = path.anchors[i];
                  const to = path.anchors[(i + 1) % n];
                  const control = from.handleOut || to.handleIn;
                  let segD = `M ${from.x} ${from.y}`;
                  if (control) {
                    segD += ` Q ${control.x} ${control.y} ${to.x} ${to.y}`;
                  } else {
                    segD += ` L ${to.x} ${to.y}`;
                  }
                  segments.push(
                    <path
                      key={`edge-${i}`}
                      d={segD}
                      fill="none"
                      stroke={path.edgeColors[i] || path.strokeColor}
                      strokeWidth={path.strokeWidth}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={isActive ? 1 : 0.5}
                    />
                  );
                }
                return segments;
              })()
            ) : (
              <path
                d={pathD}
                fill="none"
                stroke={path.strokeColor}
                strokeWidth={path.strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={isActive ? 1 : 0.5}
              />
            )}
          </g>
          {trackingPathD && (
            <path d={trackingPathD} className="deco-editor-tracking-line" />
          )}
        </svg>
      );
    });
  };

  // ===== 渲染辅助线 =====
  const renderGuideLines = () => {
    return guideLines.map((g, i) => (
      <div
        key={i}
        className={`deco-editor-guide-line ${g.type}`}
        style={g.type === 'horizontal' ? { top: g.position } : { left: g.position }}
      />
    ));
  };

  // ===== 渲染距离标注 =====
  const renderDistances = () => {
    return distances.map((d) => (
      <div
        key={d.id}
        className="deco-editor-distance"
        style={{ left: d.x, top: d.y }}
      >
        {d.text}
      </div>
    ));
  };

  // ===== 渲染当前路径锚点 =====
  const renderAnchors = () => {
    if (!activePath || !activePath.visible) return null;
    return activePath.anchors.map((a, i) => (
      <div
        key={i}
        className={`deco-editor-anchor ${i === 0 ? 'first-anchor' : ''} ${selectedAnchorIdx === i ? 'selected' : ''}`}
        style={{ left: a.x, top: a.y }}
        onMouseDown={(e) => onAnchorMouseDown(i, e)}
        onClick={(e) => onAnchorClick(i, e)}
      />
    ));
  };

  // ===== 渲染边中点 =====
  const renderEdgeMidpoints = () => {
    if (!activePath || !activePath.visible || activePath.anchors.length < 2) return null;
    const midpoints: React.ReactNode[] = [];
    const edgeCount = getEdgeCount(activePath);

    for (let i = 0; i < edgeCount; i++) {
      const mid = getEdgeMidpoint(i);
      if (!mid) continue;
      const edgeColor = activePath.edgeColors?.[i] || activePath.strokeColor;
      const isSelected = selectedEdgeIdx === i;

      midpoints.push(
        <div
          key={`edge-mid-${i}`}
          className={`deco-editor-edge-midpoint ${isSelected ? 'selected' : ''}`}
          style={{ left: mid.x, top: mid.y }}
          onMouseDown={(e) => onEdgeMidMouseDown(i, mid, e)}
          onClick={(e) => onEdgeMidClick(i, e)}
        >
          <div
            className="deco-editor-edge-midpoint-color"
            style={{ background: edgeColor }}
          />
        </div>,
      );
    }

    return midpoints;
  };

  // ===== 渲染控制柄 =====
  const renderHandles = () => {
    if (!activePath || !activePath.visible) return null;
    const handles: React.ReactNode[] = [];

    activePath.anchors.forEach((a, i) => {
      if (a.handleOut) {
        handles.push(
          <svg
            key={`line-out-${i}`}
            className="deco-editor-svg-layer"
            width={stageWidth}
            height={stageHeight}
            style={{ pointerEvents: 'none' }}
          >
            <line
              x1={a.x} y1={a.y}
              x2={a.handleOut.x} y2={a.handleOut.y}
              stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3"
            />
          </svg>,
          <div
            key={`handle-out-${i}`}
            className="deco-editor-handle deco-editor-handle--out"
            style={{ left: a.handleOut.x, top: a.handleOut.y }}
            onMouseDown={(e) => onHandleOutMouseDown(i, e)}
            onClick={(e) => e.stopPropagation()}
          />,
        );
      }

      if (a.handleIn) {
        handles.push(
          <svg
            key={`line-in-${i}`}
            className="deco-editor-svg-layer"
            width={stageWidth}
            height={stageHeight}
            style={{ pointerEvents: 'none' }}
          >
            <line
              x1={a.x} y1={a.y}
              x2={a.handleIn.x} y2={a.handleIn.y}
              stroke="#a855f7" strokeWidth={1} strokeDasharray="3 3"
            />
          </svg>,
          <div
            key={`handle-in-${i}`}
            className="deco-editor-handle deco-editor-handle--in"
            style={{ left: a.handleIn.x, top: a.handleIn.y }}
            onMouseDown={(e) => onHandleInMouseDown(i, e)}
            onClick={(e) => e.stopPropagation()}
          />,
        );
      }
    });

    return handles;
  };

  // ===== 鼠标位置指示器 =====
  const renderCursor = () => {
    if (!isMouseOnStage || !mousePos || activePath?.isClosed) return null;
    return (
      <div
        style={{
          position: 'absolute',
          left: mousePos.x,
          top: mousePos.y,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: '#f43f5e',
          transform: 'translate(-2px, -2px)',
          pointerEvents: 'none',
          zIndex: 7,
        }}
      />
    );
  };

  // ===== 判断闭合提示 =====
  const canClose = !activePath?.isClosed && activePath?.anchors.length >= 3 && isMouseOnStage && mousePos && (() => {
    const first = activePath.anchors[0];
    const dx = mousePos.x - first.x;
    const dy = mousePos.y - first.y;
    return Math.sqrt(dx * dx + dy * dy) < DECO_CLOSE_THRESHOLD;
  })();

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={stageRef}
        className="deco-editor-stage"
        style={{ width: stageWidth, height: stageHeight, cursor: activeShape !== 'select' ? 'crosshair' : isSelecting ? 'crosshair' : 'crosshair' }}
        onClick={onStageClick}
        onContextMenu={onStageContextMenu}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseLeave={onStageMouseLeave}
      >
        {renderGrid()}
        {renderPaths()}
        {renderGuideLines()}
        {renderDistances()}
        {/* 选区裁剪矩形 */}
        {selectionRect && (() => {
          const rx1 = Math.min(selectionRect.startX, selectionRect.endX);
          const ry1 = Math.min(selectionRect.startY, selectionRect.endY);
          const rx2 = Math.max(selectionRect.startX, selectionRect.endX);
          const ry2 = Math.max(selectionRect.startY, selectionRect.endY);
          return (
            <div
              className="deco-editor-selection-rect"
              style={{ left: rx1, top: ry1, width: rx2 - rx1, height: ry2 - ry1 }}
            />
          );
        })()}
        {renderAnchors()}
        {renderEdgeMidpoints()}
        {renderHandles()}
        {renderCursor()}
      </div>
      <div className="deco-editor-size-label">
        {stageWidth} × {stageHeight} px
      </div>
    </div>
  );
}

/**
 * 装饰编辑器页面
 *
 * 路由：/decoration-editor
 * 功能：自定义贝塞尔矢量图形编辑器，支持锚点绘制、控制柄编辑、形状工具、裁剪
 *
 * 模块拆分：
 * - types.ts         — 内部类型定义（AnchorPixel, EditablePath, GuideLine, DistanceLabel）
 * - useDecoAnchors   — 锚点/路径状态管理 Hook
 * - useDecoSnapGuides — 辅助线与距离标注 Hook
 * - DecoStageCanvas  — SVG 画布渲染组件
 * - DecoToolbar      — 顶部工具栏 + 左侧形状工具栏
 * - DecoPathList     — 右侧配置面板
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useResumeStore } from '@/store';
import { DECO_CLOSE_THRESHOLD } from '@/utils/constants';
import { generateShapeAnchors } from '@/utils/geometry';
import type { AnchorPixel } from './decoration/types';
import { useDecoAnchors } from './decoration/useDecoAnchors';
import { useDecoSnapGuides } from './decoration/useDecoSnapGuides';
import DecoStageCanvas from './decoration/DecoStageCanvas';
import DecoToolbar from './decoration/DecoToolbar';
import DecoPathList from './decoration/DecoPathList';
import './DecorationEditorPage.less';

export default function DecorationEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  // ===== 舞台尺寸 =====
  const [stageWidth, setStageWidth] = useState(400);
  const [stageHeight, setStageHeight] = useState(400);

  // ===== 核心状态 Hook =====
  const anchors = useDecoAnchors(stageWidth, stageHeight, editId);
  const snap = useDecoSnapGuides(anchors.activePath, stageWidth, stageHeight);

  const stageRef = useRef<HTMLDivElement>(null);

  // ===== 舞台点击：添加锚点 / 放置形状 / 选区裁剪确认 =====
  const handleStageClick = useCallback(
    (e: React.MouseEvent) => {
      if (anchors.justDraggedRef.current) {
        anchors.justDraggedRef.current = false;
        return;
      }

      const pos = snap.getStagePos(e, stageRef, stageWidth, stageHeight);
      if (!pos) return;

      // 选区裁剪模式：已有选区时，点击清除选区
      if (anchors.activeShape === 'select' && anchors.selectionRect) {
        anchors.setSelectionRect(null);
        return;
      }

      // 形状工具：点击放置形状
      if (anchors.activeShape !== 'select') {
        const baseSize = Math.min(stageWidth, stageHeight) * 0.4;
        let shapeW = baseSize;
        let shapeH = baseSize;
        if (anchors.activeShape === 'ellipse') {
          shapeW = baseSize * 1.4;
          shapeH = baseSize * 0.8;
        }
        const sx = pos.x - shapeW / 2;
        const sy = pos.y - shapeH / 2;
        const shapeAnchors = generateShapeAnchors(anchors.activeShape, sx, sy, shapeW, shapeH);
        if (shapeAnchors.length === 0) return;

        const newAnchors: AnchorPixel[] = shapeAnchors.map(a => ({
          x: a.x,
          y: a.y,
          handleOut: a.handleOut ? { x: a.handleOut.x, y: a.handleOut.y } : undefined,
          handleIn: a.handleIn ? { x: a.handleIn.x, y: a.handleIn.y } : undefined,
        }));

        const newPaths = [...anchors.paths];
        newPaths[anchors.activePathIdx] = { ...newPaths[anchors.activePathIdx], anchors: newAnchors, isClosed: true };
        anchors.setPaths(newPaths);
        anchors.pushHistory(newPaths);
        anchors.setActiveShape('select');
        return;
      }

      if (anchors.activePath.isClosed) return;
      if (anchors.draggingIdx !== null) return;
      if (anchors.draggingHandle !== null) return;

      // 检查是否靠近第一个锚点（闭合路径）
      if (anchors.activePath.anchors.length >= 3) {
        const first = anchors.activePath.anchors[0];
        const dx = pos.x - first.x;
        const dy = pos.y - first.y;
        if (Math.sqrt(dx * dx + dy * dy) < DECO_CLOSE_THRESHOLD) {
          const newAnchors = [...anchors.activePath.anchors];
          const last = newAnchors[newAnchors.length - 1];
          const firstA = newAnchors[0];

          if (!last.handleOut) {
            const ddx = firstA.x - last.x;
            const ddy = firstA.y - last.y;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            const handleLen = dist * 0.3;
            if (dist > 0) {
              const nx = ddx / dist;
              const ny = ddy / dist;
              newAnchors[newAnchors.length - 1] = {
                ...last,
                handleOut: { x: last.x + nx * handleLen, y: last.y + ny * handleLen },
              };
            }
          }

          const updatedFirst = newAnchors[0];
          if (!updatedFirst.handleIn) {
            const ddx = firstA.x - last.x;
            const ddy = firstA.y - last.y;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            const handleLen = dist * 0.3;
            if (dist > 0) {
              const nx = ddx / dist;
              const ny = ddy / dist;
              newAnchors[0] = {
                ...updatedFirst,
                handleIn: { x: firstA.x - nx * handleLen, y: firstA.y - ny * handleLen },
              };
            }
          }

          const newPaths = [...anchors.paths];
          newPaths[anchors.activePathIdx] = { ...newPaths[anchors.activePathIdx], anchors: newAnchors, isClosed: true };
          anchors.setPaths(newPaths);
          anchors.pushHistory(newPaths);
          return;
        }
      }

      const newAnchor: AnchorPixel = { x: pos.x, y: pos.y };

      if (anchors.activePath.anchors.length > 0) {
        const last = anchors.activePath.anchors[anchors.activePath.anchors.length - 1];
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const handleLen = dist * 0.3;
        if (dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const prevAnchors = [...anchors.activePath.anchors];
          const prevLast = prevAnchors[prevAnchors.length - 1];
          if (!prevLast.handleOut) {
            prevAnchors[prevAnchors.length - 1] = {
              ...prevLast,
              handleOut: { x: last.x + nx * handleLen, y: last.y + ny * handleLen },
            };
          }
          newAnchor.handleIn = { x: pos.x - nx * handleLen, y: pos.y - ny * handleLen };
          const newAnchors = [...prevAnchors, newAnchor];
          const newPaths = [...anchors.paths];
          newPaths[anchors.activePathIdx] = { ...newPaths[anchors.activePathIdx], anchors: newAnchors };
          anchors.setPaths(newPaths);
          anchors.pushHistory(newPaths);
          return;
        }
      }

      const newAnchors = [...anchors.activePath.anchors, newAnchor];
      const newPaths = [...anchors.paths];
      newPaths[anchors.activePathIdx] = { ...newPaths[anchors.activePathIdx], anchors: newAnchors };
      anchors.setPaths(newPaths);
      anchors.pushHistory(newPaths);
    },
    [anchors, snap, stageWidth, stageHeight],
  );

  // ===== 舞台右键：删除最后一个锚点 =====
  const handleStageContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (anchors.activePath.isClosed) return;
      if (anchors.activePath.anchors.length === 0) return;

      const newAnchors = anchors.activePath.anchors.slice(0, -1);
      if (newAnchors.length > 0) {
        const lastIdx = newAnchors.length - 1;
        newAnchors[lastIdx] = { ...newAnchors[lastIdx], handleOut: undefined };
      }
      const newPaths = [...anchors.paths];
      newPaths[anchors.activePathIdx] = { ...newPaths[anchors.activePathIdx], anchors: newAnchors, isClosed: false };
      anchors.setPaths(newPaths);
      anchors.setSelectedAnchorIdx(null);
      anchors.pushHistory(newPaths);
    },
    [anchors],
  );

  // ===== 鼠标移动 =====
  const handleStageMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = snap.getStagePos(e, stageRef, stageWidth, stageHeight);
      if (!pos) return;

      snap.setMousePos(pos);
      snap.setIsMouseOnStage(true);

      // 选区裁剪拖拽
      if (anchors.activeShape === 'select' && anchors.selectionStartRef.current && !anchors.draggingIdx && !anchors.draggingHandle && !anchors.draggingEdge) {
        const start = anchors.selectionStartRef.current;
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        if (anchors.isSelecting || Math.sqrt(dx * dx + dy * dy) > 5) {
          if (!anchors.isSelecting) {
            anchors.setIsSelecting(true);
          }
          anchors.setSelectionRect({
            startX: start.x,
            startY: start.y,
            endX: pos.x,
            endY: pos.y,
          });
          return;
        }
      }

      if (!anchors.activePath.isClosed && anchors.activePath.anchors.length > 0) {
        snap.setGuideLines(snap.computeGuides(pos.x, pos.y));
        snap.setDistances(snap.computeDistances(pos.x, pos.y));
      }

      // 拖拽边中点：整条边平移
      if (anchors.draggingEdge !== null) {
        const match = anchors.draggingEdge.match(/^edge-(\d+)$/);
        if (match) {
          const edgeIdx = parseInt(match[1], 10);
          const startPos = anchors.edgeDragStartRef.current;
          if (startPos) {
            const dx = pos.x - startPos.x;
            const dy = pos.y - startPos.y;
            const snapshot = anchors.edgeDragSnapshotRef.current;
            if (snapshot) {
              anchors.setPaths(prev => {
                const newPaths = [...prev];
                const path = { ...newPaths[anchors.activePathIdx] };
                const newAnchorsList = [...path.anchors];

                const fromSnapshot = snapshot.fromAnchor;
                const fromAnchor = { ...newAnchorsList[fromSnapshot.idx] };
                fromAnchor.x = fromSnapshot.x + dx;
                fromAnchor.y = fromSnapshot.y + dy;
                fromAnchor.handleIn = fromSnapshot.handleIn
                  ? { x: fromSnapshot.handleIn.x + dx, y: fromSnapshot.handleIn.y + dy }
                  : undefined;
                fromAnchor.handleOut = fromSnapshot.handleOut
                  ? { x: fromSnapshot.handleOut.x + dx, y: fromSnapshot.handleOut.y + dy }
                  : undefined;
                newAnchorsList[fromSnapshot.idx] = fromAnchor;

                const toSnapshot = snapshot.toAnchor;
                const toAnchor = { ...newAnchorsList[toSnapshot.idx] };
                toAnchor.x = toSnapshot.x + dx;
                toAnchor.y = toSnapshot.y + dy;
                toAnchor.handleIn = toSnapshot.handleIn
                  ? { x: toSnapshot.handleIn.x + dx, y: toSnapshot.handleIn.y + dy }
                  : undefined;
                toAnchor.handleOut = toSnapshot.handleOut
                  ? { x: toSnapshot.handleOut.x + dx, y: toSnapshot.handleOut.y + dy }
                  : undefined;
                newAnchorsList[toSnapshot.idx] = toAnchor;

                path.anchors = newAnchorsList;
                newPaths[anchors.activePathIdx] = path;
                return newPaths;
              });
            }
          }
        }
        return;
      }

      // 拖拽控制柄
      if (anchors.draggingHandle !== null) {
        const match = anchors.draggingHandle.match(/^(in|out)-(\d+)$/);
        if (match) {
          const handleType = match[1] as 'in' | 'out';
          const anchorIdx = parseInt(match[2], 10);
          anchors.setPaths(prev => {
            const newPaths = [...prev];
            const path = { ...newPaths[anchors.activePathIdx] };
            const newAnchorsList = [...path.anchors];
            const anchor = { ...newAnchorsList[anchorIdx] };
            if (handleType === 'out') {
              anchor.handleOut = { x: pos.x, y: pos.y };
            } else {
              anchor.handleIn = { x: pos.x, y: pos.y };
            }
            newAnchorsList[anchorIdx] = anchor;
            path.anchors = newAnchorsList;
            newPaths[anchors.activePathIdx] = path;
            return newPaths;
          });
        }
        return;
      }

      // 拖拽锚点
      if (anchors.draggingIdx !== null) {
        anchors.setPaths(prev => {
          const newPaths = [...prev];
          const path = { ...newPaths[anchors.activePathIdx] };
          const newAnchorsList = [...path.anchors];
          const oldAnchor = newAnchorsList[anchors.draggingIdx!];
          const dx = pos.x - oldAnchor.x;
          const dy = pos.y - oldAnchor.y;
          const newAnchor: AnchorPixel = { ...oldAnchor, x: pos.x, y: pos.y };
          if (newAnchor.handleOut) {
            newAnchor.handleOut = { x: newAnchor.handleOut.x + dx, y: newAnchor.handleOut.y + dy };
          }
          if (newAnchor.handleIn) {
            newAnchor.handleIn = { x: newAnchor.handleIn.x + dx, y: newAnchor.handleIn.y + dy };
          }
          newAnchorsList[anchors.draggingIdx!] = newAnchor;
          path.anchors = newAnchorsList;
          newPaths[anchors.activePathIdx] = path;
          return newPaths;
        });
      }
    },
    [anchors, snap, stageWidth, stageHeight],
  );

  const handleStageMouseLeave = useCallback(() => {
    snap.setIsMouseOnStage(false);
    snap.setMousePos(null);
    snap.setGuideLines([]);
    snap.setDistances([]);
    if (anchors.isSelecting) {
      anchors.setIsSelecting(false);
      anchors.selectionStartRef.current = null;
    }
  }, [anchors, snap]);

  // ===== 舞台鼠标按下 =====
  const handleStageMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (anchors.activeShape === 'select' && !anchors.draggingIdx && !anchors.draggingHandle && !anchors.draggingEdge) {
        const pos = snap.getStagePos(e, stageRef, stageWidth, stageHeight);
        if (pos) {
          anchors.selectionStartRef.current = { x: pos.x, y: pos.y };
        }
      }
    },
    [anchors, snap, stageWidth, stageHeight],
  );

  // ===== 锚点交互 =====
  const handleAnchorMouseDown = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      anchors.setDraggingIdx(idx);
      anchors.setSelectedAnchorIdx(idx);
      anchors.setSelectedEdgeIdx(null);
    },
    [anchors],
  );

  const handleAnchorClick = useCallback(
    (idx: number, e: React.MouseEvent) => {
      if (idx === 0 && !anchors.activePath.isClosed && anchors.activePath.anchors.length >= 3) {
        anchors.handleClosePath(e);
      } else {
        e.stopPropagation();
      }
    },
    [anchors],
  );

  // ===== 控制柄交互 =====
  const handleHandleOutMouseDown = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      anchors.setDraggingHandle(`out-${idx}`);
    },
    [anchors],
  );

  const handleHandleInMouseDown = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      anchors.setDraggingHandle(`in-${idx}`);
    },
    [anchors],
  );

  // ===== 边中点交互 =====
  const handleEdgeMidMouseDown = useCallback(
    (edgeIdx: number, mid: AnchorPixel, e: React.MouseEvent) => {
      e.stopPropagation();
      anchors.edgeDragStartRef.current = mid;
      const from = anchors.activePath.anchors[edgeIdx];
      const toIdx = (edgeIdx + 1) % anchors.activePath.anchors.length;
      const to = anchors.activePath.anchors[toIdx];
      anchors.edgeDragSnapshotRef.current = {
        fromAnchor: {
          idx: edgeIdx,
          x: from.x, y: from.y,
          handleIn: from.handleIn ? { x: from.handleIn.x, y: from.handleIn.y } : null,
          handleOut: from.handleOut ? { x: from.handleOut.x, y: from.handleOut.y } : null,
        },
        toAnchor: {
          idx: toIdx,
          x: to.x, y: to.y,
          handleIn: to.handleIn ? { x: to.handleIn.x, y: to.handleIn.y } : null,
          handleOut: to.handleOut ? { x: to.handleOut.x, y: to.handleOut.y } : null,
        },
      };
      anchors.setDraggingEdge(`edge-${edgeIdx}`);
      anchors.setSelectedEdgeIdx(edgeIdx);
      anchors.setSelectedAnchorIdx(null);
    },
    [anchors],
  );

  const handleEdgeMidClick = useCallback(
    (edgeIdx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      anchors.setSelectedEdgeIdx(edgeIdx);
      anchors.setSelectedAnchorIdx(null);
    },
    [anchors],
  );

  // ===== 全局鼠标松开 =====
  useEffect(() => {
    const handleMouseUp = () => {
      if (anchors.draggingIdx !== null) {
        anchors.pushHistory(anchors.paths);
        anchors.setDraggingIdx(null);
        anchors.justDraggedRef.current = true;
      }
      if (anchors.draggingHandle !== null) {
        const match = anchors.draggingHandle.match(/^(in|out)-(\d+)$/);
        if (match) {
          const handleType = match[1] as 'in' | 'out';
          const anchorIdx = parseInt(match[2], 10);
          const anchor = anchors.paths[anchors.activePathIdx]?.anchors[anchorIdx];
          if (anchor) {
            const handle = handleType === 'out' ? anchor.handleOut : anchor.handleIn;
            if (handle) {
              const dx = handle.x - anchor.x;
              const dy = handle.y - anchor.y;
              if (Math.sqrt(dx * dx + dy * dy) < 3) {
                anchors.setPaths(prev => {
                  const newPaths = [...prev];
                  const path = { ...newPaths[anchors.activePathIdx] };
                  const newAnchors = [...path.anchors];
                  const newAnchor = { ...newAnchors[anchorIdx] };
                  if (handleType === 'out') {
                    newAnchor.handleOut = undefined;
                  } else {
                    newAnchor.handleIn = undefined;
                  }
                  newAnchors[anchorIdx] = newAnchor;
                  path.anchors = newAnchors;
                  newPaths[anchors.activePathIdx] = path;
                  return newPaths;
                });
              }
            }
          }
        }
        anchors.pushHistory(anchors.paths);
        anchors.setDraggingHandle(null);
        anchors.justDraggedRef.current = true;
      }
      if (anchors.draggingEdge !== null) {
        anchors.pushHistory(anchors.paths);
        anchors.setDraggingEdge(null);
        anchors.edgeDragStartRef.current = null;
        anchors.edgeDragSnapshotRef.current = null;
        anchors.justDraggedRef.current = true;
      }
      if (anchors.isSelecting) {
        anchors.setIsSelecting(false);
        anchors.selectionStartRef.current = null;
        if (anchors.selectionRect) {
          const rx1 = Math.min(anchors.selectionRect.startX, anchors.selectionRect.endX);
          const ry1 = Math.min(anchors.selectionRect.startY, anchors.selectionRect.endY);
          const rx2 = Math.max(anchors.selectionRect.startX, anchors.selectionRect.endX);
          const ry2 = Math.max(anchors.selectionRect.startY, anchors.selectionRect.endY);
          if (rx2 - rx1 < 5 || ry2 - ry1 < 5) {
            anchors.setSelectionRect(null);
          } else {
            anchors.justDraggedRef.current = true;
          }
        }
      }
      anchors.selectionStartRef.current = null;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [anchors]);

  // ===== 键盘事件 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        anchors.setSelectedAnchorIdx(null);
        anchors.setSelectedEdgeIdx(null);
        anchors.setSelectionRect(null);
        anchors.setActiveShape('select');
      }
      if ((e.key === 'z' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        anchors.handleUndo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && anchors.selectedAnchorIdx !== null) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        anchors.handleDeleteAnchor(anchors.selectedAnchorIdx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anchors]);

  // ===== 保存并跳转 =====
  const handleSaveAndNavigate = useCallback(() => {
    anchors.handleSave();
    navigate('/');
  }, [anchors, navigate]);

  // ===== 闭合提示判断 =====
  const canClose = !anchors.activePath?.isClosed && anchors.activePath?.anchors.length >= 3 && snap.isMouseOnStage && snap.mousePos && (() => {
    const first = anchors.activePath.anchors[0];
    const dx = snap.mousePos!.x - first.x;
    const dy = snap.mousePos!.y - first.y;
    return Math.sqrt(dx * dx + dy * dy) < DECO_CLOSE_THRESHOLD;
  })();

  return (
    <div className="deco-editor">
      <DecoToolbar
        isEditMode={anchors.isEditMode}
        canUndo={anchors.historyIdxRef.current > 0}
        activeShape={anchors.activeShape}
        selectionRect={anchors.selectionRect}
        onBack={() => navigate('/')}
        onUndo={anchors.handleUndo}
        onReset={anchors.handleReset}
        onSave={handleSaveAndNavigate}
        onShapeSelect={anchors.handleShapeSelect}
        onCrop={anchors.handleCrop}
      />

      <div className="deco-editor-body">
        <DecoStageCanvas
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          paths={anchors.paths}
          activePathIdx={anchors.activePathIdx}
          activePath={anchors.activePath}
          isMouseOnStage={snap.isMouseOnStage}
          mousePos={snap.mousePos}
          guideLines={snap.guideLines}
          distances={snap.distances}
          selectedAnchorIdx={anchors.selectedAnchorIdx}
          selectedEdgeIdx={anchors.selectedEdgeIdx}
          selectionRect={anchors.selectionRect}
          activeShape={anchors.activeShape}
          isSelecting={anchors.isSelecting}
          getEdgeMidpoint={anchors.getEdgeMidpoint}
          getEdgeCount={anchors.getEdgeCount}
          onStageClick={handleStageClick}
          onStageContextMenu={handleStageContextMenu}
          onStageMouseDown={handleStageMouseDown}
          onStageMouseMove={handleStageMouseMove}
          onStageMouseLeave={handleStageMouseLeave}
          onAnchorMouseDown={handleAnchorMouseDown}
          onAnchorClick={handleAnchorClick}
          onHandleOutMouseDown={handleHandleOutMouseDown}
          onHandleInMouseDown={handleHandleInMouseDown}
          onEdgeMidMouseDown={handleEdgeMidMouseDown}
          onEdgeMidClick={handleEdgeMidClick}
          stageRef={stageRef}
        />

        <DecoPathList
          decoName={anchors.decoName}
          setDecoName={anchors.setDecoName}
          stageWidth={stageWidth}
          setStageWidth={setStageWidth}
          stageHeight={stageHeight}
          setStageHeight={setStageHeight}
          paths={anchors.paths}
          activePathIdx={anchors.activePathIdx}
          activePath={anchors.activePath}
          selectedAnchorIdx={anchors.selectedAnchorIdx}
          selectedEdgeIdx={anchors.selectedEdgeIdx}
          setActivePathIdx={anchors.setActivePathIdx}
          setSelectedAnchorIdx={anchors.setSelectedAnchorIdx}
          setSelectedEdgeIdx={anchors.setSelectedEdgeIdx}
          updatePath={anchors.updatePath}
          handleAddPath={anchors.handleAddPath}
          handleDeletePath={anchors.handleDeletePath}
          handleTogglePathVisible={anchors.handleTogglePathVisible}
          handleDeleteAnchor={anchors.handleDeleteAnchor}
          handleClosePath={anchors.handleClosePath}
          getEdgeCount={anchors.getEdgeCount}
        />
      </div>

      {/* ===== 底部状态栏 ===== */}
      <div className="deco-editor-statusbar">
        <div className="status-item">
          路径: {anchors.paths.length}
        </div>
        <div className="status-item">
          当前: 路径 {anchors.activePathIdx + 1} · {anchors.activePath?.anchors.length || 0} 锚点 · {anchors.activePath?.isClosed ? '已闭合' : '绘制中'}
        </div>
        <div className="status-item" style={{ color: anchors.activeShape !== 'select' ? '#f59e0b' : '#a855f7' }}>
          {anchors.activeShape === 'select' ? '选区裁剪' : `形状: ${anchors.activeShape}`}
        </div>
        {anchors.selectionRect && (
          <div className="status-item" style={{ color: '#3b82f6' }}>
            选区: {Math.abs(Math.round(anchors.selectionRect.endX - anchors.selectionRect.startX))}×{Math.abs(Math.round(anchors.selectionRect.endY - anchors.selectionRect.startY))}px
          </div>
        )}
        {snap.isMouseOnStage && snap.mousePos && (
          <div className="status-item">
            鼠标: ({Math.round(snap.mousePos.x)}, {Math.round(snap.mousePos.y)})
          </div>
        )}
        {canClose && (
          <div className="status-item" style={{ color: '#22c55e' }}>
            释放点击闭合路径
          </div>
        )}
        <div className="status-item" style={{ marginLeft: 'auto' }}>
          舞台: {stageWidth}×{stageHeight}px
        </div>
      </div>
    </div>
  );
}

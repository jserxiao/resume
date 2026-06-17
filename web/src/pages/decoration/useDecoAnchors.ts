/**
 * 装饰编辑器 — 锚点/路径状态管理 Hook
 *
 * 管理所有与路径和锚点相关的状态与操作：
 * - 多路径管理（添加/删除/切换/可见性）
 * - 锚点拖拽、控制柄拖拽、边中点拖拽
 * - 历史记录（撤销）
 * - 保存到 store（坐标转换：像素 → 百分比）
 * - 加载已有装饰（坐标转换：百分比 → 像素）
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import { v4 as uuid } from 'uuid';
import { useResumeStore } from '@/store';
import type { CustomDecorationDefinition, DecorationPath } from '@/types';
import { DECO_GRID_SIZE, DECO_SNAP_THRESHOLD, DECO_CLOSE_THRESHOLD, PATH_COLORS } from '@/utils/constants';
import { getDecoPathBounds, generateShapeAnchors, type ShapeType } from '@/utils/geometry';
import type { AnchorPixel, EditablePath, GuideLine, DistanceLabel } from './types';

/** 创建新的空白路径 */
export function createEmptyPath(): EditablePath {
  return {
    id: uuid().slice(0, 8),
    anchors: [],
    isClosed: false,
    fillColor: '#1a56db',
    strokeColor: '#1a56db',
    strokeWidth: 2,
    visible: true,
    edgeColors: [],
  };
}

/** 深拷贝路径列表（用于历史记录） */
function deepClonePaths(paths: EditablePath[]): EditablePath[] {
  return paths.map(p => ({
    ...p,
    anchors: p.anchors.map(a => ({
      ...a,
      handleOut: a.handleOut ? { ...a.handleOut } : a.handleOut,
      handleIn: a.handleIn ? { ...a.handleIn } : a.handleIn,
    })),
  }));
}

export interface UseDecoAnchorsReturn {
  // ===== 状态 =====
  paths: EditablePath[];
  activePathIdx: number;
  activePath: EditablePath;
  selectedAnchorIdx: number | null;
  setSelectedAnchorIdx: (idx: number | null) => void;
  selectedEdgeIdx: number | null;
  setSelectedEdgeIdx: (idx: number | null) => void;
  draggingIdx: number | null;
  draggingHandle: string | null;
  draggingEdge: string | null;
  justDraggedRef: React.MutableRefObject<boolean>;
  decoName: string;
  setDecoName: (name: string) => void;
  isEditMode: boolean;
  editDecoId: string | null;
  activeShape: ShapeType;
  setActiveShape: (shape: ShapeType) => void;
  selectionRect: { startX: number; startY: number; endX: number; endY: number } | null;
  setSelectionRect: (rect: { startX: number; startY: number; endX: number; endY: number } | null) => void;
  isSelecting: boolean;
  setIsSelecting: (val: boolean) => void;
  selectionStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  edgeDragStartRef: React.MutableRefObject<AnchorPixel | null>;
  edgeDragSnapshotRef: React.MutableRefObject<{
    fromAnchor: { idx: number; x: number; y: number; handleIn?: { x: number; y: number } | null; handleOut?: { x: number; y: number } | null };
    toAnchor: { idx: number; x: number; y: number; handleIn?: { x: number; y: number } | null; handleOut?: { x: number; y: number } | null };
  } | null>;

  // ===== 路径操作 =====
  setPaths: React.Dispatch<React.SetStateAction<EditablePath[]>>;
  setActivePathIdx: (idx: number) => void;
  setDraggingIdx: (idx: number | null) => void;
  setDraggingHandle: (handle: string | null) => void;
  setDraggingEdge: (edge: string | null) => void;
  updatePath: (pathIdx: number, updates: Partial<EditablePath>) => void;
  pushHistory: (newPaths: EditablePath[]) => void;
  handleUndo: () => void;
  handleReset: () => void;
  handleSave: () => void;
  handleAddPath: () => void;
  handleDeletePath: (pathIdx: number) => void;
  handleTogglePathVisible: (pathIdx: number) => void;
  handleDeleteAnchor: (anchorIdx: number) => void;
  handleClosePath: (e: React.MouseEvent) => void;
  handleShapeSelect: (shape: ShapeType) => void;
  handleCrop: () => void;

  // ===== 辅助计算 =====
  getEdgeMidpoint: (edgeIdx: number) => AnchorPixel | null;
  getEdgeCount: (path: EditablePath) => number;
  historyIdxRef: React.MutableRefObject<number>;
}

export function useDecoAnchors(
  stageWidth: number,
  stageHeight: number,
  editId: string | null,
  setStageWidth?: (w: number) => void,
  setStageHeight?: (h: number) => void,
): UseDecoAnchorsReturn {
  const { saveCustomDecoration, customDecorations } = useResumeStore();

  // ===== 多路径 =====
  const [paths, setPaths] = useState<EditablePath[]>([createEmptyPath()]);
  const [activePathIdx, setActivePathIdx] = useState(0);
  const [selectedAnchorIdx, setSelectedAnchorIdx] = useState<number | null>(null);
  const [selectedEdgeIdx, setSelectedEdgeIdx] = useState<number | null>(null);

  // ===== 拖拽状态 =====
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
  const [draggingEdge, setDraggingEdge] = useState<string | null>(null);
  const edgeDragStartRef = useRef<AnchorPixel | null>(null);
  const edgeDragSnapshotRef = useRef<{
    fromAnchor: { idx: number; x: number; y: number; handleIn?: { x: number; y: number } | null; handleOut?: { x: number; y: number } | null };
    toAnchor: { idx: number; x: number; y: number; handleIn?: { x: number; y: number } | null; handleOut?: { x: number; y: number } | null };
  } | null>(null);
  const justDraggedRef = useRef(false);

  // ===== 形状工具 =====
  const [activeShape, setActiveShape] = useState<ShapeType>('select');
  const [selectionRect, setSelectionRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  // ===== 名称 =====
  const [decoName, setDecoName] = useState('自定义装饰');

  // ===== 编辑模式 =====
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDecoId, setEditDecoId] = useState<string | null>(null);

  // ===== 历史 =====
  const [history, setHistory] = useState<EditablePath[][]>([[createEmptyPath()]]);
  const historyIdxRef = useRef(0);

  // 当前活跃路径
  const activePath = paths[activePathIdx] || paths[0];

  // 推入历史
  const pushHistory = useCallback((newPaths: EditablePath[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIdxRef.current + 1);
      newHistory.push(deepClonePaths(newPaths));
      historyIdxRef.current = newHistory.length - 1;
      return newHistory;
    });
  }, []);

  // ===== 加载已有装饰数据（编辑模式） =====
  useEffect(() => {
    if (editId) {
      const existing = customDecorations.find(d => d.id === editId);
      if (existing) {
        setIsEditMode(true);
        setEditDecoId(existing.id);
        setDecoName(existing.name);

        const sw = existing.stageWidth || 400;
        const sh = existing.stageHeight || 400;

        // 同步画布大小到页面 state
        setStageWidth?.(sw);
        setStageHeight?.(sh);

        const editPaths: EditablePath[] = existing.paths.map(p => ({
          id: p.id || uuid().slice(0, 8),
          anchors: p.anchors.map(a => ({
            x: (a.x / 100) * sw,
            y: (a.y / 100) * sh,
            handleOut: a.handleOut ? { x: (a.handleOut.x / 100) * sw, y: (a.handleOut.y / 100) * sh } : undefined,
            handleIn: a.handleIn ? { x: (a.handleIn.x / 100) * sw, y: (a.handleIn.y / 100) * sh } : undefined,
          })),
          isClosed: p.isClosed,
          fillColor: p.fillColor,
          strokeColor: p.strokeColor,
          // strokeWidth 已保存为 viewBox 比例值，还原为像素值
          strokeWidth: (p.strokeWidth / 100) * sw,
          visible: true,
          clipRect: p.clipRect ? {
            x: (p.clipRect.x / 100) * sw,
            y: (p.clipRect.y / 100) * sh,
            width: (p.clipRect.width / 100) * sw,
            height: (p.clipRect.height / 100) * sh,
          } : undefined,
          edgeColors: p.edgeColors ? [...p.edgeColors] : undefined,
        }));

        if (editPaths.length === 0) editPaths.push(createEmptyPath());
        setPaths(editPaths);
        setActivePathIdx(0);
        pushHistory(editPaths);
      }
    }
  }, [editId, customDecorations, pushHistory, setStageWidth, setStageHeight]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1;
      const prevPaths = history[historyIdxRef.current];
      if (prevPaths) {
        setPaths(deepClonePaths(prevPaths));
      }
    }
  }, [history]);

  // ===== 更新路径的辅助函数 =====
  const updatePath = useCallback((pathIdx: number, updates: Partial<EditablePath>) => {
    setPaths(prev => {
      const newPaths = [...prev];
      newPaths[pathIdx] = { ...newPaths[pathIdx], ...updates };
      return newPaths;
    });
  }, []);

  // ===== 计算边中点位置 =====
  const getEdgeMidpoint = useCallback((edgeIdx: number): AnchorPixel | null => {
    if (!activePath || activePath.anchors.length < 2) return null;
    const anchors = activePath.anchors;
    const n = anchors.length;
    const edgeCount = activePath.isClosed ? n : n - 1;
    if (edgeIdx < 0 || edgeIdx >= edgeCount) return null;

    const fromAnchor = anchors[edgeIdx];
    const toAnchor = anchors[(edgeIdx + 1) % n];

    const control = fromAnchor.handleOut || toAnchor.handleIn;
    if (control) {
      const t = 0.5;
      const x = (1 - t) * (1 - t) * fromAnchor.x + 2 * (1 - t) * t * control.x + t * t * toAnchor.x;
      const y = (1 - t) * (1 - t) * fromAnchor.y + 2 * (1 - t) * t * control.y + t * t * toAnchor.y;
      return { x, y };
    }
    return { x: (fromAnchor.x + toAnchor.x) / 2, y: (fromAnchor.y + toAnchor.y) / 2 };
  }, [activePath]);

  // ===== 获取边数量 =====
  const getEdgeCount = useCallback((path: EditablePath): number => {
    if (path.anchors.length < 2) return 0;
    return path.isClosed ? path.anchors.length : path.anchors.length - 1;
  }, []);

  // ===== 切换形状工具 =====
  const handleShapeSelect = useCallback((shape: ShapeType) => {
    setActiveShape(shape);
    setSelectedAnchorIdx(null);
    setSelectedEdgeIdx(null);
  }, []);

  // ===== 裁剪：保留选区范围内的图形 =====
  const handleCrop = useCallback(() => {
    if (!selectionRect) {
      message.warning('请先拖拽拉出选区');
      return;
    }
    const rx = Math.min(selectionRect.startX, selectionRect.endX);
    const ry = Math.min(selectionRect.startY, selectionRect.endY);
    const rw = Math.abs(selectionRect.endX - selectionRect.startX);
    const rh = Math.abs(selectionRect.endY - selectionRect.startY);

    const newPaths = paths.map(p => {
      if (!p.visible || p.anchors.length === 0) return p;

      const bounds = getDecoPathBounds(p.anchors, p.isClosed);
      if (!bounds) return { ...p, anchors: [], isClosed: false };

      if (bounds.maxX < rx || bounds.minX > rx + rw || bounds.maxY < ry || bounds.minY > ry + rh) {
        return { ...p, anchors: [], isClosed: false, clipRect: undefined };
      }

      return {
        ...p,
        clipRect: { x: rx, y: ry, width: rw, height: rh },
      };
    });

    setPaths(newPaths);
    setSelectionRect(null);
    pushHistory(newPaths);
    message.success('裁剪完成');
  }, [selectionRect, paths, pushHistory]);

  // ===== 点击首个锚点闭合路径 =====
  const handleClosePath = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (activePath.isClosed) return;
      if (activePath.anchors.length < 3) return;

      const newAnchors = [...activePath.anchors];
      const last = newAnchors[newAnchors.length - 1];
      const first = newAnchors[0];

      if (!last.handleOut) {
        const dx = first.x - last.x;
        const dy = first.y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const handleLen = dist * 0.3;
        if (dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          newAnchors[newAnchors.length - 1] = {
            ...last,
            handleOut: { x: last.x + nx * handleLen, y: last.y + ny * handleLen },
          };
        }
      }

      const updatedFirst = newAnchors[0];
      if (!updatedFirst.handleIn) {
        const dx = first.x - last.x;
        const dy = first.y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const handleLen = dist * 0.3;
        if (dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          newAnchors[0] = {
            ...updatedFirst,
            handleIn: { x: first.x - nx * handleLen, y: first.y - ny * handleLen },
          };
        }
      }

      const newPaths = [...paths];
      newPaths[activePathIdx] = { ...newPaths[activePathIdx], anchors: newAnchors, isClosed: true };
      setPaths(newPaths);
      pushHistory(newPaths);
    },
    [activePath, activePathIdx, pushHistory, paths],
  );

  // ===== 删除锚点 =====
  const handleDeleteAnchor = useCallback(
    (anchorIdx: number) => {
      const newAnchors = activePath.anchors.filter((_, i) => i !== anchorIdx);
      const newPaths = [...paths];
      newPaths[activePathIdx] = { ...newPaths[activePathIdx], anchors: newAnchors, isClosed: false };
      setPaths(newPaths);
      setSelectedAnchorIdx(null);
      pushHistory(newPaths);
    },
    [activePath, activePathIdx, paths, pushHistory],
  );

  // ===== 添加新路径 =====
  const handleAddPath = useCallback(() => {
    const newPath = createEmptyPath();
    const newPaths = [...paths, newPath];
    setPaths(newPaths);
    setActivePathIdx(newPaths.length - 1);
    setSelectedAnchorIdx(null);
    pushHistory(newPaths);
  }, [paths, pushHistory]);

  // ===== 删除路径 =====
  const handleDeletePath = useCallback(
    (pathIdx: number) => {
      if (paths.length <= 1) {
        message.warning('至少保留一条路径');
        return;
      }
      const newPaths = paths.filter((_, i) => i !== pathIdx);
      setPaths(newPaths);
      if (activePathIdx >= newPaths.length) {
        setActivePathIdx(newPaths.length - 1);
      } else if (activePathIdx === pathIdx) {
        setActivePathIdx(Math.min(pathIdx, newPaths.length - 1));
      }
      setSelectedAnchorIdx(null);
      pushHistory(newPaths);
    },
    [paths, activePathIdx, pushHistory],
  );

  // ===== 切换路径可见性 =====
  const handleTogglePathVisible = useCallback(
    (pathIdx: number) => {
      updatePath(pathIdx, { visible: !paths[pathIdx].visible });
    },
    [paths, updatePath],
  );

  // ===== 重置 =====
  const handleReset = useCallback(() => {
    const empty = [createEmptyPath()];
    setPaths(empty);
    setActivePathIdx(0);
    setSelectedAnchorIdx(null);
    setHistory([empty.map(p => ({ ...p, anchors: [] }))]);
    historyIdxRef.current = 0;
  }, []);

  // ===== 保存到 store =====
  const handleSave = useCallback(() => {
    const nonEmptyPaths = paths.filter(p => p.anchors.length >= 2);
    if (nonEmptyPaths.length === 0) {
      message.warning('至少需要一条包含 2 个锚点的路径');
      return;
    }

    // 自动裁剪：基于贝塞尔曲线实际采样点计算边界框
    const pathBounds = nonEmptyPaths.map(p => getDecoPathBounds(p.anchors, p.isClosed)).filter(Boolean) as { minX: number; minY: number; maxX: number; maxY: number }[];
    if (pathBounds.length === 0) return;

    const minAx = Math.min(...pathBounds.map(b => b.minX));
    const minAy = Math.min(...pathBounds.map(b => b.minY));
    const maxAx = Math.max(...pathBounds.map(b => b.maxX));
    const maxAy = Math.max(...pathBounds.map(b => b.maxY));

    const maxHalfStroke = Math.max(...nonEmptyPaths.map(p => p.strokeWidth / 2));
    const minX = Math.max(0, minAx - maxHalfStroke);
    const minY = Math.max(0, minAy - maxHalfStroke);
    const maxX = Math.min(stageWidth, maxAx + maxHalfStroke);
    const maxY = Math.min(stageHeight, maxAy + maxHalfStroke);

    const cropW = Math.max(1, maxX - minX);
    const cropH = Math.max(1, maxY - minY);

    const savedPaths: DecorationPath[] = nonEmptyPaths.map(p => ({
      id: p.id,
      anchors: p.anchors.map(a => ({
        x: ((a.x - minX) / cropW) * 100,
        y: ((a.y - minY) / cropH) * 100,
        handleOut: a.handleOut ? { x: ((a.handleOut.x - minX) / cropW) * 100, y: ((a.handleOut.y - minY) / cropH) * 100 } : undefined,
        handleIn: a.handleIn ? { x: ((a.handleIn.x - minX) / cropW) * 100, y: ((a.handleIn.y - minY) / cropH) * 100 } : undefined,
      })),
      isClosed: p.isClosed,
      fillColor: p.fillColor,
      strokeColor: p.strokeColor,
      strokeWidth: (p.strokeWidth / cropW) * 100,
      clipRect: p.clipRect ? {
        x: ((p.clipRect.x - minX) / cropW) * 100,
        y: ((p.clipRect.y - minY) / cropH) * 100,
        width: (p.clipRect.width / cropW) * 100,
        height: (p.clipRect.height / cropH) * 100,
      } : undefined,
      edgeColors: p.edgeColors,
    }));

    const decoration: CustomDecorationDefinition = {
      id: isEditMode && editDecoId ? editDecoId : `cde-${uuid().slice(0, 8)}`,
      name: decoName || '自定义装饰',
      paths: savedPaths,
      stageWidth: cropW,
      stageHeight: cropH,
      createdAt: isEditMode && editDecoId ? (customDecorations.find(d => d.id === editDecoId)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now(),
    };

    saveCustomDecoration(decoration);
    message.success(isEditMode ? '装饰已更新' : '自定义装饰已保存');
  }, [paths, decoName, stageWidth, stageHeight, isEditMode, editDecoId, saveCustomDecoration, customDecorations]);

  return {
    paths, setPaths,
    activePathIdx, setActivePathIdx,
    activePath,
    selectedAnchorIdx, setSelectedAnchorIdx,
    selectedEdgeIdx, setSelectedEdgeIdx,
    draggingIdx, setDraggingIdx,
    draggingHandle, setDraggingHandle,
    draggingEdge, setDraggingEdge,
    edgeDragStartRef, edgeDragSnapshotRef,
    justDraggedRef,
    decoName, setDecoName,
    isEditMode, editDecoId,
    activeShape, setActiveShape,
    selectionRect, setSelectionRect,
    isSelecting, setIsSelecting,
    selectionStartRef,
    updatePath,
    pushHistory,
    handleUndo,
    handleReset,
    handleSave,
    handleAddPath,
    handleDeletePath,
    handleTogglePathVisible,
    handleDeleteAnchor,
    handleClosePath,
    handleShapeSelect,
    handleCrop,
    getEdgeMidpoint,
    getEdgeCount,
    historyIdxRef,
  };
}

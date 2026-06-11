import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, InputNumber, Tooltip, message, Popconfirm } from 'antd';
import {
  ArrowLeftOutlined,
  UndoOutlined,
  CloseOutlined,
  SaveOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { v4 as uuid } from 'uuid';
import { useResumeStore } from '@/store';
import type { CustomDecorationDefinition, DecorationPath } from '@/types';
import { DECO_GRID_SIZE, DECO_SNAP_THRESHOLD, DECO_CLOSE_THRESHOLD, PATH_COLORS } from '@/utils/constants';
import { getDecoPathBounds, generateShapeAnchors, type ShapeType } from '@/utils/geometry';
import ColorFieldInput from '@/components/shared/ColorFieldInput';
import './DecorationEditorPage.less';

/** 锚点坐标（像素），可选包含控制柄 */
interface AnchorPixel {
  x: number;
  y: number;
  /** 出控制柄：控制当前锚点到下一个锚点之间的曲线弯曲 */
  handleOut?: { x: number; y: number } | null;
  /** 入控制柄：控制上一个锚点到当前锚点之间的曲线弯曲 */
  handleIn?: { x: number; y: number } | null;
}

/** 编辑态路径 */
interface EditablePath {
  id: string;
  anchors: AnchorPixel[];
  isClosed: boolean;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  visible: boolean;
  /** 裁剪矩形（像素），仅显示该矩形范围内的图形 */
  clipRect?: { x: number; y: number; width: number; height: number } | null;
}

/** 辅助线 */
interface GuideLine {
  type: 'horizontal' | 'vertical';
  position: number;
}

/** 距离标注 */
interface DistanceLabel {
  id: string;
  x: number;
  y: number;
  text: string;
}


/** 创建新的空白路径 */
function createEmptyPath(): EditablePath {
  return {
    id: uuid().slice(0, 8),
    anchors: [],
    isClosed: false,
    fillColor: '#1a56db',
    strokeColor: '#1a56db',
    strokeWidth: 2,
    visible: true,
  };
}

export default function DecorationEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const { saveCustomDecoration, customDecorations } = useResumeStore();

  // ===== 舞台尺寸 =====
  const [stageWidth, setStageWidth] = useState(400);
  const [stageHeight, setStageHeight] = useState(400);

  // ===== 多路径 =====
  const [paths, setPaths] = useState<EditablePath[]>([createEmptyPath()]);
  const [activePathIdx, setActivePathIdx] = useState(0);
  const [selectedAnchorIdx, setSelectedAnchorIdx] = useState<number | null>(null);

  // ===== 鼠标追踪 =====
  const [mousePos, setMousePos] = useState<AnchorPixel | null>(null);
  const [isMouseOnStage, setIsMouseOnStage] = useState(false);

  // ===== 辅助线 =====
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [distances, setDistances] = useState<DistanceLabel[]>([]);

  // ===== 名称 =====
  const [decoName, setDecoName] = useState('自定义装饰');

  // ===== 拖拽状态 =====
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  /** 拖拽控制柄: 'out-i' 表示第i个锚点的handleOut, 'in-i' 表示handleIn */
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  /** 标记刚结束拖拽（锚点或控制柄），用于阻止紧随的 click 创建新锚点 */
  const justDraggedRef = useRef(false);

  // ===== 形状工具 =====
  const [activeShape, setActiveShape] = useState<ShapeType>('select');
  // 选区裁剪
  const [selectionRect, setSelectionRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  // ===== 曲线模式 =====
  // 曲线模式已移除，始终使用曲线模式（无 handleOut 的锚点之间自动用直线 L 连接）

  // ===== 历史（撤销） =====
  const [history, setHistory] = useState<EditablePath[][]>([[createEmptyPath()]]);
  const historyIdxRef = useRef(0);

  // ===== 编辑模式标记 =====
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDecoId, setEditDecoId] = useState<string | null>(null);

  // 当前活跃路径
  const activePath = paths[activePathIdx] || paths[0];

  // 推入历史
  const pushHistory = useCallback((newPaths: EditablePath[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIdxRef.current + 1);
      newHistory.push(newPaths.map(p => ({
        ...p,
        anchors: p.anchors.map(a => ({
          ...a,
          handleOut: a.handleOut ? { ...a.handleOut } : a.handleOut,
          handleIn: a.handleIn ? { ...a.handleIn } : a.handleIn,
        })),
      })));
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

        const sw = 400;
        const sh = 400;
        setStageWidth(sw);
        setStageHeight(sh);

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
          // 裁剪矩形还原为像素值
          clipRect: p.clipRect ? {
            x: (p.clipRect.x / 100) * sw,
            y: (p.clipRect.y / 100) * sh,
            width: (p.clipRect.width / 100) * sw,
            height: (p.clipRect.height / 100) * sh,
          } : undefined,
        }));

        if (editPaths.length === 0) editPaths.push(createEmptyPath());
        setPaths(editPaths);
        setActivePathIdx(0);
        pushHistory(editPaths);
      }
    }
  }, [editId, customDecorations, pushHistory]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1;
      const prevPaths = history[historyIdxRef.current];
      if (prevPaths) {
        setPaths(prevPaths.map(p => ({
          ...p,
          anchors: p.anchors.map(a => ({
            ...a,
            handleOut: a.handleOut ? { ...a.handleOut } : a.handleOut,
            handleIn: a.handleIn ? { ...a.handleIn } : a.handleIn,
          })),
        })));
      }
    }
  }, [history]);

  // ===== 吸附到网格 =====
  const snapToGrid = useCallback((val: number): number => {
    return Math.round(val / DECO_GRID_SIZE) * DECO_GRID_SIZE;
  }, []);

  // ===== 辅助线计算 =====
  const computeGuides = useCallback(
    (x: number, y: number): GuideLine[] => {
      const guides: GuideLine[] = [];
      // 对齐到当前路径的其他锚点
      for (const a of activePath.anchors) {
      if (Math.abs(a.x - x) < DECO_SNAP_THRESHOLD) {
        guides.push({ type: 'vertical', position: a.x });
      }
      if (Math.abs(a.y - y) < DECO_SNAP_THRESHOLD) {
        guides.push({ type: 'horizontal', position: a.y });
      }
      }
      const cx = stageWidth / 2;
      const cy = stageHeight / 2;
      if (Math.abs(cx - x) < DECO_SNAP_THRESHOLD) guides.push({ type: 'vertical', position: cx });
      if (Math.abs(cy - y) < DECO_SNAP_THRESHOLD) guides.push({ type: 'horizontal', position: cy });
      if (Math.abs(x) < DECO_SNAP_THRESHOLD) guides.push({ type: 'vertical', position: 0 });
      if (Math.abs(x - stageWidth) < DECO_SNAP_THRESHOLD) guides.push({ type: 'vertical', position: stageWidth });
      if (Math.abs(y) < DECO_SNAP_THRESHOLD) guides.push({ type: 'horizontal', position: 0 });
      if (Math.abs(y - stageHeight) < DECO_SNAP_THRESHOLD) guides.push({ type: 'horizontal', position: stageHeight });

      const seen = new Set<string>();
      return guides.filter((g) => {
        const key = `${g.type}-${Math.round(g.position)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    [activePath.anchors, stageWidth, stageHeight],
  );

  // ===== 距离标注计算 =====
  const computeDistances = useCallback(
    (x: number, y: number): DistanceLabel[] => {
      const labels: DistanceLabel[] = [];
      labels.push({ id: 'left', x: 2, y: y - 14, text: `${Math.round(x)}px` });
      labels.push({ id: 'top', x: x + 4, y: 2, text: `${Math.round(y)}px` });

      if (activePath.anchors.length > 0) {
        const last = activePath.anchors[activePath.anchors.length - 1];
        const dx = Math.abs(x - last.x);
        const dy = Math.abs(y - last.y);
        const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
        const mx = (x + last.x) / 2;
        const my = (y + last.y) / 2;
        labels.push({ id: 'dist', x: mx, y: my - 12, text: `${dist}px` });
      }
      return labels;
    },
    [activePath.anchors],
  );

  // ===== 获取舞台相对坐标 =====
  const getStagePos = useCallback(
    (e: React.MouseEvent | MouseEvent): AnchorPixel | null => {
      if (!stageRef.current) return null;
      const rect = stageRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      const guides = computeGuides(x, y);
      for (const g of guides) {
        if (g.type === 'vertical' && Math.abs(g.position - x) < DECO_SNAP_THRESHOLD) x = g.position;
        if (g.type === 'horizontal' && Math.abs(g.position - y) < DECO_SNAP_THRESHOLD) y = g.position;
      }

      if (guides.length === 0) {
        x = snapToGrid(x);
        y = snapToGrid(y);
      }

      return { x: Math.max(0, Math.min(stageWidth, x)), y: Math.max(0, Math.min(stageHeight, y)) };
    },
    [computeGuides, snapToGrid, stageWidth, stageHeight],
  );

  // ===== 更新路径的辅助函数 =====
  const updatePath = useCallback((pathIdx: number, updates: Partial<EditablePath>) => {
    setPaths(prev => {
      const newPaths = [...prev];
      newPaths[pathIdx] = { ...newPaths[pathIdx], ...updates };
      return newPaths;
    });
  }, []);

  // ===== 切换形状工具 =====
  const handleShapeSelect = useCallback((shape: ShapeType) => {
    setActiveShape(shape);
    setSelectedAnchorIdx(null);
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

      // 用路径的包围盒做粗略判断是否与选区有交集
      const bounds = getDecoPathBounds(p.anchors, p.isClosed);
      if (!bounds) return { ...p, anchors: [], isClosed: false };

      // 没有交集 → 清空
      if (bounds.maxX < rx || bounds.minX > rx + rw || bounds.maxY < ry || bounds.minY > ry + rh) {
        return { ...p, anchors: [], isClosed: false, clipRect: undefined };
      }

      // 有交集 → 设置裁剪矩形，保留原始锚点不变
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

      // 闭合时，为最后一个锚点→首锚点的线段自动生成控制柄
      const newAnchors = [...activePath.anchors];
      const last = newAnchors[newAnchors.length - 1];
      const first = newAnchors[0];

      // 如果最后一个锚点没有 handleOut，自动生成
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

      // 如果首锚点没有 handleIn，自动生成
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

  // ===== 舞台点击：添加锚点 / 放置形状 / 选区裁剪确认 =====
  const handleStageClick = useCallback(
    (e: React.MouseEvent) => {
      // 如果刚刚结束拖拽（锚点或控制柄），不创建新锚点
      if (justDraggedRef.current) {
        justDraggedRef.current = false;
        return;
      }

      const pos = getStagePos(e);
      if (!pos) return;

      // ===== 选区裁剪模式：已有选区时，点击清除选区 =====
      if (activeShape === 'select' && selectionRect) {
        setSelectionRect(null);
        return;
      }

      // ===== 形状工具：点击放置形状 =====
      if (activeShape !== 'select') {
        const baseSize = Math.min(stageWidth, stageHeight) * 0.4;
        let shapeW = baseSize;
        let shapeH = baseSize;
        // 椭圆比圆形更扁，宽高比约 3:2
        if (activeShape === 'ellipse') {
          shapeW = baseSize * 1.4;
          shapeH = baseSize * 0.8;
        }
        const sx = pos.x - shapeW / 2;
        const sy = pos.y - shapeH / 2;
        const anchors = generateShapeAnchors(activeShape, sx, sy, shapeW, shapeH);
        if (anchors.length === 0) return;

        const newAnchors: AnchorPixel[] = anchors.map(a => ({
          x: a.x,
          y: a.y,
          handleOut: a.handleOut ? { x: a.handleOut.x, y: a.handleOut.y } : undefined,
          handleIn: a.handleIn ? { x: a.handleIn.x, y: a.handleIn.y } : undefined,
        }));

        const newPaths = [...paths];
        newPaths[activePathIdx] = { ...newPaths[activePathIdx], anchors: newAnchors, isClosed: true };
        setPaths(newPaths);
        pushHistory(newPaths);
        // 放置后切回选择模式
        setActiveShape('select');
        return;
      }

      if (activePath.isClosed) return;
      if (draggingIdx !== null) return;
      if (draggingHandle !== null) return;

      // 检查是否靠近第一个锚点（闭合路径）
      if (activePath.anchors.length >= 3) {
        const first = activePath.anchors[0];
        const dx = pos.x - first.x;
        const dy = pos.y - first.y;
        if (Math.sqrt(dx * dx + dy * dy) < DECO_CLOSE_THRESHOLD) {
          // 闭合时自动为最后一个锚点和首锚点生成控制柄
          const newAnchors = [...activePath.anchors];
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

          const newPaths = [...paths];
          newPaths[activePathIdx] = { ...newPaths[activePathIdx], anchors: newAnchors, isClosed: true };
          setPaths(newPaths);
          pushHistory(newPaths);
          return;
        }
      }

      const newAnchor: AnchorPixel = { x: pos.x, y: pos.y };

      // 始终自动为新锚点和上一个锚点生成控制柄
      if (activePath.anchors.length > 0) {
        const last = activePath.anchors[activePath.anchors.length - 1];
        // 为上一个锚点生成 handleOut（方向指向新锚点）
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const handleLen = dist * 0.3;
        if (dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          // 更新上一个锚点的 handleOut（仅在上一个锚点还没有 handleOut 时才自动生成）
          const prevAnchors = [...activePath.anchors];
          const prevLast = prevAnchors[prevAnchors.length - 1];
          if (!prevLast.handleOut) {
            prevAnchors[prevAnchors.length - 1] = {
              ...prevLast,
              handleOut: { x: last.x + nx * handleLen, y: last.y + ny * handleLen },
            };
          }
          // 为新锚点生成 handleIn
          newAnchor.handleIn = { x: pos.x - nx * handleLen, y: pos.y - ny * handleLen };
          const newAnchors = [...prevAnchors, newAnchor];
          const newPaths = [...paths];
          newPaths[activePathIdx] = { ...newPaths[activePathIdx], anchors: newAnchors };
          setPaths(newPaths);
          pushHistory(newPaths);
          return;
        }
      }

      const newAnchors = [...activePath.anchors, newAnchor];
      const newPaths = [...paths];
      newPaths[activePathIdx] = { ...newPaths[activePathIdx], anchors: newAnchors };
      setPaths(newPaths);
      pushHistory(newPaths);
    },
    [activePath, activePathIdx, paths, draggingIdx, draggingHandle, getStagePos, pushHistory, updatePath, activeShape, selectionRect],
  );

  // ===== 舞台右键：删除最后一个锚点 =====
  const handleStageContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (activePath.isClosed) return;
      if (activePath.anchors.length === 0) return;

      // 删除最后一个锚点
      const newAnchors = activePath.anchors.slice(0, -1);
      // 如果删除了锚点，还需要清理倒数第二个锚点的 handleOut（因为它的出方向曲线不再有意义）
      if (newAnchors.length > 0) {
        const lastIdx = newAnchors.length - 1;
        newAnchors[lastIdx] = { ...newAnchors[lastIdx], handleOut: undefined };
      }
      const newPaths = [...paths];
      newPaths[activePathIdx] = { ...newPaths[activePathIdx], anchors: newAnchors, isClosed: false };
      setPaths(newPaths);
      setSelectedAnchorIdx(null);
      pushHistory(newPaths);
    },
    [activePath, activePathIdx, paths, pushHistory],
  );

  // ===== 鼠标移动 =====
  const handleStageMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getStagePos(e);
      if (!pos) return;

      setMousePos(pos);
      setIsMouseOnStage(true);

      // ===== 选区裁剪拖拽 =====
      if (activeShape === 'select' && selectionStartRef.current && !draggingIdx && !draggingHandle) {
        const start = selectionStartRef.current;
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        // 鼠标移动超过 5px 时启动选区
        if (isSelecting || Math.sqrt(dx * dx + dy * dy) > 5) {
          if (!isSelecting) {
            setIsSelecting(true);
          }
          setSelectionRect({
            startX: start.x,
            startY: start.y,
            endX: pos.x,
            endY: pos.y,
          });
          return;
        }
      }

      if (!activePath.isClosed && activePath.anchors.length > 0) {
        setGuideLines(computeGuides(pos.x, pos.y));
        setDistances(computeDistances(pos.x, pos.y));
      }

      // 拖拽控制柄
      if (draggingHandle !== null) {
        const match = draggingHandle.match(/^(in|out)-(\d+)$/);
        if (match) {
          const handleType = match[1] as 'in' | 'out';
          const anchorIdx = parseInt(match[2], 10);
          setPaths(prev => {
            const newPaths = [...prev];
            const path = { ...newPaths[activePathIdx] };
            const newAnchors = [...path.anchors];
            const anchor = { ...newAnchors[anchorIdx] };
            if (handleType === 'out') {
              anchor.handleOut = { x: pos.x, y: pos.y };
            } else {
              anchor.handleIn = { x: pos.x, y: pos.y };
            }
            newAnchors[anchorIdx] = anchor;
            path.anchors = newAnchors;
            newPaths[activePathIdx] = path;
            return newPaths;
          });
        }
        return;
      }

      if (draggingIdx !== null) {
        setPaths(prev => {
          const newPaths = [...prev];
          const path = { ...newPaths[activePathIdx] };
          const newAnchors = [...path.anchors];
          const oldAnchor = newAnchors[draggingIdx];
          const dx = pos.x - oldAnchor.x;
          const dy = pos.y - oldAnchor.y;
          const newAnchor: AnchorPixel = { ...oldAnchor, x: pos.x, y: pos.y };
          // 同步移动控制柄
          if (newAnchor.handleOut) {
            newAnchor.handleOut = { x: newAnchor.handleOut.x + dx, y: newAnchor.handleOut.y + dy };
          }
          if (newAnchor.handleIn) {
            newAnchor.handleIn = { x: newAnchor.handleIn.x + dx, y: newAnchor.handleIn.y + dy };
          }
          newAnchors[draggingIdx] = newAnchor;
          path.anchors = newAnchors;
          newPaths[activePathIdx] = path;
          return newPaths;
        });
      }
    },
    [getStagePos, activePath, activePathIdx, computeGuides, computeDistances, draggingIdx, draggingHandle, isSelecting, activeShape],
  );

  const handleStageMouseLeave = useCallback(() => {
    setIsMouseOnStage(false);
    setMousePos(null);
    setGuideLines([]);
    setDistances([]);
    // 取消选区
    if (isSelecting) {
      setIsSelecting(false);
      selectionStartRef.current = null;
    }
  }, [isSelecting]);

  // ===== 舞台鼠标按下：记录起点（供选区裁剪用） =====
  const handleStageMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // 仅在选择模式下且不在拖拽锚点/控制柄时
      if (activeShape === 'select' && !draggingIdx && !draggingHandle) {
        const pos = getStagePos(e);
        if (pos) {
          // 只记录起点，不立即启动选区（等待 mousemove 判断是否为拖拽）
          selectionStartRef.current = { x: pos.x, y: pos.y };
        }
      }
    },
    [activeShape, draggingIdx, draggingHandle, getStagePos],
  );

  // ===== 锚点拖拽 =====
  const handleAnchorMouseDown = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setDraggingIdx(idx);
      setSelectedAnchorIdx(idx);
    },
    [],
  );

  // ===== 全局鼠标松开 =====
  useEffect(() => {
    const handleMouseUp = () => {
      if (draggingIdx !== null) {
        pushHistory(paths);
        setDraggingIdx(null);
        justDraggedRef.current = true;
      }
      if (draggingHandle !== null) {
        // 如果控制柄被拖到锚点附近（距离 < 3px），自动移除控制柄（变为直线连接）
        const match = draggingHandle.match(/^(in|out)-(\d+)$/);
        if (match) {
          const handleType = match[1] as 'in' | 'out';
          const anchorIdx = parseInt(match[2], 10);
          const anchor = paths[activePathIdx]?.anchors[anchorIdx];
          if (anchor) {
            const handle = handleType === 'out' ? anchor.handleOut : anchor.handleIn;
            if (handle) {
              const dx = handle.x - anchor.x;
              const dy = handle.y - anchor.y;
              if (Math.sqrt(dx * dx + dy * dy) < 3) {
                // 移除控制柄
                setPaths(prev => {
                  const newPaths = [...prev];
                  const path = { ...newPaths[activePathIdx] };
                  const newAnchors = [...path.anchors];
                  const newAnchor = { ...newAnchors[anchorIdx] };
                  if (handleType === 'out') {
                    newAnchor.handleOut = undefined;
                  } else {
                    newAnchor.handleIn = undefined;
                  }
                  newAnchors[anchorIdx] = newAnchor;
                  path.anchors = newAnchors;
                  newPaths[activePathIdx] = path;
                  return newPaths;
                });
              }
            }
          }
        }
        pushHistory(paths);
        setDraggingHandle(null);
        justDraggedRef.current = true;
      }
      // ===== 选区裁剪完成 =====
      if (isSelecting) {
        setIsSelecting(false);
        selectionStartRef.current = null;
        // 选区太小则取消
        if (selectionRect) {
          const rx1 = Math.min(selectionRect.startX, selectionRect.endX);
          const ry1 = Math.min(selectionRect.startY, selectionRect.endY);
          const rx2 = Math.max(selectionRect.startX, selectionRect.endX);
          const ry2 = Math.max(selectionRect.startY, selectionRect.endY);
          if (rx2 - rx1 < 5 || ry2 - ry1 < 5) {
            setSelectionRect(null);
          } else {
            // 选区有效，标记 justDraggedRef 防止 click 创建锚点
            justDraggedRef.current = true;
          }
        }
      }
      // 清除 mousedown 中记录的起点（无论是否启动了选区）
      selectionStartRef.current = null;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [draggingIdx, draggingHandle, paths, pushHistory, isSelecting, selectionRect]);

  // ===== 键盘事件 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAnchorIdx(null);
        setSelectionRect(null);
        setActiveShape('select');
      }
      if ((e.key === 'z' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnchorIdx !== null) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        const newAnchors = activePath.anchors.filter((_, i) => i !== selectedAnchorIdx);
        const newPaths = [...paths];
        newPaths[activePathIdx] = { ...newPaths[activePathIdx], anchors: newAnchors, isClosed: false };
        setPaths(newPaths);
        setSelectedAnchorIdx(null);
        pushHistory(newPaths);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnchorIdx, activePath, activePathIdx, paths, handleUndo, pushHistory]);

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
    setGuideLines([]);
    setDistances([]);
    setHistory([empty.map(p => ({ ...p, anchors: [] }))]);
    historyIdxRef.current = 0;
  }, []);

  // ===== 保存到 store =====
  const handleSave = useCallback(() => {
    // 过滤掉空路径
    const nonEmptyPaths = paths.filter(p => p.anchors.length >= 2);
    if (nonEmptyPaths.length === 0) {
      message.warning('至少需要一条包含 2 个锚点的路径');
      return;
    }

    // ===== 自动裁剪：基于贝塞尔曲线实际采样点计算边界框 =====
    // 使用采样点而非控制柄坐标，避免控制柄远离曲线导致大片空白
    const pathBounds = nonEmptyPaths.map(p => getDecoPathBounds(p.anchors, p.isClosed)).filter(Boolean) as { minX: number; minY: number; maxX: number; maxY: number }[];
    if (pathBounds.length === 0) return;

    const minAx = Math.min(...pathBounds.map(b => b.minX));
    const minAy = Math.min(...pathBounds.map(b => b.minY));
    const maxAx = Math.max(...pathBounds.map(b => b.maxX));
    const maxAy = Math.max(...pathBounds.map(b => b.maxY));

    // 最大描边半宽作为 padding
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
      // 将像素线宽转为 viewBox 0-100 空间的比例值
      strokeWidth: (p.strokeWidth / cropW) * 100,
      // 裁剪矩形：像素转 0-100 百分比
      clipRect: p.clipRect ? {
        x: ((p.clipRect.x - minX) / cropW) * 100,
        y: ((p.clipRect.y - minY) / cropH) * 100,
        width: (p.clipRect.width / cropW) * 100,
        height: (p.clipRect.height / cropH) * 100,
      } : undefined,
    }));

    const decoration: CustomDecorationDefinition = {
      id: isEditMode && editDecoId ? editDecoId : `cde-${uuid().slice(0, 8)}`,
      name: decoName || '自定义装饰',
      paths: savedPaths,
      createdAt: isEditMode && editDecoId ? (customDecorations.find(d => d.id === editDecoId)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now(),
    };

    saveCustomDecoration(decoration);
    message.success(isEditMode ? '装饰已更新' : '自定义装饰已保存');
    navigate('/editor');
  }, [paths, decoName, stageWidth, stageHeight, isEditMode, editDecoId, saveCustomDecoration, navigate, customDecorations]);

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

      // 构建 SVG path d 属性，支持二次贝塞尔曲线
      let pathD = `M ${path.anchors[0].x} ${path.anchors[0].y}`;
      for (let i = 1; i < path.anchors.length; i++) {
        const prev = path.anchors[i - 1];
        const curr = path.anchors[i];
        // 优先使用 handleOut，其次 handleIn，都没有则直线
        const control = prev.handleOut || curr.handleIn;
        if (control) {
          pathD += ` Q ${control.x} ${control.y} ${curr.x} ${curr.y}`;
        } else {
          pathD += ` L ${curr.x} ${curr.y}`;
        }
      }

      // 闭合路径时，检查最后一个锚点到第一个锚点的曲线
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

        // 检查是否靠近首锚点（准备闭合）
        const isNearClose = path.anchors.length >= 3 && (() => {
          const dx = mousePos.x - first.x;
          const dy = mousePos.y - first.y;
          return Math.sqrt(dx * dx + dy * dy) < DECO_CLOSE_THRESHOLD;
        })();

        if (isNearClose) {
          // 靠近首锚点时，显示从最后一个锚点到首锚点的闭合预览线
          if (last.handleOut) {
            trackingPathD = `M ${last.x} ${last.y} Q ${last.handleOut.x} ${last.handleOut.y} ${first.x} ${first.y}`;
          } else {
            trackingPathD = `M ${last.x} ${last.y} L ${first.x} ${first.y}`;
          }
        } else {
          // 正常追踪线：从最后一个锚点到鼠标位置
          if (last.handleOut) {
            trackingPathD = `M ${last.x} ${last.y} Q ${last.handleOut.x} ${last.handleOut.y} ${mousePos.x} ${mousePos.y}`;
          } else {
            trackingPathD = `M ${last.x} ${last.y} L ${mousePos.x} ${mousePos.y}`;
          }
        }
      }

      return (
        <svg key={path.id} className="deco-editor-svg-layer" width={stageWidth} height={stageHeight}>
          {/* 裁剪定义 */}
          {path.clipRect && (
            <defs>
              <clipPath id={`clip-${path.id}`}>
                <rect x={path.clipRect.x} y={path.clipRect.y} width={path.clipRect.width} height={path.clipRect.height} />
              </clipPath>
            </defs>
          )}
          <g clipPath={path.clipRect ? `url(#clip-${path.id})` : undefined}>
            {/* 填充区域 */}
            {path.isClosed && path.anchors.length >= 3 && (
              <path
                d={pathD}
                fill={path.fillColor}
                stroke="none"
              />
            )}
            {/* 线条 */}
            <path
              d={pathD}
              fill="none"
              stroke={path.strokeColor}
              strokeWidth={path.strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={isActive ? 1 : 0.5}
            />
          </g>
          {/* 追踪线（不受裁剪影响） */}
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
        onMouseDown={(e) => handleAnchorMouseDown(i, e)}
        onClick={(e) => {
          // 点击首个锚点（⭐）且满足闭合条件时，闭合路径
          if (i === 0 && !activePath.isClosed && activePath.anchors.length >= 3) {
            handleClosePath(e);
          } else {
            e.stopPropagation();
          }
        }}
      />
    ));
  };

  // ===== 渲染控制柄（仅活跃路径） =====
  const renderHandles = () => {
    if (!activePath || !activePath.visible) return null;
    const handles: React.ReactNode[] = [];

    activePath.anchors.forEach((a, i) => {
      // handleOut: 从锚点出发，控制到下一个锚点的曲线
      if (a.handleOut) {
        handles.push(
          // 连接线
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
          // 控制柄圆点
          <div
            key={`handle-out-${i}`}
            className="deco-editor-handle deco-editor-handle--out"
            style={{ left: a.handleOut.x, top: a.handleOut.y }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDraggingHandle(`out-${i}`);
            }}
            onClick={(e) => e.stopPropagation()}
          />,
        );
      }

      // handleIn: 指向锚点，控制从上一个锚点到该锚点的曲线
      if (a.handleIn) {
        handles.push(
          // 连接线
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
          // 控制柄圆点
          <div
            key={`handle-in-${i}`}
            className="deco-editor-handle deco-editor-handle--in"
            style={{ left: a.handleIn.x, top: a.handleIn.y }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDraggingHandle(`in-${i}`);
            }}
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

  // PATH_COLORS 已从 constants 导入

  return (
    <div className="deco-editor">
      {/* ===== 顶部工具栏 ===== */}
      <div className="deco-editor-toolbar">
        <div className="deco-editor-toolbar-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/editor')}
            size="small"
          >
            返回
          </Button>
          <span className="deco-editor-toolbar-title">
            {isEditMode ? '编辑装饰' : '自定义装饰编辑器'}
          </span>
        </div>
        <div className="deco-editor-toolbar-right">
          <Button
            icon={<UndoOutlined />}
            onClick={handleUndo}
            size="small"
            disabled={historyIdxRef.current <= 0}
          >
            撤销
          </Button>
          <Button
            icon={<CloseOutlined />}
            onClick={handleReset}
            size="small"
            danger
          >
            重置
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSave}
            size="small"
            type="primary"
          >
            {isEditMode ? '更新' : '保存'}
          </Button>
        </div>
      </div>

      {/* ===== 主体 ===== */}
      <div className="deco-editor-body">
        {/* ===== 左侧形状工具栏 ===== */}
        <div className="deco-editor-shapes">
          <Tooltip title="选区裁剪（默认）" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'select' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('select')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><rect x="3" y="3" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/></svg>
            </button>
          </Tooltip>
          <div className="deco-editor-shapes-divider" />
          <Tooltip title="裁剪选区" placement="right">
            <button
              className={`deco-editor-shape-btn ${selectionRect ? 'crop-active' : ''}`}
              onClick={handleCrop}
              disabled={!selectionRect}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><circle cx="7" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><circle cx="14" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><line x1="9.5" y1="10.5" x2="16" y2="2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><line x1="16" y1="2" x2="18" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
          </Tooltip>
          <div className="deco-editor-shapes-divider" />
          <Tooltip title="矩形" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'rectangle' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('rectangle')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><rect x="2" y="4" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" rx="0.5"/></svg>
            </button>
          </Tooltip>
          <Tooltip title="圆角矩形" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'rounded-rect' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('rounded-rect')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><rect x="2" y="4" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3"/></svg>
            </button>
          </Tooltip>
          <Tooltip title="圆形" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'circle' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('circle')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          </Tooltip>
          <Tooltip title="椭圆" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'ellipse' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('ellipse')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><ellipse cx="10" cy="10" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          </Tooltip>
          <Tooltip title="三角形" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'triangle' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('triangle')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="10,2 18,17 2,17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </button>
          </Tooltip>
          <Tooltip title="菱形" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'diamond' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('diamond')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="10,1 19,10 10,19 1,10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </button>
          </Tooltip>
          <Tooltip title="六边形" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'hexagon' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('hexagon')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </button>
          </Tooltip>
          <Tooltip title="五角星" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'star' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('star')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="10,1 12.5,7.5 19,7.5 13.8,11.8 15.9,18.5 10,14.3 4.1,18.5 6.2,11.8 1,7.5 7.5,7.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
            </button>
          </Tooltip>
          <Tooltip title="心形" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'heart' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('heart')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><path d="M10,17 C5,12 1,8 4,4 C7,1 10,4 10,4 C10,4 13,1 16,4 C19,8 15,12 10,17Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
            </button>
          </Tooltip>
          <Tooltip title="箭头" placement="right">
            <button
              className={`deco-editor-shape-btn ${activeShape === 'arrow-right' ? 'active' : ''}`}
              onClick={() => handleShapeSelect('arrow-right')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="12,2 19,10 12,18 12,13 1,13 1,7 12,7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
            </button>
          </Tooltip>
        </div>

        {/* ===== 舞台 ===== */}
        <div className="deco-editor-stage-wrapper">
          <div style={{ position: 'relative' }}>
            <div
              ref={stageRef}
              className="deco-editor-stage"
              style={{ width: stageWidth, height: stageHeight, cursor: activeShape !== 'select' ? 'crosshair' : isSelecting ? 'crosshair' : 'crosshair' }}
              onClick={handleStageClick}
              onContextMenu={handleStageContextMenu}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleStageMouseMove}
              onMouseLeave={handleStageMouseLeave}
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
              {renderHandles()}
              {renderCursor()}
            </div>
            <div className="deco-editor-size-label">
              {stageWidth} × {stageHeight} px
            </div>
          </div>
        </div>

        {/* ===== 右侧配置面板 ===== */}
        <div className="deco-editor-panel">
          {/* 名称 */}
          <div className="deco-editor-panel-section">
            <div className="deco-editor-panel-section-title">名称</div>
            <Input
              value={decoName}
              onChange={(e) => setDecoName(e.target.value)}
              placeholder="装饰名称"
              size="small"
            />
          </div>

          {/* 舞台大小 */}
          <div className="deco-editor-panel-section">
            <div className="deco-editor-panel-section-title">舞台大小</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <InputNumber
                value={stageWidth}
                onChange={(v) => v && setStageWidth(v)}
                min={100}
                max={1200}
                step={20}
                size="small"
                style={{ width: 100 }}
                suffix="W"
              />
              <span style={{ color: '#666' }}>×</span>
              <InputNumber
                value={stageHeight}
                onChange={(v) => v && setStageHeight(v)}
                min={100}
                max={1200}
                step={20}
                size="small"
                style={{ width: 100 }}
                suffix="H"
              />
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { label: '100×100', w: 100, h: 100 },
                { label: '200×200', w: 200, h: 200 },
                { label: '400×400', w: 400, h: 400 },
                { label: '400×200', w: 400, h: 200 },
                { label: '800×400', w: 800, h: 400 },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  size="small"
                  onClick={() => { setStageWidth(preset.w); setStageHeight(preset.h); }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 绘制说明 */}
          <div className="deco-editor-panel-section">
            <div className="deco-editor-panel-section-title">绘制说明</div>
            <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
              点击舞台添加锚点，自动生成控制柄可调整弯曲程度。拖拽控制柄至锚点位置即可变为直线连接。
            </div>
          </div>

          {/* 路径管理 */}
          <div className="deco-editor-panel-section">
            <div className="deco-editor-panel-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>路径 ({paths.length})</span>
              <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleAddPath}>
                添加
              </Button>
            </div>
            <div className="deco-editor-path-list">
              {paths.map((path, idx) => {
                const colorIdx = idx % PATH_COLORS.length;
                const isActive = idx === activePathIdx;
                return (
                  <div
                    key={path.id}
                    className={`deco-editor-path-item ${isActive ? 'active' : ''}`}
                    onClick={() => { setActivePathIdx(idx); setSelectedAnchorIdx(null); }}
                  >
                    <div
                      className="deco-editor-path-item-color"
                      style={{ background: PATH_COLORS[colorIdx] }}
                    />
                    <span className="deco-editor-path-item-name">
                      路径 {idx + 1}
                    </span>
                    <span className="deco-editor-path-item-info">
                      {path.isClosed ? '闭合' : '开放'} · {path.anchors.length} 点
                    </span>
                    <div className="deco-editor-path-item-actions">
                      <Tooltip title={path.visible ? '隐藏' : '显示'}>
                        <span
                          className="deco-editor-path-item-btn"
                          onClick={(e) => { e.stopPropagation(); handleTogglePathVisible(idx); }}
                        >
                          {path.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        </span>
                      </Tooltip>
                      {paths.length > 1 && (
                        <Tooltip title="删除路径">
                          <span
                            className="deco-editor-path-item-btn deco-editor-path-item-btn--danger"
                            onClick={(e) => { e.stopPropagation(); handleDeletePath(idx); }}
                          >
                            <DeleteOutlined />
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 当前路径属性 */}
          <div className="deco-editor-panel-section">
            <div className="deco-editor-panel-section-title">路径属性</div>
            <div className="deco-editor-field">
              <div className="deco-editor-field-label">填充色</div>
              <ColorFieldInput
                value={activePath?.fillColor || '#1a56db'}
                onChange={(hex) => updatePath(activePathIdx, { fillColor: hex })}
                rowClassName="deco-editor-field-row"
              />
            </div>
            <div className="deco-editor-field">
              <div className="deco-editor-field-label">线条色</div>
              <ColorFieldInput
                value={activePath?.strokeColor || '#1a56db'}
                onChange={(hex) => updatePath(activePathIdx, { strokeColor: hex })}
                rowClassName="deco-editor-field-row"
              />
            </div>
            <div className="deco-editor-field">
              <div className="deco-editor-field-label">线条宽度</div>
              <InputNumber
                value={activePath?.strokeWidth ?? 2}
                onChange={(v) => v !== null && updatePath(activePathIdx, { strokeWidth: v })}
                min={0}
                max={20}
                step={0.5}
                size="small"
                style={{ width: '100%' }}
              />
            </div>
            {/* 路径状态 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              {activePath?.isClosed ? (
                <span style={{ color: '#22c55e', fontSize: 12 }}>
                  <CheckCircleOutlined /> 已闭合
                </span>
              ) : (
                <span style={{ color: '#f59e0b', fontSize: 12 }}>
                  未闭合{activePath && activePath.anchors.length < 3 ? ` (还需 ${3 - activePath.anchors.length} 点)` : ' (点击首点闭合)'}
                </span>
              )}
            </div>
            {!activePath?.isClosed && activePath && activePath.anchors.length >= 3 && (
              <Button size="small" onClick={(e) => handleClosePath(e as any)} block style={{ marginTop: 6 }}>
                闭合路径
              </Button>
            )}
          </div>

          {/* 锚点列表 */}
          <div className="deco-editor-panel-section" style={{ flex: 1 }}>
            <div className="deco-editor-panel-section-title">
              锚点 ({activePath?.anchors.length || 0})
            </div>
            <div className="deco-editor-anchor-list">
              {(activePath?.anchors || []).map((a, i) => (
                <div
                  key={i}
                  className="deco-editor-anchor-item"
                  style={{
                    background: selectedAnchorIdx === i ? 'rgba(26, 86, 219, 0.06)' : undefined,
                  }}
                  onClick={() => setSelectedAnchorIdx(i)}
                >
                  <span>
                    {i === 0 ? '⭐' : '🔵'} {i + 1}
                  </span>
                  <span className="deco-editor-anchor-item-coord">
                    ({Math.round(a.x)}, {Math.round(a.y)})
                  </span>
                  <span
                    className="deco-editor-anchor-item-delete"
                    onClick={(e) => { e.stopPropagation(); handleDeleteAnchor(i); }}
                  >
                    <DeleteOutlined />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 提示 */}
          <div className="deco-editor-panel-section" style={{ borderBottom: 'none' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>
              💡 点击舞台添加锚点（自动生成控制柄）<br />
              💡 拖拽锚点可调整位置<br />
              💡 右键点击舞台可删除最后一个锚点<br />
              💡 点击首个锚点（⭐）或靠近首点点击可闭合路径<br />
              💡 Ctrl+Z 撤销，Delete 删除选中锚点<br />
              💡 拖拽 🟠 橙色控制柄调整出方向曲线<br />
              💡 拖拽 🟣 紫色控制柄调整入方向曲线<br />
              💡 将控制柄拖回锚点位置可变为直线连接<br />
              💡 左侧工具栏可选择预设形状<br />
              💡 选择模式下拖拽舞台可拉出选区裁剪
            </div>
          </div>
        </div>
      </div>

      {/* ===== 底部状态栏 ===== */}
      <div className="deco-editor-statusbar">
        <div className="status-item">
          路径: {paths.length}
        </div>
        <div className="status-item">
          当前: 路径 {activePathIdx + 1} · {activePath?.anchors.length || 0} 锚点 · {activePath?.isClosed ? '已闭合' : '绘制中'}
        </div>
        <div className="status-item" style={{ color: activeShape !== 'select' ? '#f59e0b' : '#a855f7' }}>
          {activeShape === 'select' ? '选区裁剪' : `形状: ${activeShape}`}
        </div>
        {selectionRect && (
          <div className="status-item" style={{ color: '#3b82f6' }}>
            选区: {Math.abs(Math.round(selectionRect.endX - selectionRect.startX))}×{Math.abs(Math.round(selectionRect.endY - selectionRect.startY))}px
          </div>
        )}
        {isMouseOnStage && mousePos && (
          <div className="status-item">
            鼠标: ({Math.round(mousePos.x)}, {Math.round(mousePos.y)})
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

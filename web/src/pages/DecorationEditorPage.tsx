import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, InputNumber, ColorPicker, Tooltip, message, Popconfirm } from 'antd';
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
import './DecorationEditorPage.less';

/** 锚点坐标（像素） */
interface AnchorPixel {
  x: number;
  y: number;
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

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 5;
const CLOSE_THRESHOLD = 12;

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
  const stageRef = useRef<HTMLDivElement>(null);

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
      newHistory.push(newPaths.map(p => ({ ...p, anchors: p.anchors.map(a => ({ ...a })) })));
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
          })),
          isClosed: p.isClosed,
          fillColor: p.fillColor,
          strokeColor: p.strokeColor,
          // strokeWidth 已保存为 viewBox 比例值，还原为像素值
          strokeWidth: (p.strokeWidth / 100) * sw,
          visible: true,
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
        setPaths(prevPaths.map(p => ({ ...p, anchors: p.anchors.map(a => ({ ...a })) })));
      }
    }
  }, [history]);

  // ===== 吸附到网格 =====
  const snapToGrid = useCallback((val: number): number => {
    return Math.round(val / GRID_SIZE) * GRID_SIZE;
  }, []);

  // ===== 辅助线计算 =====
  const computeGuides = useCallback(
    (x: number, y: number): GuideLine[] => {
      const guides: GuideLine[] = [];
      // 对齐到当前路径的其他锚点
      for (const a of activePath.anchors) {
        if (Math.abs(a.x - x) < SNAP_THRESHOLD) {
          guides.push({ type: 'vertical', position: a.x });
        }
        if (Math.abs(a.y - y) < SNAP_THRESHOLD) {
          guides.push({ type: 'horizontal', position: a.y });
        }
      }
      const cx = stageWidth / 2;
      const cy = stageHeight / 2;
      if (Math.abs(cx - x) < SNAP_THRESHOLD) guides.push({ type: 'vertical', position: cx });
      if (Math.abs(cy - y) < SNAP_THRESHOLD) guides.push({ type: 'horizontal', position: cy });
      if (Math.abs(x) < SNAP_THRESHOLD) guides.push({ type: 'vertical', position: 0 });
      if (Math.abs(x - stageWidth) < SNAP_THRESHOLD) guides.push({ type: 'vertical', position: stageWidth });
      if (Math.abs(y) < SNAP_THRESHOLD) guides.push({ type: 'horizontal', position: 0 });
      if (Math.abs(y - stageHeight) < SNAP_THRESHOLD) guides.push({ type: 'horizontal', position: stageHeight });

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
        if (g.type === 'vertical' && Math.abs(g.position - x) < SNAP_THRESHOLD) x = g.position;
        if (g.type === 'horizontal' && Math.abs(g.position - y) < SNAP_THRESHOLD) y = g.position;
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

  // ===== 舞台点击：添加锚点 =====
  const handleStageClick = useCallback(
    (e: React.MouseEvent) => {
      if (activePath.isClosed) return;
      if (draggingIdx !== null) return;

      const pos = getStagePos(e);
      if (!pos) return;

      // 检查是否靠近第一个锚点（闭合路径）
      if (activePath.anchors.length >= 3) {
        const first = activePath.anchors[0];
        const dx = pos.x - first.x;
        const dy = pos.y - first.y;
        if (Math.sqrt(dx * dx + dy * dy) < CLOSE_THRESHOLD) {
          updatePath(activePathIdx, { isClosed: true });
          return;
        }
      }

      const newAnchors = [...activePath.anchors, pos];
      const newPaths = [...paths];
      newPaths[activePathIdx] = { ...newPaths[activePathIdx], anchors: newAnchors };
      setPaths(newPaths);
      pushHistory(newPaths);
    },
    [activePath, activePathIdx, paths, draggingIdx, getStagePos, pushHistory, updatePath],
  );

  // ===== 鼠标移动 =====
  const handleStageMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getStagePos(e);
      if (!pos) return;

      setMousePos(pos);
      setIsMouseOnStage(true);

      if (!activePath.isClosed && activePath.anchors.length > 0) {
        setGuideLines(computeGuides(pos.x, pos.y));
        setDistances(computeDistances(pos.x, pos.y));
      }

      if (draggingIdx !== null) {
        setPaths(prev => {
          const newPaths = [...prev];
          const path = { ...newPaths[activePathIdx] };
          const newAnchors = [...path.anchors];
          newAnchors[draggingIdx] = pos;
          path.anchors = newAnchors;
          newPaths[activePathIdx] = path;
          return newPaths;
        });
      }
    },
    [getStagePos, activePath, activePathIdx, computeGuides, computeDistances, draggingIdx],
  );

  const handleStageMouseLeave = useCallback(() => {
    setIsMouseOnStage(false);
    setMousePos(null);
    setGuideLines([]);
    setDistances([]);
  }, []);

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
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [draggingIdx, paths, pushHistory]);

  // ===== 键盘事件 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAnchorIdx(null);
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
    setHistory(empty.map(p => ({ ...p, anchors: [] })));
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

    // ===== 自动裁剪：计算所有锚点的边界框，加 strokeWidth 的半宽 padding =====
    const allAnchors = nonEmptyPaths.flatMap(p => p.anchors);
    const minAx = Math.min(...allAnchors.map(a => a.x));
    const minAy = Math.min(...allAnchors.map(a => a.y));
    const maxAx = Math.max(...allAnchors.map(a => a.x));
    const maxAy = Math.max(...allAnchors.map(a => a.y));

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
      })),
      isClosed: p.isClosed,
      fillColor: p.fillColor,
      strokeColor: p.strokeColor,
      // 将像素线宽转为 viewBox 0-100 空间的比例值
      strokeWidth: (p.strokeWidth / cropW) * 100,
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
    for (let x = 0; x <= stageWidth; x += GRID_SIZE) {
      lines.push(
        <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={stageHeight} stroke="#e5e7eb" strokeWidth={0.5} />,
      );
    }
    for (let y = 0; y <= stageHeight; y += GRID_SIZE) {
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

      let pathD = `M ${path.anchors[0].x} ${path.anchors[0].y}`;
      for (let i = 1; i < path.anchors.length; i++) {
        pathD += ` L ${path.anchors[i].x} ${path.anchors[i].y}`;
      }

      // 追踪线（仅当前活跃路径）
      let trackingPathD = '';
      if (isActive && !path.isClosed && isMouseOnStage && mousePos && path.anchors.length > 0) {
        const last = path.anchors[path.anchors.length - 1];
        trackingPathD = `M ${last.x} ${last.y} L ${mousePos.x} ${mousePos.y}`;

        if (path.anchors.length >= 2) {
          const first = path.anchors[0];
          const dx = mousePos.x - first.x;
          const dy = mousePos.y - first.y;
          if (Math.sqrt(dx * dx + dy * dy) < CLOSE_THRESHOLD) {
            trackingPathD += ` M ${mousePos.x} ${mousePos.y} L ${first.x} ${first.y}`;
          }
        }
      }

      return (
        <svg key={path.id} className="deco-editor-svg-layer" width={stageWidth} height={stageHeight}>
          {/* 填充区域 */}
          {path.isClosed && path.anchors.length >= 3 && (
            <path
              d={`${pathD} Z`}
              fill={path.fillColor}
              stroke="none"
            />
          )}
          {/* 线条 */}
          <path
            d={path.isClosed ? `${pathD} Z` : pathD}
            fill="none"
            stroke={path.strokeColor}
            strokeWidth={path.strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={isActive ? 1 : 0.5}
          />
          {/* 追踪线 */}
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
      />
    ));
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
    return Math.sqrt(dx * dx + dy * dy) < CLOSE_THRESHOLD;
  })();

  // ===== 路径颜色标识 =====
  const pathColors = ['#1a56db', '#c026d3', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

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
        {/* ===== 舞台 ===== */}
        <div className="deco-editor-stage-wrapper">
          <div style={{ position: 'relative' }}>
            <div
              ref={stageRef}
              className="deco-editor-stage"
              style={{ width: stageWidth, height: stageHeight }}
              onClick={handleStageClick}
              onMouseMove={handleStageMouseMove}
              onMouseLeave={handleStageMouseLeave}
            >
              {renderGrid()}
              {renderPaths()}
              {renderGuideLines()}
              {renderDistances()}
              {renderAnchors()}
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
                addonAfter="W"
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
                addonAfter="H"
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
                const colorIdx = idx % pathColors.length;
                const isActive = idx === activePathIdx;
                return (
                  <div
                    key={path.id}
                    className={`deco-editor-path-item ${isActive ? 'active' : ''}`}
                    onClick={() => { setActivePathIdx(idx); setSelectedAnchorIdx(null); }}
                  >
                    <div
                      className="deco-editor-path-item-color"
                      style={{ background: pathColors[colorIdx] }}
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
              <div className="deco-editor-field-row">
                <ColorPicker
                  value={activePath?.fillColor || '#1a56db'}
                  onChange={(_, hex) => updatePath(activePathIdx, { fillColor: hex })}
                  size="small"
                />
                <Input
                  value={activePath?.fillColor || '#1a56db'}
                  onChange={(e) => updatePath(activePathIdx, { fillColor: e.target.value })}
                  size="small"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div className="deco-editor-field">
              <div className="deco-editor-field-label">线条色</div>
              <div className="deco-editor-field-row">
                <ColorPicker
                  value={activePath?.strokeColor || '#1a56db'}
                  onChange={(_, hex) => updatePath(activePathIdx, { strokeColor: hex })}
                  size="small"
                />
                <Input
                  value={activePath?.strokeColor || '#1a56db'}
                  onChange={(e) => updatePath(activePathIdx, { strokeColor: e.target.value })}
                  size="small"
                  style={{ flex: 1 }}
                />
              </div>
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
              <Button size="small" onClick={() => updatePath(activePathIdx, { isClosed: true })} block style={{ marginTop: 6 }}>
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
              💡 点击舞台添加锚点<br />
              💡 拖拽锚点可调整位置<br />
              💡 点击首个锚点（⭐）闭合路径<br />
              💡 Ctrl+Z 撤销，Delete 删除选中锚点
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

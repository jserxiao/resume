/**
 * 装饰编辑器 — 辅助线与距离标注 Hook
 *
 * 负责：
 * - 网格吸附
 * - 对齐辅助线计算（对齐到其他锚点、画布中心/边缘）
 * - 距离标注计算（到画布边缘、到最后一个锚点的距离）
 * - 获取舞台相对坐标（含吸附）
 */
import { useState, useCallback } from 'react';
import { DECO_GRID_SIZE, DECO_SNAP_THRESHOLD } from '@/utils/constants';
import type { AnchorPixel, EditablePath, GuideLine, DistanceLabel } from './types';

export interface UseDecoSnapGuidesReturn {
  mousePos: AnchorPixel | null;
  setMousePos: (pos: AnchorPixel | null) => void;
  isMouseOnStage: boolean;
  setIsMouseOnStage: (val: boolean) => void;
  guideLines: GuideLine[];
  setGuideLines: (lines: GuideLine[]) => void;
  distances: DistanceLabel[];
  setDistances: (labels: DistanceLabel[]) => void;
  snapToGrid: (val: number) => number;
  computeGuides: (x: number, y: number) => GuideLine[];
  computeDistances: (x: number, y: number) => DistanceLabel[];
  getStagePos: (e: React.MouseEvent | MouseEvent, stageRef: React.RefObject<HTMLDivElement | null>, stageWidth: number, stageHeight: number) => AnchorPixel | null;
}

export function useDecoSnapGuides(
  activePath: EditablePath,
  stageWidth: number,
  stageHeight: number,
): UseDecoSnapGuidesReturn {
  const [mousePos, setMousePos] = useState<AnchorPixel | null>(null);
  const [isMouseOnStage, setIsMouseOnStage] = useState(false);
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [distances, setDistances] = useState<DistanceLabel[]>([]);

  // ===== 吸附到网格 =====
  const snapToGrid = useCallback((val: number): number => {
    return Math.round(val / DECO_GRID_SIZE) * DECO_GRID_SIZE;
  }, []);

  // ===== 辅助线计算 =====
  const computeGuides = useCallback(
    (x: number, y: number): GuideLine[] => {
      const guides: GuideLine[] = [];
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
    (e: React.MouseEvent | MouseEvent, stageRef: React.RefObject<HTMLDivElement | null>, sw: number, sh: number): AnchorPixel | null => {
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

      return { x: Math.max(0, Math.min(sw, x)), y: Math.max(0, Math.min(sh, y)) };
    },
    [computeGuides, snapToGrid],
  );

  return {
    mousePos, setMousePos,
    isMouseOnStage, setIsMouseOnStage,
    guideLines, setGuideLines,
    distances, setDistances,
    snapToGrid,
    computeGuides,
    computeDistances,
    getStagePos,
  };
}

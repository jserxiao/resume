/**
 * 装饰编辑器 — 顶部工具栏 + 左侧形状工具栏
 *
 * 包含：
 * - 顶部工具栏（返回、撤销、重置、保存）
 * - 左侧形状工具按钮列表（矩形、圆形、三角形等）
 */
import React from 'react';
import { Button, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  UndoOutlined,
  CloseOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { ShapeType } from '@/utils/geometry';

interface DecoToolbarProps {
  isEditMode: boolean;
  canUndo: boolean;
  activeShape: ShapeType;
  selectionRect: { startX: number; startY: number; endX: number; endY: number } | null;
  onBack: () => void;
  onUndo: () => void;
  onReset: () => void;
  onSave: () => void;
  onShapeSelect: (shape: ShapeType) => void;
  onCrop: () => void;
}

export default function DecoToolbar({
  isEditMode,
  canUndo,
  onBack,
  onUndo,
  onReset,
  onSave,
}: Omit<DecoToolbarProps, 'activeShape' | 'selectionRect' | 'onShapeSelect' | 'onCrop'>) {
  return (
    <div className="deco-editor-toolbar">
        <div className="deco-editor-toolbar-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
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
            onClick={onUndo}
            size="small"
            disabled={!canUndo}
          >
            撤销
          </Button>
          <Button
            icon={<CloseOutlined />}
            onClick={onReset}
            size="small"
            danger
          >
            重置
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={onSave}
            size="small"
            type="primary"
          >
            {isEditMode ? '更新' : '保存'}
          </Button>
        </div>
      </div>

  );
}

// ========== 左侧形状工具栏（独立组件，放在 body 内） ==========

export function DecoShapesToolbar({
  activeShape,
  selectionRect,
  onShapeSelect,
  onCrop,
}: Pick<DecoToolbarProps, 'activeShape' | 'selectionRect' | 'onShapeSelect' | 'onCrop'>) {
  return (
    <div className="deco-editor-shapes">
      <Tooltip title="选区裁剪（默认）" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'select' ? 'active' : ''}`}
          onClick={() => onShapeSelect('select')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><rect x="3" y="3" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/></svg>
        </button>
      </Tooltip>
      <div className="deco-editor-shapes-divider" />
      <Tooltip title="裁剪选区" placement="right">
        <button
          className={`deco-editor-shape-btn ${selectionRect ? 'crop-active' : ''}`}
          onClick={onCrop}
          disabled={!selectionRect}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><circle cx="7" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><circle cx="14" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><line x1="9.5" y1="10.5" x2="16" y2="2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><line x1="16" y1="2" x2="18" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </button>
      </Tooltip>
      <div className="deco-editor-shapes-divider" />
      <Tooltip title="矩形" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'rectangle' ? 'active' : ''}`}
          onClick={() => onShapeSelect('rectangle')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><rect x="2" y="4" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" rx="0.5"/></svg>
        </button>
      </Tooltip>
      <Tooltip title="圆角矩形" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'rounded-rect' ? 'active' : ''}`}
          onClick={() => onShapeSelect('rounded-rect')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><rect x="2" y="4" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3"/></svg>
        </button>
      </Tooltip>
      <Tooltip title="圆形" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'circle' ? 'active' : ''}`}
          onClick={() => onShapeSelect('circle')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
        </button>
      </Tooltip>
      <Tooltip title="椭圆" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'ellipse' ? 'active' : ''}`}
          onClick={() => onShapeSelect('ellipse')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><ellipse cx="10" cy="10" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
        </button>
      </Tooltip>
      <Tooltip title="三角形" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'triangle' ? 'active' : ''}`}
          onClick={() => onShapeSelect('triangle')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="10,2 18,17 2,17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </button>
      </Tooltip>
      <Tooltip title="菱形" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'diamond' ? 'active' : ''}`}
          onClick={() => onShapeSelect('diamond')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="10,1 19,10 10,19 1,10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </button>
      </Tooltip>
      <Tooltip title="六边形" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'hexagon' ? 'active' : ''}`}
          onClick={() => onShapeSelect('hexagon')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </button>
      </Tooltip>
      <Tooltip title="五角星" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'star' ? 'active' : ''}`}
          onClick={() => onShapeSelect('star')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="10,1 12.5,7.5 19,7.5 13.8,11.8 15.9,18.5 10,14.3 4.1,18.5 6.2,11.8 1,7.5 7.5,7.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
        </button>
      </Tooltip>
      <Tooltip title="心形" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'heart' ? 'active' : ''}`}
          onClick={() => onShapeSelect('heart')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><path d="M10,17 C5,12 1,8 4,4 C7,1 10,4 10,4 C10,4 13,1 16,4 C19,8 15,12 10,17Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
        </button>
      </Tooltip>
      <Tooltip title="箭头" placement="right">
        <button
          className={`deco-editor-shape-btn ${activeShape === 'arrow-right' ? 'active' : ''}`}
          onClick={() => onShapeSelect('arrow-right')}
        >
          <svg viewBox="0 0 20 20" width="16" height="16"><polygon points="12,2 19,10 12,18 12,13 1,13 1,7 12,7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
        </button>
      </Tooltip>
    </div>
  );
}

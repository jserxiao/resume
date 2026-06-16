/**
 * 装饰编辑器 — 右侧配置面板
 *
 * 包含：
 * - 名称输入
 * - 舞台大小配置
 * - 绘制说明
 * - 路径管理列表
 * - 路径属性（填充色、线条色、宽度、闭合状态）
 * - 逐边颜色编辑
 * - 锚点列表
 * - 使用提示
 */
import React from 'react';
import { Button, Input, InputNumber, Tooltip } from 'antd';
import {
  PlusOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { PATH_COLORS } from '@/utils/constants';
import ColorFieldInput from '@/components/shared/ColorFieldInput';
import type { EditablePath } from './types';

interface DecoPathListProps {
  decoName: string;
  setDecoName: (name: string) => void;
  stageWidth: number;
  setStageWidth: (w: number) => void;
  stageHeight: number;
  setStageHeight: (h: number) => void;
  paths: EditablePath[];
  activePathIdx: number;
  activePath: EditablePath;
  selectedAnchorIdx: number | null;
  selectedEdgeIdx: number | null;
  setActivePathIdx: (idx: number) => void;
  setSelectedAnchorIdx: (idx: number | null) => void;
  setSelectedEdgeIdx: (idx: number | null) => void;
  updatePath: (pathIdx: number, updates: Partial<EditablePath>) => void;
  handleAddPath: () => void;
  handleDeletePath: (pathIdx: number) => void;
  handleTogglePathVisible: (pathIdx: number) => void;
  handleDeleteAnchor: (anchorIdx: number) => void;
  handleClosePath: (e: React.MouseEvent) => void;
  getEdgeCount: (path: EditablePath) => number;
}

export default function DecoPathList({
  decoName,
  setDecoName,
  stageWidth,
  setStageWidth,
  stageHeight,
  setStageHeight,
  paths,
  activePathIdx,
  activePath,
  selectedAnchorIdx,
  selectedEdgeIdx,
  setActivePathIdx,
  setSelectedAnchorIdx,
  setSelectedEdgeIdx,
  updatePath,
  handleAddPath,
  handleDeletePath,
  handleTogglePathVisible,
  handleDeleteAnchor,
  handleClosePath,
  getEdgeCount,
}: DecoPathListProps) {
  return (
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

      {/* 逐边颜色 */}
      {activePath && activePath.anchors.length >= 2 && (
        <div className="deco-editor-panel-section">
          <div className="deco-editor-panel-section-title">逐边颜色</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
            点击色块修改单条边的颜色，拖拽边中点可平移整条边
          </div>
          <div className="deco-editor-edge-list">
            {(() => {
              const edgeCount = getEdgeCount(activePath);
              const items: React.ReactNode[] = [];
              for (let i = 0; i < edgeCount; i++) {
                const fromAnchor = activePath.anchors[i];
                const toIdx = (i + 1) % activePath.anchors.length;
                const toAnchor = activePath.anchors[toIdx];
                const edgeColor = activePath.edgeColors?.[i] || activePath.strokeColor;
                const isSelected = selectedEdgeIdx === i;
                items.push(
                  <div
                    key={`edge-color-${i}`}
                    className="deco-editor-edge-item"
                    style={{
                      background: isSelected ? 'rgba(26, 86, 219, 0.06)' : undefined,
                      borderLeft: isSelected ? '2px solid var(--color-primary)' : undefined,
                    }}
                    onClick={() => { setSelectedEdgeIdx(i); setSelectedAnchorIdx(null); }}
                  >
                    <span className="deco-editor-edge-item-label">
                      边 {i + 1}
                    </span>
                    <span className="deco-editor-edge-item-coord">
                      ({Math.round(fromAnchor.x)},{Math.round(fromAnchor.y)})→({Math.round(toAnchor.x)},{Math.round(toAnchor.y)})
                    </span>
                    <ColorFieldInput
                      value={edgeColor}
                      onChange={(hex) => {
                        const newEdgeColors = [...(activePath.edgeColors || new Array(edgeCount).fill(''))];
                        newEdgeColors[i] = hex;
                        updatePath(activePathIdx, { edgeColors: newEdgeColors });
                      }}
                      rowClassName="deco-editor-edge-item-color-row"
                    />
                  </div>,
                );
              }
              return items;
            })()}
          </div>
        </div>
      )}

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
  );
}

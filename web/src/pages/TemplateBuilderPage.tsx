import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Tag, Divider, Slider, ColorPicker, message, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  FormatPainterOutlined,
  BorderOutlined,
  StarOutlined,
  LineOutlined,
  TagOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { Snapline } from '@antv/x6-plugin-snapline';
import { Transform } from '@antv/x6-plugin-transform';
import { Selection } from '@antv/x6-plugin-selection';
import { History } from '@antv/x6-plugin-history';
import { Dnd } from '@antv/x6-plugin-dnd';
import { v4 as uuid } from 'uuid';
import { useResumeStore } from '@/store';
import { presetDecorations } from '@/utils/decorations';
import { FieldType } from '@/types';
import type { FieldDefinition, DecorationDefinition, DecorationElement } from '@/types';
import './TemplateBuilderPage.less';

// ========== 块模板画布尺寸 ==========
const CANVAS_WIDTH_PX = 400;
const CANVAS_HEIGHT_PX = 300;

/** 模板分类选项 */
const CATEGORY_OPTIONS = [
  { label: '头部', value: '头部' },
  { label: '基础', value: '基础' },
  { label: '经历', value: '经历' },
  { label: '教育', value: '教育' },
  { label: '其他', value: '其他' },
  { label: '自定义', value: '自定义' },
];

/** 字段类型选项 */
const FIELD_TYPE_OPTIONS = [
  { label: '文本', value: FieldType.Text },
  { label: '多行文本', value: FieldType.TextArea },
  { label: '富文本', value: FieldType.RichText },
  { label: '日期', value: FieldType.Date },
  { label: '图片', value: FieldType.Image },
  { label: '标签列表', value: FieldType.TagList },
  { label: '链接', value: FieldType.Link },
  { label: '下拉选择', value: FieldType.Select },
  { label: '开关', value: FieldType.Switch },
  { label: '星级评分', value: FieldType.Rating },
  { label: '数字', value: FieldType.Number },
  { label: '百分比', value: FieldType.Percentage },
  { label: '颜色', value: FieldType.Color },
  { label: '装饰元素', value: FieldType.Decoration },
];

/** 字段类型图标映射 */
const FIELD_TYPE_ICONS: Record<string, string> = {
  [FieldType.Text]: 'T',
  [FieldType.TextArea]: '¶',
  [FieldType.RichText]: 'A',
  [FieldType.Date]: '📅',
  [FieldType.Image]: '🖼',
  [FieldType.TagList]: '#',
  [FieldType.Link]: '🔗',
  [FieldType.Select]: '▾',
  [FieldType.Switch]: '⊙',
  [FieldType.Rating]: '★',
  [FieldType.Number]: '#',
  [FieldType.Percentage]: '%',
  [FieldType.Color]: '🎨',
  [FieldType.Decoration]: '◆',
};

/** 画布节点类型标识 */
type CanvasNodeType = 'decoration' | 'field';

interface CanvasNodeMeta {
  type: CanvasNodeType;
  fieldId?: string;       // 字段节点关联的 fieldId
  decorationId?: string;  // 装饰节点关联的 DecorationDefinition.id
}

export default function TemplateBuilderPage() {
  const navigate = useNavigate();
  const { addBlockTemplate } = useResumeStore();

  // 模板基本信息
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('自定义');

  // 字段列表
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // 装饰元素列表
  const [decorations, setDecorations] = useState<DecorationElement[]>([]);
  const [selectedDecoId, setSelectedDecoId] = useState<string | null>(null);

  // 当前选中的节点类型
  const [selectedNodeType, setSelectedNodeType] = useState<CanvasNodeType | null>(null);

  // 画布缩放
  const [zoom, setZoom] = useState(1);

  // X6 画布
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const dndRef = useRef<Dnd | null>(null);

  // ========== 注册自定义节点 ==========
  useEffect(() => {
    // 注册 SVG path 装饰节点 — 继承 rect 以获取正确的缩放手柄，无连接桩
    Graph.registerNode('deco-shape', {
      inherit: 'rect',
      width: 40,
      height: 40,
      markup: [
        {
          tagName: 'path',
          selector: 'body',
        },
      ],
      attrs: {
        body: {
          d: 'M 0 0',
          fill: '#1a56db',
          stroke: 'transparent',
          strokeWidth: 0,
          opacity: 1,
          refD: null,
        },
      },
    });

    // 注册字段节点 — 纯文字，无背景无边框（选中时通过 Transform 虚线框标识）
    Graph.registerNode('field-shape', {
      inherit: 'rect',
      width: 140,
      height: 36,
      attrs: {
        body: {
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          rx: 0,
          ry: 0,
        },
        label: {
          fill: '#333333',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'sans-serif',
        },
      },
    });

    return () => {
      Graph.unregisterNode('deco-shape');
      Graph.unregisterNode('field-shape');
    };
  }, []);

  // ========== 初始化 X6 画布 ==========
  useEffect(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const graph = new Graph({
      container: containerRef.current,
      width: containerWidth,
      height: containerHeight,
      // 背景网格 — 每格代表 10px
      grid: {
        size: 10,
        visible: true,
        type: 'doubleMesh',
        args: [
          { color: '#f0f0f0', thickness: 1 },
          { color: '#e0e0e0', thickness: 1, factor: 5 },
        ],
      },
      // 画布平移
      panning: { enabled: true },
      // 画布缩放
      mousewheel: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
        factor: 1.1,
      },
      // 选中高亮
      highlighting: {
        magnetAdsorbed: {
          name: 'stroke',
          args: { attrs: { fill: '#fff', stroke: '#1a56db' } },
        },
      },
      // 对齐容差 — 辅助线/吸附阈值
      snapline: {
        enabled: true,
        className: 'my-snapline',
      },
    });

    // 注册插件 — 注意顺序：Selection 必须在 Transform 之前
    graph.use(new Snapline({ enabled: true }));
    graph.use(new Selection({
      enabled: true,
      rubberband: true,
      showNodeSelectionBox: true,
    }));
    graph.use(
      new Transform({
        resizing: {
          enabled: true,
          minWidth: 10,
          minHeight: 10,
          // 允许自由拉伸（不锁定宽高比），保留四边+四角共8个手柄
          preserveAspectRatio: false,
          orthogonal: true,
        },
        rotating: { enabled: true },
      }),
    );
    graph.use(new History({ enabled: true }));

    // 初始化 Dnd 插件
    const dnd = new Dnd({ target: graph, scaled: true });
    dndRef.current = dnd;

    // ===== 绘制块模板边界框 =====
    graph.addNode({
      id: '__block-boundary__',
      x: 0,
      y: 0,
      width: CANVAS_WIDTH_PX,
      height: CANVAS_HEIGHT_PX,
      shape: 'rect',
      attrs: {
        body: {
          fill: '#ffffff',
          stroke: '#999999',
          strokeWidth: 1,
          rx: 0,
          ry: 0,
        },
        label: {
          text: `${CANVAS_WIDTH_PX} × ${CANVAS_HEIGHT_PX} px`,
          fill: '#b0b0b0',
          fontSize: 10,
          refX: 0.5,
          refY: -10,
          textAnchor: 'middle',
        },
      },
      selectable: false,
      movable: false,
      resizable: false,
      rotatable: false,
    });

    // ===== 绘制标尺刻度线 =====
    // 水平标尺（顶部，每50px一个刻度）
    for (let x = 0; x <= CANVAS_WIDTH_PX; x += 50) {
      const isMajor = x % 100 === 0;
      graph.addEdge({
        source: { x, y: 0 },
        target: { x, y: isMajor ? -8 : -4 },
        attrs: { line: { stroke: '#999', strokeWidth: 0.8 } },
        selectable: false,
      });
      if (isMajor) {
        graph.addNode({
          shape: 'rect',
          x: x - 15,
          y: -22,
          width: 30,
          height: 14,
          attrs: {
            body: { fill: 'transparent', stroke: 'transparent', strokeWidth: 0 },
            label: { text: `${x}`, fill: '#999', fontSize: 8, textAnchor: 'middle' },
          },
          selectable: false,
          movable: false,
        });
      }
    }

    // 垂直标尺（左侧，每50px一个刻度）
    for (let y = 0; y <= CANVAS_HEIGHT_PX; y += 50) {
      const isMajor = y % 100 === 0;
      graph.addEdge({
        source: { x: 0, y },
        target: { x: isMajor ? -8 : -4, y },
        attrs: { line: { stroke: '#999', strokeWidth: 0.8 } },
        selectable: false,
      });
      if (isMajor) {
        graph.addNode({
          shape: 'rect',
          x: -30,
          y: y - 7,
          width: 24,
          height: 14,
          attrs: {
            body: { fill: 'transparent', stroke: 'transparent', strokeWidth: 0 },
            label: { text: `${y}`, fill: '#999', fontSize: 8, textAnchor: 'end' },
          },
          selectable: false,
          movable: false,
        });
      }
    }

    // 初始缩放：将块模板画布适配到容器
    const scaleX = (containerWidth - 100) / CANVAS_WIDTH_PX;
    const scaleY = (containerHeight - 80) / CANVAS_HEIGHT_PX;
    const initialScale = Math.min(scaleX, scaleY, 2);
    const offsetX = (containerWidth - CANVAS_WIDTH_PX * initialScale) / 2;
    const offsetY = (containerHeight - CANVAS_HEIGHT_PX * initialScale) / 2 + 10;
    graph.translate(offsetX, offsetY);
    graph.scale(initialScale, initialScale);
    setZoom(initialScale);

    graphRef.current = graph;

    // ===== 事件监听 =====

    // 节点移动 — 同步位置到 state
    graph.on('node:moved', ({ node }) => {
      const meta = node.getData() as CanvasNodeMeta | undefined;
      if (!meta) return;
      const pos = node.getPosition();
      const size = node.getSize();
      if (meta.type === 'decoration') {
        setDecorations((prev) =>
          prev.map((d) =>
            d.id === node.id
              ? { ...d, x: pos.x, y: pos.y, width: size.width, height: size.height }
              : d,
          ),
        );
      } else if (meta.type === 'field') {
        node.setData({ ...meta, x: pos.x, y: pos.y, width: size.width, height: size.height }, { overwrite: true });
      }
    });

    // 节点缩放
    graph.on('node:resized', ({ node }) => {
      const meta = node.getData() as CanvasNodeMeta | undefined;
      if (!meta) return;
      const pos = node.getPosition();
      const size = node.getSize();
      if (meta.type === 'decoration') {
        setDecorations((prev) =>
          prev.map((d) =>
            d.id === node.id
              ? { ...d, x: pos.x, y: pos.y, width: size.width, height: size.height }
              : d,
          ),
        );
      } else if (meta.type === 'field') {
        node.setData({ ...meta, x: pos.x, y: pos.y, width: size.width, height: size.height }, { overwrite: true });
      }
    });

    // 节点旋转
    graph.on('node:rotated', ({ node }) => {
      const meta = node.getData() as CanvasNodeMeta | undefined;
      if (!meta) return;
      const angle = node.getAngle();
      if (meta.type === 'decoration') {
        setDecorations((prev) =>
          prev.map((d) => (d.id === node.id ? { ...d, rotation: angle } : d)),
        );
      }
    });

    // 节点点击 — 选中
    graph.on('node:click', ({ node }) => {
      const meta = node.getData() as CanvasNodeMeta | undefined;
      if (!meta) return;

      if (meta.type === 'decoration') {
        setSelectedDecoId(node.id);
        setSelectedFieldId(null);
        setSelectedNodeType('decoration');
      } else if (meta.type === 'field' && meta.fieldId) {
        setSelectedFieldId(meta.fieldId);
        setSelectedDecoId(null);
        setSelectedNodeType('field');
      }
    });

    // 画布空白处点击 — 取消选中
    graph.on('blank:click', () => {
      setSelectedDecoId(null);
      setSelectedFieldId(null);
      setSelectedNodeType(null);
    });

    // 缩放事件
    graph.on('scale', ({ sx }) => {
      setZoom(sx);
    });

    return () => {
      graph.dispose();
      graphRef.current = null;
      dndRef.current = null;
    };
  }, []);

  // ========== 缩放控制 ==========
  const handleZoomIn = () => {
    const graph = graphRef.current;
    if (!graph) return;
    const currentZoom = graph.zoom();
    const newZoom = Math.min(currentZoom + 0.1, 3);
    graph.zoomTo(newZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const graph = graphRef.current;
    if (!graph) return;
    const currentZoom = graph.zoom();
    const newZoom = Math.max(currentZoom - 0.1, 0.2);
    graph.zoomTo(newZoom);
    setZoom(newZoom);
  };

  const handleZoomReset = () => {
    const graph = graphRef.current;
    if (!graph) return;
    const container = containerRef.current;
    if (!container) return;
    const scaleX = (container.clientWidth - 100) / CANVAS_WIDTH_PX;
    const scaleY = (container.clientHeight - 80) / CANVAS_HEIGHT_PX;
    const scale = Math.min(scaleX, scaleY, 2);
    graph.zoomTo(scale);
    graph.positionContent('center');
    setZoom(scale);
  };

  // ========== 创建装饰节点（用于 Dnd 拖拽） ==========
  const createDecoStartNode = useCallback((def: DecorationDefinition) => {
    const isDashed = def.id.includes('dashed');
    return graphRef.current!.createNode({
      width: def.defaultWidth,
      height: def.defaultHeight,
      shape: 'deco-shape',
      data: {
        type: 'decoration',
        decorationId: def.id,
      } as CanvasNodeMeta,
      attrs: {
        body: {
          d: def.svgPath,
          fill: def.defaultColor,
          stroke: def.defaultStrokeColor,
          strokeWidth: def.defaultStrokeWidth,
          opacity: def.defaultOpacity,
          strokeDasharray: isDashed ? '5,3' : undefined,
        },
      },
    });
  }, []);

  // ========== 创建字段节点（用于 Dnd 拖拽） ==========
  const createFieldStartNode = useCallback((field: FieldDefinition) => {
    const typeIcon = FIELD_TYPE_ICONS[field.type] || '•';
    return graphRef.current!.createNode({
      width: 140,
      height: 28,
      shape: 'field-shape',
      label: `${typeIcon} ${field.name}`,
      data: {
        type: 'field',
        fieldId: field.id,
      } as CanvasNodeMeta,
    });
  }, []);

  // ========== 装饰图形拖拽开始 ==========
  const handleDecoDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>, def: DecorationDefinition) => {
    const graph = graphRef.current;
    const dnd = dndRef.current;
    if (!graph || !dnd) return;

    const node = createDecoStartNode(def);
    dnd.start(node, e.nativeEvent as any);

    // 在节点放入画布后同步 state（延迟获取 node id）
    setTimeout(() => {
      const nodes = graph.getNodes();
      const lastNode = nodes[nodes.length - 1];
      if (lastNode && lastNode.shape === 'deco-shape') {
        const meta = lastNode.getData() as CanvasNodeMeta | undefined;
        if (meta?.type === 'decoration') {
          const pos = lastNode.getPosition();
          const size = lastNode.getSize();
          const decoId = lastNode.id;
          setDecorations((prev) => {
            // 避免重复添加
            if (prev.find((d) => d.id === decoId)) return prev;
            const newDeco: DecorationElement = {
              id: decoId,
              decorationId: def.id,
              x: pos.x,
              y: pos.y,
              width: size.width,
              height: size.height,
              rotation: 0,
              color: def.defaultColor,
              strokeColor: def.defaultStrokeColor,
              strokeWidth: def.defaultStrokeWidth,
              opacity: def.defaultOpacity,
              zIndex: prev.length,
            };
            return [...prev, newDeco];
          });
          setSelectedDecoId(decoId);
          setSelectedFieldId(null);
          setSelectedNodeType('decoration');
        }
      }
    }, 100);
  }, [createDecoStartNode]);

  // ========== 字段拖拽开始 ==========
  const handleFieldDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>, field: FieldDefinition) => {
    const graph = graphRef.current;
    const dnd = dndRef.current;
    if (!graph || !dnd) return;

    // 检查该字段是否已在画布中
    const existingNodes = graph.getNodes();
    const alreadyOnCanvas = existingNodes.find((n) => {
      const meta = n.getData() as CanvasNodeMeta | undefined;
      return meta?.type === 'field' && meta?.fieldId === field.id;
    });
    if (alreadyOnCanvas) {
      message.info('该字段已在画布中');
      return;
    }

    const node = createFieldStartNode(field);
    dnd.start(node, e.nativeEvent as any);

    // Dnd 放入后更新画布上字段节点的 id 以便后续查找
    setTimeout(() => {
      const nodes = graph.getNodes();
      const lastNode = nodes[nodes.length - 1];
      if (lastNode && lastNode.shape === 'field-shape') {
        const meta = lastNode.getData() as CanvasNodeMeta | undefined;
        if (meta?.type === 'field') {
          // 将节点 id 设为 canvas-field-{fieldId} 格式，便于后续查找
          // 注意：X6 不支持直接改 id，通过在 data 中标记即可
        }
      }
    }, 100);

    setSelectedFieldId(field.id);
    setSelectedDecoId(null);
    setSelectedNodeType('field');
  }, [createFieldStartNode]);

  // ========== 删除选中的节点 ==========
  const handleDeleteSelected = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (selectedDecoId) {
      const cell = graph.getCellById(selectedDecoId);
      if (cell) graph.removeCell(cell);
      setDecorations((prev) => prev.filter((d) => d.id !== selectedDecoId));
      setSelectedDecoId(null);
      setSelectedNodeType(null);
    } else if (selectedFieldId) {
      const node = getFieldNode(selectedFieldId);
      if (node) graph.removeCell(node);
      setSelectedFieldId(null);
      setSelectedNodeType(null);
    }
  }, [selectedDecoId, selectedFieldId]);

  // ========== 更新装饰元素属性 ==========
  const handleUpdateDecoProp = useCallback((prop: string, value: number | string) => {
    if (!selectedDecoId) return;
    const graph = graphRef.current;
    if (!graph) return;

    const node = graph.getCellById(selectedDecoId);
    if (!node) return;

    switch (prop) {
      case 'color':
        node.attr('body/fill', value);
        break;
      case 'strokeColor':
        node.attr('body/stroke', value);
        break;
      case 'strokeWidth':
        node.attr('body/strokeWidth', value);
        break;
      case 'opacity':
        node.attr('body/opacity', value);
        break;
    }

    setDecorations((prev) =>
      prev.map((d) => (d.id === selectedDecoId ? { ...d, [prop]: value } : d)),
    );
  }, [selectedDecoId]);

  // ========== 字段管理 ==========
  const handleAddField = () => {
    const newField: FieldDefinition = {
      id: `field-${uuid().slice(0, 8)}`,
      name: '新字段',
      type: FieldType.Text,
      order: fields.length,
      defaultValue: '',
      required: false,
      placeholder: '',
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setSelectedNodeType('field');
  };

  const handleRemoveField = (fieldId: string) => {
    // 同时从画布中移除
    const node = getFieldNode(fieldId);
    if (node) {
      const graph = graphRef.current;
      graph?.removeCell(node);
    }
    setFields((prev) => prev.filter((f) => f.id !== fieldId).map((f, i) => ({ ...f, order: i })));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
      setSelectedNodeType(null);
    }
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FieldDefinition>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    );

    // 如果字段在画布中，更新画布上的标签
    const node = getFieldNode(fieldId);
    if (node) {
      const updatedFields = fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f));
      const field = updatedFields.find((f) => f.id === fieldId);
      if (field) {
        const typeIcon = FIELD_TYPE_ICONS[field.type] || '•';
        node.prop('attrs/label/text', `${typeIcon} ${field.name}`);
      }
    }
  };

  // ========== 保存模板 ==========
  const handleSave = () => {
    if (!templateName.trim()) {
      message.warning('请输入模板名称');
      return;
    }
    if (fields.length === 0 && decorations.length === 0) {
      message.warning('请至少添加一个字段或装饰元素');
      return;
    }

    addBlockTemplate({
      name: templateName.trim(),
      category: templateCategory,
      fields,
      isPreset: false,
    });

    message.success('模板创建成功！');
    navigate(-1);
  };

  // 选中的装饰元素
  const selectedDeco = decorations.find((d) => d.id === selectedDecoId);

  // 选中的字段
  const selectedField = fields.find((f) => f.id === selectedFieldId);

  // 装饰图形按分类分组
  const groupedDecorations: Record<string, DecorationDefinition[]> = {};
  presetDecorations.forEach((d) => {
    const cat = d.category;
    if (!groupedDecorations[cat]) groupedDecorations[cat] = [];
    groupedDecorations[cat].push(d);
  });

  const categoryIcons: Record<string, React.ReactNode> = {
    '几何': <BorderOutlined />,
    '线条': <LineOutlined />,
    '标签': <TagOutlined />,
  };

  // 字段是否在画布中 — 通过遍历节点的 data.fieldId 判断
  const isFieldOnCanvas = (fieldId: string) => {
    const graph = graphRef.current;
    if (!graph) return false;
    return graph.getNodes().some((n) => {
      const meta = n.getData() as CanvasNodeMeta | undefined;
      return meta?.type === 'field' && meta?.fieldId === fieldId;
    });
  };

  // 通过 fieldId 获取画布上的节点
  const getFieldNode = (fieldId: string) => {
    const graph = graphRef.current;
    if (!graph) return null;
    return graph.getNodes().find((n) => {
      const meta = n.getData() as CanvasNodeMeta | undefined;
      return meta?.type === 'field' && meta?.fieldId === fieldId;
    }) || null;
  };

  return (
    <div className="template-builder">
      {/* 顶部工具栏 */}
      <div className="template-builder-toolbar">
        <div className="template-builder-toolbar-left">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回
          </Button>
          <Divider type="vertical" />
          <Input
            placeholder="输入模板名称"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            style={{ width: 200 }}
            size="small"
          />
          <Select
            value={templateCategory}
            onChange={setTemplateCategory}
            options={CATEGORY_OPTIONS}
            style={{ width: 120 }}
            size="small"
          />
        </div>
        <div className="template-builder-toolbar-center">
          <Tooltip title="缩小">
            <Button type="text" size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
          </Tooltip>
          <span className="template-builder-zoom-label" onClick={handleZoomReset}>
            {Math.round(zoom * 100)}%
          </span>
          <Tooltip title="放大">
            <Button type="text" size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
          </Tooltip>
        </div>
        <div className="template-builder-toolbar-right">
          <Tooltip title="撤销">
            <Button type="text" size="small" onClick={() => graphRef.current?.undo()}>
              撤销
            </Button>
          </Tooltip>
          <Tooltip title="重做">
            <Button type="text" size="small" onClick={() => graphRef.current?.redo()}>
              重做
            </Button>
          </Tooltip>
          <Divider type="vertical" />
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存模板
          </Button>
        </div>
      </div>

      <div className="template-builder-body">
        {/* 左侧：装饰图形 + 字段面板 */}
        <div className="template-builder-left">
          {/* 装饰图形区 */}
          <div className="template-builder-section-title">
            <FormatPainterOutlined /> 装饰图形
          </div>
          <div className="template-builder-deco-hint">
            拖拽图形到画布
          </div>
          <div className="template-builder-deco-list">
            {Object.entries(groupedDecorations).map(([cat, decos]) => (
              <div key={cat} className="template-builder-deco-group">
                <div className="template-builder-deco-group-label">
                  {categoryIcons[cat]} {cat}
                </div>
                <div className="template-builder-deco-items">
                  {decos.map((def) => (
                    <div
                      key={def.id}
                      className="template-builder-deco-item template-builder-draggable"
                      onMouseDown={(e) => handleDecoDragStart(e, def)}
                      title={`拖拽 ${def.name} 到画布`}
                    >
                      <svg
                        viewBox="0 0 100 100"
                        width="32"
                        height="32"
                        style={{ display: 'block', pointerEvents: 'none' }}
                      >
                        <path
                          d={def.svgPath}
                          fill={def.defaultColor === 'transparent' ? 'none' : def.defaultColor}
                          stroke={def.defaultStrokeColor === 'transparent' ? 'none' : def.defaultStrokeColor}
                          strokeWidth={def.defaultStrokeWidth * 3}
                          opacity={def.defaultOpacity}
                        />
                      </svg>
                      <span className="template-builder-deco-item-name">{def.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 字段列表区 */}
          <Divider style={{ margin: '8px 0' }} />
          <div className="template-builder-section-title">
            <AppstoreOutlined /> 字段列表
          </div>
          <div className="template-builder-deco-hint">
            拖拽字段到画布
          </div>
          <div className="template-builder-fields-list">
            {fields.map((field) => {
              const onCanvas = isFieldOnCanvas(field.id);
              return (
                <div
                  key={field.id}
                  className={`template-builder-field-item ${selectedFieldId === field.id ? 'selected' : ''} ${onCanvas ? 'on-canvas' : ''}`}
                >
                  <div
                    className={`template-builder-field-info ${!onCanvas ? 'template-builder-draggable' : ''}`}
                    onMouseDown={onCanvas ? undefined : (e) => handleFieldDragStart(e, field)}
                    onClick={() => {
                      setSelectedFieldId(field.id);
                      setSelectedDecoId(null);
                      setSelectedNodeType('field');
                    }}
                  >
                    <Tag color="blue" style={{ marginRight: 4, fontSize: 10, pointerEvents: 'none' }}>
                      {FIELD_TYPE_OPTIONS.find((o) => o.value === field.type)?.label || field.type}
                    </Tag>
                    <span className="template-builder-field-name">{field.name}</span>
                  </div>
                  <div className="template-builder-field-actions">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => { e.stopPropagation(); handleRemoveField(field.id); }}
                      className="template-builder-field-delete"
                    />
                  </div>
                </div>
              );
            })}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddField}
              size="small"
              block
            >
              添加字段
            </Button>
          </div>
        </div>

        {/* 中间：X6 画布 */}
        <div className="template-builder-canvas">
          <div ref={containerRef} className="template-builder-x6-container" />
          {decorations.length === 0 && fields.length === 0 && (
            <div className="template-builder-canvas-empty">
              <StarOutlined style={{ fontSize: 32, color: '#d0d0d0' }} />
              <p>拖拽左侧装饰图形或字段到画布</p>
              <p style={{ fontSize: 11, color: '#ccc' }}>
                画布尺寸 {CANVAS_WIDTH_PX}×{CANVAS_HEIGHT_PX} px
              </p>
            </div>
          )}
        </div>

        {/* 右侧：属性面板 */}
        <div className="template-builder-right">
          {selectedDeco ? (
            <>
              <div className="template-builder-section-title">
                <FormatPainterOutlined /> 装饰属性
              </div>
              <div className="template-builder-prop-group">
                <label>填充颜色</label>
                <ColorPicker
                  value={selectedDeco.color === 'transparent' ? '#ffffff' : selectedDeco.color}
                  onChange={(_, hex) => handleUpdateDecoProp('color', hex)}
                  size="small"
                />
              </div>
              <div className="template-builder-prop-group">
                <label>描边颜色</label>
                <ColorPicker
                  value={selectedDeco.strokeColor === 'transparent' ? '#ffffff' : selectedDeco.strokeColor}
                  onChange={(_, hex) => handleUpdateDecoProp('strokeColor', hex)}
                  size="small"
                />
              </div>
              <div className="template-builder-prop-group">
                <label>描边宽度</label>
                <Slider
                  min={0}
                  max={8}
                  step={0.5}
                  value={selectedDeco.strokeWidth}
                  onChange={(v) => handleUpdateDecoProp('strokeWidth', v)}
                  size="small"
                />
              </div>
              <div className="template-builder-prop-group">
                <label>透明度</label>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedDeco.opacity}
                  onChange={(v) => handleUpdateDecoProp('opacity', v)}
                  size="small"
                />
              </div>
              <div className="template-builder-prop-group">
                <label>尺寸 (px)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    size="small"
                    value={Math.round(selectedDeco.width)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      const node = graphRef.current?.getCellById(selectedDeco.id);
                      node?.resize(v, selectedDeco.height);
                      handleUpdateDecoProp('width', v);
                    }}
                    addonBefore="W"
                    type="number"
                  />
                  <Input
                    size="small"
                    value={Math.round(selectedDeco.height)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      const node = graphRef.current?.getCellById(selectedDeco.id);
                      node?.resize(selectedDeco.width, v);
                      handleUpdateDecoProp('height', v);
                    }}
                    addonBefore="H"
                    type="number"
                  />
                </div>
              </div>
              <div className="template-builder-prop-group">
                <label>位置 (px)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    size="small"
                    value={Math.round(selectedDeco.x)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      const node = graphRef.current?.getCellById(selectedDeco.id);
                      node?.setPosition(v, selectedDeco.y);
                      handleUpdateDecoProp('x', v);
                    }}
                    addonBefore="X"
                    type="number"
                  />
                  <Input
                    size="small"
                    value={Math.round(selectedDeco.y)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      const node = graphRef.current?.getCellById(selectedDeco.id);
                      node?.setPosition(selectedDeco.x, v);
                      handleUpdateDecoProp('y', v);
                    }}
                    addonBefore="Y"
                    type="number"
                  />
                </div>
              </div>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDeleteSelected}
                size="small"
                block
              >
                删除装饰
              </Button>
            </>
          ) : selectedField ? (
            <>
              <div className="template-builder-section-title">
                <AppstoreOutlined /> 字段属性
              </div>
              <div className="template-builder-prop-group">
                <label>字段名称</label>
                <Input
                  value={selectedField.name}
                  onChange={(e) => handleUpdateField(selectedField.id, { name: e.target.value })}
                  size="small"
                />
              </div>
              <div className="template-builder-prop-group">
                <label>字段类型</label>
                <Select
                  value={selectedField.type}
                  onChange={(v) => handleUpdateField(selectedField.id, { type: v })}
                  options={FIELD_TYPE_OPTIONS}
                  size="small"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="template-builder-prop-group">
                <label>占位提示</label>
                <Input
                  value={selectedField.placeholder}
                  onChange={(e) => handleUpdateField(selectedField.id, { placeholder: e.target.value })}
                  size="small"
                />
              </div>
              <div className="template-builder-prop-group">
                <label>默认值</label>
                <Input
                  value={selectedField.defaultValue}
                  onChange={(e) => handleUpdateField(selectedField.id, { defaultValue: e.target.value })}
                  size="small"
                />
              </div>
              <div className="template-builder-prop-group">
                <label>选项列表（逗号分隔，仅 Select 类型）</label>
                <Input
                  value={selectedField.options?.join(',') || ''}
                  onChange={(e) =>
                    handleUpdateField(selectedField.id, {
                      options: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined,
                    })
                  }
                  size="small"
                  disabled={selectedField.type !== FieldType.Select}
                />
              </div>
              <Divider style={{ margin: '8px 0' }} />
              {!isFieldOnCanvas(selectedField.id) ? (
                <div className="template-builder-prop-hint">
                  拖拽此字段到画布中放置
                </div>
              ) : (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteSelected}
                  size="small"
                  block
                >
                  从画布移除
                </Button>
              )}
            </>
          ) : (
            <div className="template-builder-right-empty">
              <p>选中画布上的装饰元素或字段节点，编辑其属性</p>
              <p style={{ fontSize: 11, color: '#bbb', marginTop: 8 }}>
                提示：拖拽左侧装饰图形到画布放置；<br/>
                字段需先创建，再拖拽到画布<br/>
                选中节点后可拉伸调整大小
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Collapse, Tag, Button, Tooltip, Empty, Popconfirm, Tabs } from 'antd';
import {
  SearchOutlined,
  AppstoreOutlined,
  HolderOutlined,
  GroupOutlined,
  StarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { useDragPreview } from '@/hooks/useDragPreview';
import { buildDecoPathD } from '@/utils/geometry';
import { ICON_CATEGORIES, renderIconByName } from '@/utils/iconMap';
import LayerDrawer from '@/components/LayerDrawer';
import './index.less';

/**
 * 左侧面板 —— 组件面板 + 图标面板 + 装饰面板
 * 上方：可折叠的组件模板面板
 * 中间：基础图标面板
 * 下方：自定义装饰面板
 */
export default function LeftPanel() {
  const navigate = useNavigate();
  const { resume, blockTemplates, customElementTemplates, customDecorations, editor, removeCustomDecoration } = useResumeStore();
  const [searchText, setSearchText] = useState('');
  const [iconSearchText, setIconSearchText] = useState('');
  const [layerCollapsed, setLayerCollapsed] = useState(false);
  // 各分区收起/展开状态
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setSectionCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // 拖拽预览 Hook
  const {
    handleBlockDragStart,
    handleCustomDragStart,
    handleGroupDragStart,
    handleDecorationDragStart,
    handleDragEnd,
  } = useDragPreview({
    blockTemplates,
    customElementTemplates,
    customDecorations,
    blocks: resume?.blocks || [],
    groups: resume?.groups || [],
    colorScheme: resume?.colorScheme,
  });

  // 搜索过滤图标
  const filteredIconCategories = useMemo(() => {
    if (!iconSearchText.trim()) return ICON_CATEGORIES;
    const lower = iconSearchText.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [cat, names] of Object.entries(ICON_CATEGORIES)) {
      const matched = names.filter(
        (n) => n.toLowerCase().includes(lower) || n.replace(/Outlined$|Filled$|TwoTone$/g, '').toLowerCase().includes(lower),
      );
      if (matched.length > 0) {
        result[cat] = matched;
      }
    }
    return result;
  }, [iconSearchText]);

  // 图标拖拽开始
  const handleIconDragStart = useCallback((e: React.DragEvent, iconName: string) => {
    e.dataTransfer.setData('antdIconName', iconName);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  if (!resume) return null;

  const { colorScheme } = resume;

  // 过滤模板
  const filteredTemplates = blockTemplates.filter((t) =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.category.toLowerCase().includes(searchText.toLowerCase())
  );

  // 分类排序顺序
  const CATEGORY_ORDER = ['基础组件', '组合组件'];
  const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    '基础组件': <AppstoreOutlined />,
    '组合组件': <GroupOutlined />,
  };

  // 按分类分组
  const groupedTemplates: Record<string, typeof blockTemplates> = {};
  filteredTemplates.forEach((t) => {
    const cat = t.category || '其他';
    if (!groupedTemplates[cat]) groupedTemplates[cat] = [];
    groupedTemplates[cat].push(t);
  });

  // 按预定义顺序排序分类
  const sortedCategories = Object.keys(groupedTemplates).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

// 拖拽逻辑已抽取到 useDragPreview Hook

  // 块模板折叠面板
  const templateItems = sortedCategories.map((category) => {
    const templates = groupedTemplates[category];
    return {
      key: `tpl-${category}`,
      label: (
        <div className="left-panel-category-label">
          {CATEGORY_ICONS[category] || <AppstoreOutlined />}
          <span>{category}</span>
          <Tag className="left-panel-category-count">{templates.length}</Tag>
        </div>
      ),
      children: (
        <div className="left-panel-template-list">
          {templates.map((template) => (
            <div
              key={template.id}
              className="left-panel-template-item"
              draggable
              onDragStart={(e) => handleBlockDragStart(e, template.id)}
              onDragEnd={handleDragEnd}
            >
              <HolderOutlined className="left-panel-template-drag-icon" />
              <div className="left-panel-template-info">
                <span className="left-panel-template-name">{template.name}</span>
                <span className="left-panel-template-fields">
                  {template.fields.length} 字段
                </span>
              </div>
            </div>
          ))}
        </div>
      ),
    };
  });

  // 自定义元素面板
  const customItems = customElementTemplates.length > 0 ? [{
    key: 'custom-elements',
    label: (
      <div className="left-panel-category-label">
        <StarOutlined />
        <span>自定义元素</span>
        <Tag className="left-panel-category-count">{customElementTemplates.length}</Tag>
      </div>
    ),
    children: (
      <div className="left-panel-template-list">
        {customElementTemplates.map((template) => (
          <div
            key={template.id}
            className="left-panel-template-item custom-element-item"
            draggable
            onDragStart={(e) => handleCustomDragStart(e, template.id)}
            onDragEnd={handleDragEnd}
          >
            <HolderOutlined className="left-panel-template-drag-icon" />
            <div className="left-panel-template-info">
              <span className="left-panel-template-name">{template.name}</span>
              <span className="left-panel-template-fields">
                {template.blocks.length} 块
              </span>
            </div>
          </div>
        ))}
      </div>
    ),
  }] : [];

  // 分组面板
  const groupItems = resume.groups.length > 0 ? [{
    key: 'groups',
    label: (
      <div className="left-panel-category-label">
        <GroupOutlined />
        <span>分组</span>
        <Tag className="left-panel-category-count">{resume.groups.length}</Tag>
      </div>
    ),
    children: (
      <div className="left-panel-template-list">
        {resume.groups.map((group) => (
          <div
            key={group.id}
            className="left-panel-template-item group-item"
            draggable
            onDragStart={(e) => handleGroupDragStart(e, group.id)}
            onDragEnd={handleDragEnd}
          >
            <GroupOutlined className="left-panel-template-drag-icon" />
            <div className="left-panel-template-info">
              <span className="left-panel-template-name">{group.name}</span>
              <span className="left-panel-template-fields">
                {group.blockIds.length} 块
              </span>
            </div>
          </div>
        ))}
      </div>
    ),
  }] : [];

  const allItems = [...templateItems, ...customItems, ...groupItems];

  return (
    <div className="left-panel-wrapper" style={{ width: editor.leftPanelWidth }}>
    <div className="left-panel">
      {/* 组件面板 */}
      <div className={`left-panel-components ${sectionCollapsed['component'] ? 'left-panel-components--collapsed' : ''}`}>
        <div className="left-panel-section-header left-panel-section-header--component" onClick={() => toggleSection('component')}>
          <AppstoreOutlined />
          <span>组件</span>
          <Button
            type="text"
            size="small"
            icon={sectionCollapsed['component'] ? <PlusOutlined /> : <MinusOutlined />}
            className="left-panel-section-toggle"
            onClick={(e) => { e.stopPropagation(); toggleSection('component'); }}
          />
        </div>

        {/* 搜索 */}
        {!sectionCollapsed['component'] && (
        <div className="left-panel-search">
          <Input
            placeholder="搜索块模板..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            size="small"
          />
        </div>
        )}

        {/* 块模板列表 */}
        {!sectionCollapsed['component'] && (
        <div className="left-panel-templates">
          {allItems.length > 0 ? (
            <Collapse
              ghost
              size="small"
              defaultActiveKey={allItems.map(item => item.key)}
              items={allItems}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="没有匹配的模板"
            />
          )}
        </div>
        )}
      </div>

      {/* 图标面板 */}
      <div className={`left-panel-icons ${sectionCollapsed['icon'] ? 'left-panel-icons--collapsed' : ''}`}>
        <div className="left-panel-section-header left-panel-section-header--icon" onClick={() => toggleSection('icon')}>
          <StarOutlined />
          <span>基础图标</span>
          <Tag className="left-panel-category-count left-panel-category-count--icon">
            {Object.values(ICON_CATEGORIES).flat().length}
          </Tag>
          <Button
            type="text"
            size="small"
            icon={sectionCollapsed['icon'] ? <PlusOutlined /> : <MinusOutlined />}
            className="left-panel-section-toggle"
            onClick={(e) => { e.stopPropagation(); toggleSection('icon'); }}
          />
        </div>

        {!sectionCollapsed['icon'] && (<>
        <div className="left-panel-icon-search">
          <Input
            placeholder="搜索图标..."
            prefix={<SearchOutlined />}
            value={iconSearchText}
            onChange={(e) => setIconSearchText(e.target.value)}
            allowClear
            size="small"
          />
        </div>

        <div className="left-panel-icon-list">
          {iconSearchText.trim() ? (
            <div className="left-panel-icon-grid">
              {Object.values(filteredIconCategories).flat().map((iconName) => (
                <div
                  key={iconName}
                  className="left-panel-icon-item"
                  title={iconName}
                  draggable
                  onDragStart={(e) => handleIconDragStart(e, iconName)}
                  onDragEnd={handleDragEnd}
                >
                  {renderIconByName(iconName, { style: { fontSize: 18 } })}
                  <span className="left-panel-icon-item-label">
                    {iconName.replace(/Outlined$|Filled$|TwoTone$/g, '')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Tabs
              size="small"
              items={Object.entries(ICON_CATEGORIES).map(([cat, names]) => ({
                key: cat,
                label: cat,
                children: (
                  <div className="left-panel-icon-grid">
                    {names.map((iconName) => (
                      <div
                        key={iconName}
                        className="left-panel-icon-item"
                        title={iconName}
                        draggable
                        onDragStart={(e) => handleIconDragStart(e, iconName)}
                        onDragEnd={handleDragEnd}
                      >
                        {renderIconByName(iconName, { style: { fontSize: 18 } })}
                        <span className="left-panel-icon-item-label">
                          {iconName.replace(/Outlined$|Filled$|TwoTone$/g, '')}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
              }))}
              className="left-panel-icon-tabs"
            />
          )}
        </div>
        </>)}
      </div>

      {/* 自定义装饰面板 */}
      <div className={`left-panel-decorations ${sectionCollapsed['decoration'] ? 'left-panel-decorations--collapsed' : ''}`}>
        <div className="left-panel-section-header left-panel-section-header--deco" onClick={() => toggleSection('decoration')}>
          <StarOutlined />
          <span>自定义装饰</span>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            className="left-panel-section-header-action"
            onClick={(e) => { e.stopPropagation(); navigate('/decoration-editor'); }}
          >
            新建
          </Button>
          <Button
            type="text"
            size="small"
            icon={sectionCollapsed['decoration'] ? <PlusOutlined /> : <MinusOutlined />}
            className="left-panel-section-toggle"
            onClick={(e) => { e.stopPropagation(); toggleSection('decoration'); }}
          />
        </div>

        {!sectionCollapsed['decoration'] && (
        <div className="left-panel-deco-list">
          {customDecorations.length > 0 ? (
            <div className="left-panel-template-list">
              {customDecorations.map((deco) => (
                <div
                  key={deco.id}
                  className="left-panel-template-item decoration-item"
                  draggable
                  onDragStart={(e) => handleDecorationDragStart(e, deco.id)}
                  onDragEnd={handleDragEnd}
                >
                  <svg width="22" height="22" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                    {deco.paths.map((p, pIdx) => (
                      <g key={pIdx}>
                        {p.clipRect && (
                          <defs>
                            <clipPath id={`lp-clip-${deco.id}-${pIdx}`}>
                              <rect x={p.clipRect.x} y={p.clipRect.y} width={p.clipRect.width} height={p.clipRect.height} />
                            </clipPath>
                          </defs>
                        )}
                        <g clipPath={p.clipRect ? `url(#lp-clip-${deco.id}-${pIdx})` : undefined}>
                          {p.isClosed && (
                            <path
                              d={buildDecoPathD(p.anchors, p.isClosed)}
                              fill={p.fillColor}
                              stroke="none"
                            />
                          )}
                          <path
                            d={buildDecoPathD(p.anchors, p.isClosed)}
                            fill="none"
                            stroke={p.strokeColor}
                            strokeWidth={3}
                          />
                        </g>
                      </g>
                    ))}
                  </svg>
                  <div className="left-panel-template-info">
                    <span className="left-panel-template-name">{deco.name}</span>
                    <span className="left-panel-template-fields">
                      {deco.paths.length} 路径 · {deco.paths.reduce((sum, p) => sum + p.anchors.length, 0)} 锚点
                    </span>
                  </div>
                  <div className="left-panel-item-actions">
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        className="left-panel-item-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/decoration-editor?id=${deco.id}`);
                        }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="确定删除该装饰？"
                      onConfirm={() => removeCustomDecoration(deco.id)}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        className="left-panel-item-action-btn left-panel-item-action-btn--danger"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="left-panel-empty-hint">
              暂无自定义装饰<br />点击上方"新建"按钮创建
            </div>
          )}
        </div>
        )}
      </div>
    </div>
      {/* 舞台图层面板 - 使用 position:absolute 定位到左侧面板右侧 */}
      <LayerDrawer collapsed={layerCollapsed} onToggle={() => setLayerCollapsed(!layerCollapsed)} />
    </div>
  );
}

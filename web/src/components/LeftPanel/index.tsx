import { useState } from 'react';
import { Input, Collapse, Tag } from 'antd';
import {
  SearchOutlined,
  AppstoreOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import './index.less';

/**
 * 左侧面板 —— 块模板拖拽面板
 * 从这里拖出块模板到编辑区
 */
export default function LeftPanel() {
  const { resume, blockTemplates, editor } = useResumeStore();
  const [searchText, setSearchText] = useState('');

  if (!resume) return null;

  const filteredTemplates = blockTemplates.filter((t) =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.category.toLowerCase().includes(searchText.toLowerCase())
  );

  // 按分类分组
  const groupedTemplates: Record<string, typeof blockTemplates> = {};
  filteredTemplates.forEach((t) => {
    const cat = t.category || '其他';
    if (!groupedTemplates[cat]) groupedTemplates[cat] = [];
    groupedTemplates[cat].push(t);
  });

  const handleDragStart = (e: React.DragEvent, templateId: string) => {
    e.dataTransfer.setData('templateId', templateId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const collapseItems = Object.entries(groupedTemplates).map(([category, templates]) => ({
    key: category,
    label: (
      <div className="left-panel-category-label">
        <AppstoreOutlined />
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
            onDragStart={(e) => handleDragStart(e, template.id)}
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
  }));

  return (
    <div className="left-panel" style={{ width: editor.leftPanelWidth }}>
      {/* 搜索 */}
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

      {/* 提示 */}
      <div className="left-panel-hint">
        拖拽模板到编辑区放置
      </div>

      {/* 块模板列表 */}
      <div className="left-panel-templates">
        <Collapse
          ghost
          size="small"
          defaultActiveKey={Object.keys(groupedTemplates)}
          items={collapseItems}
        />
      </div>
    </div>
  );
}

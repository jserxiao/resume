import { useState, useRef } from 'react';
import { Input, Collapse, Tag, Button, Tooltip, Empty, Modal } from 'antd';
import {
  SearchOutlined,
  AppstoreOutlined,
  HolderOutlined,
  SaveOutlined,
  GroupOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { createBlockDragPreview, createCustomElementDragPreview, createGroupDragPreview, cleanupDragPreview } from '@/utils/dragPreview';
import LayerPanel from './LayerPanel';
import './index.less';

/**
 * 左侧面板 —— 图层面板 + 组件面板
 * 上方：图层面板（显示当前舞台/分组图层）
 * 下方：可折叠的组件模板面板
 */
export default function LeftPanel() {
  const { resume, blockTemplates, customElementTemplates, editor, selectBlocks, createGroup, addBlocksToGroup, saveAsCustomTemplate } = useResumeStore();
  const [searchText, setSearchText] = useState('');

  // 拖拽预览元素引用，用于拖拽结束后清理
  const dragPreviewRef = useRef<HTMLElement | null>(null);

  if (!resume) return null;

  const { colorScheme } = resume;
  const selectedBlockIds = editor.selectedBlockIds;

  // 过滤模板
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

  // 清理上一个拖拽预览元素
  const cleanupPrevPreview = () => {
    if (dragPreviewRef.current) {
      cleanupDragPreview(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }
  };

  // 拖拽开始（块模板）
  const handleDragStart = (e: React.DragEvent, templateId: string) => {
    e.dataTransfer.setData('templateId', templateId);
    e.dataTransfer.effectAllowed = 'copy';

    // 创建与放置后元素样式一致的拖拽预览图
    const template = blockTemplates.find(t => t.id === templateId);
    if (template) {
      cleanupPrevPreview();
      const previewEl = createBlockDragPreview(template, colorScheme);
      dragPreviewRef.current = previewEl;
      // 偏移：让鼠标位于预览元素中心
      e.dataTransfer.setDragImage(previewEl, previewEl.offsetWidth / 2, previewEl.offsetHeight / 2);
    }
  };

  // 拖拽开始（自定义元素）
  const handleCustomDragStart = (e: React.DragEvent, templateId: string) => {
    e.dataTransfer.setData('customTemplateId', templateId);
    e.dataTransfer.effectAllowed = 'copy';

    const template = customElementTemplates.find(t => t.id === templateId);
    if (template) {
      cleanupPrevPreview();
      const previewEl = createCustomElementDragPreview(template, colorScheme);
      dragPreviewRef.current = previewEl;
      e.dataTransfer.setDragImage(previewEl, previewEl.offsetWidth / 2, previewEl.offsetHeight / 2);
    }
  };

  // 拖拽开始（分组）
  const handleGroupDragStart = (e: React.DragEvent, groupId: string) => {
    e.dataTransfer.setData('groupId', groupId);
    e.dataTransfer.effectAllowed = 'copy';

    const group = resume.groups.find(g => g.id === groupId);
    if (group) {
      cleanupPrevPreview();
      const previewEl = createGroupDragPreview(group, resume.blocks, colorScheme);
      dragPreviewRef.current = previewEl;
      e.dataTransfer.setDragImage(previewEl, previewEl.offsetWidth / 2, previewEl.offsetHeight / 2);
    }
  };

  // 拖拽结束后清理预览元素
  const handleDragEnd = () => {
    cleanupPrevPreview();
  };

  // 创建分组
  const handleCreateGroup = () => {
    if (selectedBlockIds.length < 2) return;
    const groupId = createGroup(`分组 ${resume.groups.length + 1}`);
    addBlocksToGroup(groupId, selectedBlockIds);
  };

  // 保存为自定义元素
  const handleSaveAsCustom = () => {
    if (selectedBlockIds.length < 1) return;
    let inputValue = '';
    Modal.confirm({
      title: '保存为自定义元素',
      content: (
        <Input
          placeholder="请输入自定义元素名称"
          onChange={(e) => { inputValue = e.target.value; }}
          style={{ marginTop: 8 }}
          autoFocus
        />
      ),
      okText: '保存',
      cancelText: '取消',
      onOk: () => {
        if (inputValue.trim()) {
          saveAsCustomTemplate(inputValue.trim(), selectedBlockIds);
        }
      },
    });
  };

  // 块模板折叠面板
  const templateItems = Object.entries(groupedTemplates).map(([category, templates]) => ({
    key: `tpl-${category}`,
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
  }));

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
    <div className="left-panel" style={{ width: editor.leftPanelWidth }}>
      {/* 上方：图层面板 */}
      <LayerPanel />

      {/* 多选操作 */}
      {selectedBlockIds.length >= 2 && (
        <div className="left-panel-multi-select-actions">
          <span className="left-panel-selected-count">
            已选择 {selectedBlockIds.length} 个元素
          </span>
          <div className="left-panel-action-buttons">
            <Tooltip title="创建分组">
              <Button
                size="small"
                icon={<GroupOutlined />}
                onClick={handleCreateGroup}
              >
                分组
              </Button>
            </Tooltip>
            <Tooltip title="保存为自定义元素">
              <Button
                size="small"
                icon={<SaveOutlined />}
                onClick={handleSaveAsCustom}
              >
                保存元素
              </Button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* 下方：可折叠组件面板 */}
      <div className="left-panel-components">
        <div className="left-panel-components-header">
          🧩 组件
        </div>

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

        {/* 块模板列表 */}
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
      </div>
    </div>
  );
}

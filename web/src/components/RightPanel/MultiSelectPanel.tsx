import { Button, Divider, Popconfirm, App, Input, Tooltip } from 'antd';
import {
  GroupOutlined,
  SaveOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import type { BlockInstance } from '@/types';

interface MultiSelectPanelProps {
  selectedBlockIds: string[];
  selectedBlocks: BlockInstance[];
}

/**
 * 多选模式面板
 * 包含：对齐、分布、创建分组、保存为自定义元素、批量删除
 */
export default function MultiSelectPanel({ selectedBlockIds, selectedBlocks }: MultiSelectPanelProps) {
  const { resume, updateBlockPosition, createGroup, addBlocksToGroup, selectGroup, saveAsCustomTemplate, removeBlocks } = useResumeStore();
  const { modal } = App.useApp();

  if (!resume) return null;

  // 批量更新多个块的位置
  const batchUpdatePosition = (blockIds: string[], updates: { dx?: number; dy?: number; x?: number; y?: number }) => {
    for (const id of blockIds) {
      const block = resume.blocks.find(b => b.id === id);
      if (block) {
        const newX = updates.x !== undefined ? updates.x : block.x + (updates.dx || 0);
        const newY = updates.y !== undefined ? updates.y : block.y + (updates.dy || 0);
        updateBlockPosition(id, newX, newY);
      }
    }
  };

  const handleCreateGroup = () => {
    if (selectedBlockIds.length < 2) return;
    const groupId = createGroup(`分组 ${resume.groups.length + 1}`);
    addBlocksToGroup(groupId, selectedBlockIds);
    selectGroup(groupId);
  };

  const handleSaveAsCustom = () => {
    if (selectedBlockIds.length < 1) return;
    let inputValue = '';
    modal.confirm({
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

  const handleDeleteSelected = () => {
    removeBlocks(selectedBlockIds);
  };

  return (
    <div className="right-panel-content">
      <div className="right-panel-multi-info">
        <span className="right-panel-multi-count">
          已选择 {selectedBlockIds.length} 个元素
        </span>
      </div>

      {/* 快速对齐 */}
      <div className="right-panel-section-title">对齐</div>
      <div className="right-panel-align-grid">
        <Tooltip title="左对齐">
          <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => {
            const minX = Math.min(...selectedBlocks.map(b => b.x));
            batchUpdatePosition(selectedBlockIds, { x: minX });
          }}>左</Button>
        </Tooltip>
        <Tooltip title="水平居中">
          <Button size="small" icon={<ColumnWidthOutlined />} onClick={() => {
            const avgX = selectedBlocks.reduce((s, b) => s + b.x + b.width / 2, 0) / selectedBlocks.length;
            for (const id of selectedBlockIds) {
              const block = resume.blocks.find(b => b.id === id);
              if (block) updateBlockPosition(id, avgX - block.width / 2, block.y);
            }
          }}>中</Button>
        </Tooltip>
        <Tooltip title="右对齐">
          <Button size="small" icon={<ArrowRightOutlined />} onClick={() => {
            const maxRight = Math.max(...selectedBlocks.map(b => b.x + b.width));
            for (const id of selectedBlockIds) {
              const block = resume.blocks.find(b => b.id === id);
              if (block) updateBlockPosition(id, maxRight - block.width, block.y);
            }
          }}>右</Button>
        </Tooltip>
        <Tooltip title="顶部对齐">
          <Button size="small" icon={<ArrowUpOutlined />} onClick={() => {
            const minY = Math.min(...selectedBlocks.map(b => b.y));
            batchUpdatePosition(selectedBlockIds, { y: minY });
          }}>上</Button>
        </Tooltip>
        <Tooltip title="垂直居中">
          <Button size="small" icon={<ColumnHeightOutlined />} onClick={() => {
            const avgY = selectedBlocks.reduce((s, b) => s + b.y + b.height / 2, 0) / selectedBlocks.length;
            for (const id of selectedBlockIds) {
              const block = resume.blocks.find(b => b.id === id);
              if (block) updateBlockPosition(id, block.x, avgY - block.height / 2);
            }
          }}>中</Button>
        </Tooltip>
        <Tooltip title="底部对齐">
          <Button size="small" icon={<ArrowDownOutlined />} onClick={() => {
            const maxBottom = Math.max(...selectedBlocks.map(b => b.y + b.height));
            for (const id of selectedBlockIds) {
              const block = resume.blocks.find(b => b.id === id);
              if (block) updateBlockPosition(id, block.x, maxBottom - block.height);
            }
          }}>下</Button>
        </Tooltip>
      </div>

      {/* 等间距 */}
      <div className="right-panel-section-title">分布</div>
      <div className="right-panel-distribute-row">
        <Button size="small" onClick={() => {
          if (selectedBlocks.length < 3) return;
          const sorted = [...selectedBlocks].sort((a, b) => a.x - b.x);
          const totalWidth = sorted.reduce((s, b) => s + b.width, 0);
          const leftX = sorted[0].x;
          const rightEdge = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
          const gap = (rightEdge - leftX - totalWidth) / (sorted.length - 1);
          let currentX = leftX;
          for (const block of sorted) {
            updateBlockPosition(block.id, currentX, block.y);
            currentX += block.width + gap;
          }
        }}>水平等距</Button>
        <Button size="small" onClick={() => {
          if (selectedBlocks.length < 3) return;
          const sorted = [...selectedBlocks].sort((a, b) => a.y - b.y);
          const totalHeight = sorted.reduce((s, b) => s + b.height, 0);
          const topY = sorted[0].y;
          const bottomEdge = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
          const gap = (bottomEdge - topY - totalHeight) / (sorted.length - 1);
          let currentY = topY;
          for (const block of sorted) {
            updateBlockPosition(block.id, block.x, currentY);
            currentY += block.height + gap;
          }
        }}>垂直等距</Button>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div className="right-panel-multi-actions">
        <Button
          icon={<GroupOutlined />}
          onClick={handleCreateGroup}
          block
        >
          创建分组
        </Button>
        <Button
          icon={<SaveOutlined />}
          onClick={handleSaveAsCustom}
          block
        >
          保存为自定义元素
        </Button>
        <Popconfirm
          title={`确认删除 ${selectedBlockIds.length} 个元素？`}
          onConfirm={handleDeleteSelected}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button danger icon={<DeleteOutlined />} block>
            批量删除
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
}

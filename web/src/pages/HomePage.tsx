import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button } from 'antd';
import { EditOutlined, ArrowRightOutlined, FileTextOutlined } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { presetColorSchemes } from '@/utils/presets';
import type { ColorScheme } from '@/types';
import './index.less';

/**
 * 首页：创建简历页面
 * 路由：/
 * 简化流程：输入名称 → 选择配色 → 直接创建
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { initResume } = useResumeStore();
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme>(presetColorSchemes[0]);
  const [resumeTitle, setResumeTitle] = useState('我的简历');

  const handleCreate = () => {
    initResume(resumeTitle, selectedColorScheme);
    navigate('/editor');
  };

  return (
    <div className="layout-selector">
      {/* 头部 */}
      <div className="layout-selector-header">
        <h1 className="layout-selector-title">
          <FileTextOutlined /> 创建新简历
        </h1>
        <p className="layout-selector-subtitle">自由排版，拖拽元素到任意位置，打造个性化简历</p>
      </div>

      <div className="layout-selector-body">
        {/* 第一步：简历命名 */}
        <div className="layout-selector-section">
          <div className="layout-selector-section-header">
            <EditOutlined className="layout-selector-section-icon" />
            <h2>简历名称</h2>
          </div>
          <Input
            size="large"
            value={resumeTitle}
            onChange={(e) => setResumeTitle(e.target.value)}
            placeholder="例如：张三-前端工程师-字节版"
            style={{ maxWidth: 480 }}
          />
        </div>

        {/* 第二步：选择配色 */}
        <div className="layout-selector-section">
          <div className="layout-selector-section-header">
            <EditOutlined className="layout-selector-section-icon" />
            <h2>选择配色</h2>
          </div>
          <div className="layout-selector-colors">
            {presetColorSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className={`layout-selector-color-card ${
                  selectedColorScheme.id === scheme.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedColorScheme(scheme)}
              >
                <div className="layout-selector-color-swatches">
                  {[scheme.primary, scheme.secondary, scheme.accent].map((color, i) => (
                    <div
                      key={i}
                      className="layout-selector-color-swatch"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="layout-selector-color-name">{scheme.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 创建按钮 */}
        <div className="layout-selector-actions">
          <Button
            type="primary"
            size="large"
            onClick={handleCreate}
            disabled={!resumeTitle.trim()}
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
            className="layout-selector-create-btn"
          >
            开始编辑
          </Button>
        </div>
      </div>
    </div>
  );
}

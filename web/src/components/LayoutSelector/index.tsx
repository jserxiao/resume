import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Steps, Card } from 'antd';
import { EditOutlined, LayoutOutlined, BgColorsOutlined, ArrowRightOutlined, FileTextOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { presetLayouts } from '@/utils/presets';
import type { ColorScheme, LayoutConfig } from '@/types';
import { presetColorSchemes } from '@/utils/presets';
import './index.less';

export default function LayoutSelector() {
  const navigate = useNavigate();
  const { initResume } = useResumeStore();
  const [selectedLayout, setSelectedLayout] = useState<number>(0);
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme>(presetColorSchemes[0]);
  const [resumeTitle, setResumeTitle] = useState('我的简历');

  const handleCreate = () => {
    initResume(resumeTitle, presetLayouts[selectedLayout].config, selectedColorScheme);
    navigate('/editor');
  };

  return (
    <div className="layout-selector">
      {/* 头部 */}
      <div className="layout-selector-header">
        <h1 className="layout-selector-title">
          <FileTextOutlined /> 创建新简历
        </h1>
        <p className="layout-selector-subtitle">选择一个布局模板开始，后续可在编辑器中调整</p>
      </div>

      <div className="layout-selector-body">
        {/* 步骤条 */}
        <Steps
          className="layout-selector-steps"
          current={resumeTitle.trim() ? (selectedLayout >= 0 ? 2 : 1) : 0}
          items={[
            { title: '简历名称', icon: <EditOutlined /> },
            { title: '选择布局', icon: <LayoutOutlined /> },
            { title: '选择配色', icon: <BgColorsOutlined /> },
          ]}
        />

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

        {/* 第二步：选择布局 */}
        <div className="layout-selector-section">
          <div className="layout-selector-section-header">
            <LayoutOutlined className="layout-selector-section-icon" />
            <h2>选择布局</h2>
          </div>
          <div className="layout-selector-grid">
            {presetLayouts.map((layout, index) => (
              <LayoutCard
                key={index}
                layout={layout}
                isSelected={selectedLayout === index}
                onClick={() => setSelectedLayout(index)}
              />
            ))}
          </div>
        </div>

        {/* 第三步：选择配色 */}
        <div className="layout-selector-section">
          <div className="layout-selector-section-header">
            <BgColorsOutlined className="layout-selector-section-icon" />
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
                {selectedColorScheme.id === scheme.id && (
                  <CheckCircleFilled className="layout-selector-color-check" />
                )}
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

// ========== 布局卡片组件 ==========
function LayoutCard({
  layout,
  isSelected,
  onClick,
}: {
  layout: { name: string; description: string; config: LayoutConfig };
  isSelected: boolean;
  onClick: () => void;
}) {
  const { config } = layout;
  const isDouble = config.type === 'double' || config.type === 'mixed';
  const leftRatio = config.columnRatio[0];

  return (
    <Card
      hoverable
      className={`layout-selector-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      variant="outlined"
    >
      {/* 缩略图预览 */}
      <div className="layout-selector-card-preview">
        <div className="layout-selector-card-page">
          {/* 页头 */}
          <div className="layout-selector-card-header">
            {config.headerStyle === 'center' && (
              <div className="ls-header-center">
                <div className="ls-header-line thick" />
                <div className="ls-header-line thin" />
              </div>
            )}
            {config.headerStyle === 'left-align' && (
              <div className="ls-header-left">
                <div className="ls-header-line thick" />
                <div className="ls-header-line thin half" />
              </div>
            )}
            {config.headerStyle === 'with-avatar' && (
              <div className="ls-header-avatar">
                <div className="ls-avatar-circle" />
                <div className="ls-header-text">
                  <div className="ls-header-line thick" />
                  <div className="ls-header-line thin" />
                </div>
              </div>
            )}
            {config.headerStyle === 'two-line' && (
              <div className="ls-header-two-line">
                <div className="ls-header-line thick" />
                <div className="ls-header-line thin" />
              </div>
            )}
          </div>

          {/* 内容区 */}
          <div className="layout-selector-card-content">
            {isDouble ? (
              <>
                <div className="ls-column-left" style={{ width: `${leftRatio}%` }}>
                  {config.density === 'compact' ? (
                    <>
                      <div className="ls-block-sm" />
                      <div className="ls-block-sm" />
                      <div className="ls-block-sm" />
                    </>
                  ) : (
                    <>
                      <div className="ls-block" />
                      <div className="ls-block" />
                    </>
                  )}
                </div>
                <div className="ls-divider" />
                <div className="ls-column-right" style={{ width: `${100 - leftRatio}%` }}>
                  {config.density === 'compact' ? (
                    <>
                      <div className="ls-block-sm" />
                      <div className="ls-block-sm" />
                      <div className="ls-block-sm" />
                    </>
                  ) : (
                    <>
                      <div className="ls-block" />
                      <div className="ls-block" />
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {config.density === 'compact' ? (
                  <>
                    <div className="ls-block-full" />
                    <div className="ls-block-full" />
                    <div className="ls-block-full" />
                  </>
                ) : config.density === 'spacious' ? (
                  <>
                    <div className="ls-block-full-lg" />
                  </>
                ) : (
                  <>
                    <div className="ls-block-full" />
                    <div className="ls-block-full" />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 信息 */}
      <div className="layout-selector-card-info">
        <div className="layout-selector-card-name">{layout.name}</div>
        <div className="layout-selector-card-desc">{layout.description}</div>
      </div>

      {/* 选中标记 */}
      {isSelected && (
        <div className="layout-selector-card-check">
          <CheckCircleFilled />
        </div>
      )}
    </Card>
  );
}

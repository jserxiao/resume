import { useState } from 'react';
import { Button, Input, Segmented, ColorPicker, Select, message } from 'antd';
import { DeleteOutlined, SaveOutlined, ThunderboltOutlined, BgColorsOutlined, CloseOutlined, CameraOutlined } from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { presetColorSchemes } from '@/utils/presets';
import { generateColorScheme, generateBatchSchemes, getContrastRatio } from '@/utils/color';
import { uploadImage } from '@/utils/imageUpload';
import type { ColorScheme } from '@/types';
import './ColorSchemePanel.less';

export default function ColorSchemePanel() {
  const { resume, setColorScheme, setCanvasConfig, customColorSchemes, addCustomColorScheme, removeCustomColorScheme } = useResumeStore();
  const [mode, setMode] = useState<'preset' | 'generate' | 'custom'>('preset');
  const [primaryColor, setPrimaryColor] = useState('#1a56db');
  const [generatedSchemes, setGeneratedSchemes] = useState<ColorScheme[]>([]);

  if (!resume) return null;

  const allSchemes = [...presetColorSchemes, ...customColorSchemes];

  const handleGenerate = () => {
    const scheme = generateColorScheme(primaryColor);
    setGeneratedSchemes([scheme]);
  };

  const handleBatchGenerate = () => {
    const schemes = generateBatchSchemes(primaryColor, 6);
    setGeneratedSchemes(schemes);
  };

  const handleApplyGenerated = (scheme: ColorScheme) => {
    addCustomColorScheme({ ...scheme });
    setColorScheme(scheme);
  };

  const handleSaveCustom = () => {
    addCustomColorScheme({
      ...resume.colorScheme,
      id: '',
      name: `自定义-${Date.now()}`,
      isPreset: false,
    });
    message.success('配色已保存');
  };

  return (
    <div className="color-scheme-panel">
      {/* 子Tab */}
      <div className="color-scheme-tabs">
        <Segmented
          block
          size="small"
          value={mode}
          options={[
            { label: '预设方案', value: 'preset' },
            { label: '智能生成', value: 'generate' },
            { label: '自定义', value: 'custom' },
          ]}
          onChange={(val) => setMode(val as 'preset' | 'generate' | 'custom')}
        />
      </div>

      <div className="color-scheme-content">
        {/* 当前配色预览 */}
        <div className="color-scheme-current">
          <div className="color-scheme-current-label">当前配色：{resume.colorScheme.name}</div>
          <div className="color-scheme-preview-colors">
            {['primary', 'secondary', 'background', 'textPrimary', 'accent'].map((key) => (
              <div
                key={key}
                className="color-scheme-preview-swatch"
                style={{ backgroundColor: resume.colorScheme[key as keyof ColorScheme] as string }}
                title={`${key}: ${resume.colorScheme[key as keyof ColorScheme] as string}`}
              />
            ))}
          </div>
          {/* 对比度 */}
          <div className="color-scheme-contrast">
            对比度：{getContrastRatio(resume.colorScheme.textPrimary, resume.colorScheme.background).toFixed(1)}:1
          </div>
        </div>

        {/* 预设方案 */}
        {mode === 'preset' && (
          <div className="color-scheme-grid">
            {allSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className={`color-scheme-card ${
                  resume.colorScheme.id === scheme.id ? 'active' : ''
                }`}
                onClick={() => setColorScheme(scheme)}
              >
                <div className="color-scheme-card-colors">
                  {[scheme.primary, scheme.secondary, scheme.accent, scheme.textPrimary, scheme.background].map(
                    (color, i) => (
                      <div
                        key={i}
                        className="color-scheme-card-swatch"
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
                <div className="color-scheme-card-name">{scheme.name}</div>
                {!scheme.isPreset && (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    className="color-scheme-card-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomColorScheme(scheme.id);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* 智能生成 */}
        {mode === 'generate' && (
          <div className="color-scheme-generate">
            <div className="color-scheme-generate-input">
              <label className="color-scheme-label">选择主色</label>
              <div className="color-scheme-color-picker">
                <ColorPicker
                  value={primaryColor}
                  onChange={(_, hex) => setPrimaryColor(hex)}
                  size="small"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  maxLength={7}
                  style={{ width: 100 }}
                  size="small"
                />
              </div>
            </div>

            <div className="color-scheme-generate-actions">
              <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleGenerate}>
                生成方案
              </Button>
              <Button onClick={handleBatchGenerate}>
                批量生成 6 个
              </Button>
            </div>

            {generatedSchemes.length > 0 && (
              <div className="color-scheme-grid">
                {generatedSchemes.map((scheme) => (
                  <div
                    key={scheme.id}
                    className="color-scheme-card"
                    onClick={() => handleApplyGenerated(scheme)}
                  >
                    <div className="color-scheme-card-colors">
                      {[scheme.primary, scheme.secondary, scheme.accent, scheme.textPrimary, scheme.background].map(
                        (color, i) => (
                          <div
                            key={i}
                            className="color-scheme-card-swatch"
                            style={{ backgroundColor: color }}
                          />
                        )
                      )}
                    </div>
                    <div className="color-scheme-card-name">{scheme.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 自定义调色 */}
        {mode === 'custom' && (
          <div className="color-scheme-custom">
            {(['primary', 'secondary', 'background', 'blockBackground', 'textPrimary', 'textSecondary', 'textMuted', 'accent'] as const).map(
              (key) => {
                const labelMap: Record<string, string> = {
                  primary: '主色',
                  secondary: '辅色',
                  background: '背景色',
                  blockBackground: '块背景色',
                  textPrimary: '正文色',
                  textSecondary: '副文字色',
                  textMuted: '标注色',
                  accent: '强调色',
                };

                return (
                  <div key={key} className="color-scheme-custom-row">
                    <label className="color-scheme-label">{labelMap[key]}</label>
                    <div className="color-scheme-color-picker">
                      <ColorPicker
                        value={resume.colorScheme[key]}
                        onChange={(_, hex) => {
                          const newScheme = { ...resume.colorScheme, [key]: hex };
                          setColorScheme(newScheme);
                        }}
                        size="small"
                      />
                      <Input
                        value={resume.colorScheme[key]}
                        onChange={(e) => {
                          const newScheme = { ...resume.colorScheme, [key]: e.target.value };
                          setColorScheme(newScheme);
                        }}
                        maxLength={7}
                        style={{ width: 100 }}
                        size="small"
                      />
                    </div>
                  </div>
                );
              }
            )}

            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveCustom}
              block
            >
              保存当前配色
            </Button>
          </div>
        )}
      </div>

      {/* 画布背景设置 */}
      <div className="color-scheme-canvas-bg">
        <div className="color-scheme-section-title"><BgColorsOutlined /> 画布背景</div>
        <div className="color-scheme-custom-row">
          <label className="color-scheme-label">背景图片</label>
          {resume.canvas.backgroundImage ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <img
                  src={resume.canvas.backgroundImage}
                  alt="画布背景"
                  style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setCanvasConfig({ backgroundImage: undefined })}
                />
              </div>
              <Select
                value={resume.canvas.backgroundSize || 'cover'}
                onChange={(val) => setCanvasConfig({ backgroundSize: val })}
                size="small"
                style={{ width: '100%' }}
                options={[
                  { label: '覆盖 (cover)', value: 'cover' },
                  { label: '包含 (contain)', value: 'contain' },
                  { label: '原始 (auto)', value: 'auto' },
                ]}
              />
            </div>
          ) : (
            <Button
              icon={<CameraOutlined />}
              onClick={async () => {
                const result = await uploadImage();
                if (result) setCanvasConfig({ backgroundImage: result });
              }}
              size="small"
            >
              上传背景图片
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

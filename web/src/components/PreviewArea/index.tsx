import { useResumeStore } from '@/store';
import BlockRenderer from '@/components/BlockRenderer';
import './index.less';

export default function PreviewArea() {
  const { resume, blockTemplates, editor, selectBlock } = useResumeStore();

  if (!resume) return null;

  const zoom = editor.zoom / 100;
  const { colorScheme, layout } = resume;

  // A4 尺寸 (px at 96dpi): 794 x 1123
  const a4Width = 794;
  const a4Height = 1123;

  // 密度对应的字号/行距
  const densityStyles: Record<string, { fontSize: number; lineHeight: number; spacing: number }> = {
    compact: { fontSize: 11, lineHeight: 1.35, spacing: 6 },
    standard: { fontSize: 12, lineHeight: 1.5, spacing: 10 },
    spacious: { fontSize: 13, lineHeight: 1.65, spacing: 14 },
  };

  const density = densityStyles[layout.density] || densityStyles.standard;

  // 根据布局类型分离左右栏的块
  const isDoubleLayout = layout.type === 'double' || layout.type === 'mixed';
  const leftBlocks = isDoubleLayout
    ? resume.blocks.filter((b) => b.column === 'left' && b.visible)
    : [];
  const rightBlocks = isDoubleLayout
    ? resume.blocks.filter((b) => b.column === 'right' && b.visible)
    : resume.blocks.filter((b) => b.visible);

  const leftRatio = layout.columnRatio[0] / 100;
  const rightRatio = layout.columnRatio[1] / 100;

  return (
    <div className="preview-area">
      <div className="preview-area-container">
        <div
          className="preview-area-page"
          style={{
            width: a4Width,
            minHeight: a4Height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            backgroundColor: colorScheme.background,
            fontSize: density.fontSize,
            lineHeight: density.lineHeight,
            '--resume-primary': colorScheme.primary,
            '--resume-secondary': colorScheme.secondary,
            '--resume-text': colorScheme.textPrimary,
            '--resume-text-secondary': colorScheme.textSecondary,
            '--resume-text-muted': colorScheme.textMuted,
            '--resume-accent': colorScheme.accent,
            '--resume-block-bg': colorScheme.blockBackground,
            '--resume-spacing': `${density.spacing}px`,
          } as React.CSSProperties}
        >
          {/* 页头 */}
          <div className="preview-page-header">
            {/* 页头内容由基本信息块自动渲染 */}
          </div>

          {/* 页面内容 */}
          {isDoubleLayout ? (
            <div className="preview-page-body double">
              <div
                className="preview-page-column left"
                style={{ width: `${leftRatio * 100}%` }}
              >
                {leftBlocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    template={blockTemplates.find((t) => t.id === block.templateId)}
                    isSelected={editor.selectedBlockId === block.id}
                    onSelect={() => selectBlock(block.id)}
                  />
                ))}
                {leftBlocks.length === 0 && (
                  <div className="preview-empty-column">左侧栏为空</div>
                )}
              </div>
              <div className="preview-page-divider" style={{ backgroundColor: colorScheme.primary }} />
              <div
                className="preview-page-column right"
                style={{ width: `${rightRatio * 100}%` }}
              >
                {rightBlocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    template={blockTemplates.find((t) => t.id === block.templateId)}
                    isSelected={editor.selectedBlockId === block.id}
                    onSelect={() => selectBlock(block.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="preview-page-body single">
              {resume.blocks.filter((b) => b.visible).map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  template={blockTemplates.find((t) => t.id === block.templateId)}
                  isSelected={editor.selectedBlockId === block.id}
                  onSelect={() => selectBlock(block.id)}
                />
              ))}
              {resume.blocks.filter((b) => b.visible).length === 0 && (
                <div className="preview-empty-page">
                  <div className="preview-empty-page-icon">📝</div>
                  <p>从左侧面板添加内容块开始编辑</p>
                  <p className="preview-empty-page-hint">
                    点击左侧 "+ 添加块" 按钮
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

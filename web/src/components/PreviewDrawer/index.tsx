import { Drawer, Segmented } from 'antd';
import { useResumeStore } from '@/store';
import BlockRenderer from '@/components/BlockRenderer';
import './index.less';

/**
 * 预览抽屉 - 点击 Toolbar 的"预览"按钮弹出
 */
export default function PreviewDrawer() {
  const { resume, blockTemplates, editor, setPreviewOpen, setZoom } = useResumeStore();

  if (!resume) return null;

  const zoom = editor.zoom / 100;
  const { colorScheme, layout } = resume;

  // A4 尺寸 (px at 96dpi): 794 x 1123
  const a4Width = 794;
  const a4Height = 1123;

  const densityStyles: Record<string, { fontSize: number; lineHeight: number; spacing: number }> = {
    compact: { fontSize: 11, lineHeight: 1.35, spacing: 6 },
    standard: { fontSize: 12, lineHeight: 1.5, spacing: 10 },
    spacious: { fontSize: 13, lineHeight: 1.65, spacing: 14 },
  };

  const density = densityStyles[layout.density] || densityStyles.standard;

  const isDoubleLayout = layout.type === 'double' || layout.type === 'mixed';
  const headerBlocks = resume.blocks.filter((b) => b.column === 'header' && b.visible);
  const leftBlocks = isDoubleLayout
    ? resume.blocks.filter((b) => b.column === 'left' && b.visible)
    : [];
  const rightBlocks = isDoubleLayout
    ? resume.blocks.filter((b) => b.column === 'right' && b.visible)
    : resume.blocks.filter((b) => b.column !== 'header' && b.visible);

  const leftRatio = layout.columnRatio[0] / 100;
  const rightRatio = layout.columnRatio[1] / 100;

  return (
    <Drawer
      title="简历预览"
      placement="right"
      size={860}
      open={editor.previewOpen}
      onClose={() => setPreviewOpen(false)}
      extra={
        <Segmented
          size="small"
          value={String(editor.zoom)}
          options={[
            { label: '75%', value: '75' },
            { label: '100%', value: '100' },
            { label: '150%', value: '150' },
          ]}
          onChange={(val) => setZoom(Number(val))}
        />
      }
      styles={{
        body: { padding: 0, overflow: 'auto', background: '#f5f6fa' },
      }}
    >
      <div className="preview-drawer-container">
        <div
          className="preview-drawer-page"
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
          {/* 页头 —— 渲染头部块 */}
          {headerBlocks.length > 0 && (
            <div className="preview-drawer-page-header">
              {headerBlocks.map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  template={blockTemplates.find((t) => t.id === block.templateId)}
                  isSelected={false}
                  onSelect={() => {}}
                />
              ))}
            </div>
          )}

          {/* 页面内容 */}
          {isDoubleLayout ? (
            <div className="preview-drawer-page-body double">
              <div
                className="preview-drawer-page-column left"
                style={{ width: `${leftRatio * 100}%` }}
              >
                {leftBlocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    template={blockTemplates.find((t) => t.id === block.templateId)}
                    isSelected={false}
                    onSelect={() => {}}
                  />
                ))}
              </div>
              <div
                className="preview-drawer-page-column right"
                style={{ width: `${rightRatio * 100}%` }}
              >
                {rightBlocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    template={blockTemplates.find((t) => t.id === block.templateId)}
                    isSelected={false}
                    onSelect={() => {}}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="preview-drawer-page-body single">
              {resume.blocks.filter((b) => b.column !== 'header' && b.visible).map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  template={blockTemplates.find((t) => t.id === block.templateId)}
                  isSelected={false}
                  onSelect={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

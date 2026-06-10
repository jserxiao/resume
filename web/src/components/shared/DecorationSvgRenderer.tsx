import type { DecorationElement } from '@/types';
import { presetDecorations } from '@/utils/decorations';

interface DecorationSvgRendererProps {
  /** 装饰元素列表 */
  decorations: DecorationElement[];
  /** 是否为预览模式 */
  isPreview?: boolean;
  /** 额外的 CSS 类名 */
  className?: string;
}

/**
 * 装饰元素 SVG 渲染组件
 *
 * 统一渲染装饰 SVG 覆盖层，支持多路径自定义装饰、
 * 单路径自定义装饰（旧格式兼容）和预设装饰。
 * 用于 FreeBlockCard 和 LeftPanel 中装饰缩略图的渲染。
 */
export default function DecorationSvgRenderer({
  decorations,
  isPreview = false,
  className = 'free-block-decorations',
}: DecorationSvgRendererProps) {
  if (!decorations || decorations.length === 0) return null;

  return (
    <div className={className}>
      {decorations.map((deco) => {
        const def = presetDecorations.find((d) => d.id === deco.decorationId);
        const isDashed = deco.decorationId.includes('dashed');
        const customDeco = deco as any;

        // 多路径自定义装饰（新格式）
        const hasMultiPaths = !!customDeco.customSvgPaths;
        // 单路径自定义装饰（旧格式兼容）
        const hasSinglePath = !!customDeco.customSvgPath;
        const isCustomDeco = hasMultiPaths || hasSinglePath;
        const svgPath = customDeco.customSvgPath || (def?.svgPath);

        // 没有任何可渲染的路径数据
        if (!svgPath && !hasMultiPaths) return null;

        return (
          <svg
            key={deco.id}
            className="free-block-decoration"
            style={{
              position: 'absolute',
              left: deco.x,
              top: deco.y,
              width: isCustomDeco ? '100%' : deco.width,
              height: isCustomDeco ? '100%' : deco.height,
              transform: `rotate(${deco.rotation}deg)`,
              opacity: deco.opacity,
              zIndex: deco.zIndex,
              pointerEvents: isPreview ? 'none' : 'auto',
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio={isCustomDeco ? 'xMidYMid meet' : 'none'}
          >
            {hasMultiPaths ? (
              // 多路径自定义装饰
              customDeco.customSvgPaths.map((p: { pathD: string; fillColor: string; strokeColor: string; strokeWidth: number; isClosed: boolean; clipRect?: { x: number; y: number; width: number; height: number } | null }, idx: number) => (
                <g key={idx}>
                  {p.clipRect && (
                    <defs>
                      <clipPath id={`deco-clip-${deco.id}-${idx}`}>
                        <rect x={p.clipRect.x} y={p.clipRect.y} width={p.clipRect.width} height={p.clipRect.height} />
                      </clipPath>
                    </defs>
                  )}
                  <g clipPath={p.clipRect ? `url(#deco-clip-${deco.id}-${idx})` : undefined}>
                    {p.isClosed && p.fillColor !== 'transparent' && (
                      <path
                        d={p.pathD}
                        fill={p.fillColor}
                        stroke="none"
                      />
                    )}
                    <path
                      d={p.pathD}
                      fill="none"
                      stroke={p.strokeColor === 'transparent' ? 'none' : p.strokeColor}
                      strokeWidth={Math.max(0.5, p.strokeWidth)}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              ))
            ) : isCustomDeco ? (
              // 单路径自定义装饰（旧格式兼容）
              <>
                {customDeco.customIsClosed && deco.color !== 'transparent' && (
                  <path
                    d={svgPath}
                    fill={deco.color}
                    stroke="none"
                  />
                )}
                <path
                  d={svgPath}
                  fill="none"
                  stroke={deco.strokeColor === 'transparent' ? 'none' : deco.strokeColor}
                  strokeWidth={Math.max(0.5, deco.strokeWidth)}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <path
                d={svgPath!}
                fill={deco.color === 'transparent' ? 'none' : deco.color}
                stroke={deco.strokeColor === 'transparent' ? 'none' : deco.strokeColor}
                strokeWidth={deco.strokeWidth * 3}
                strokeDasharray={isDashed ? '5,3' : undefined}
              />
            )}
          </svg>
        );
      })}
    </div>
  );
}

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
 * 将 SVG pathD 拆分为逐边的路径段
 *
 * 支持的命令：M, L, Q, Z
 * 返回每一段的 pathD 字符串数组，每段以 M 开头
 *
 * 示例输入: "M 0 0 Q 50 0 100 0 L 100 50 Q 50 50 0 50 Z"
 * 输出: ["M 0 0 Q 50 0 100 0", "M 100 0 L 100 50", "M 100 50 Q 50 50 0 50"]
 * (Z 闭合段会被忽略，因为闭合段颜色与最后一段相同)
 */
function splitPathDByEdges(pathD: string): string[] {
  const segments: string[] = [];

  // 用正则提取所有命令及参数
  const cmdRegex = /([MLQZ])\s*([^MLQZ]*)/gi;
  let match: RegExpExecArray | null;
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let segStartX = 0;
  let segStartY = 0;
  let currentSeg = '';

  while ((match = cmdRegex.exec(pathD)) !== null) {
    const cmd = match[1].toUpperCase();
    const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);

    switch (cmd) {
      case 'M': {
        // 如果有未完成的段，先保存
        if (currentSeg) {
          segments.push(currentSeg);
        }
        currentX = args[0];
        currentY = args[1];
        startX = currentX;
        startY = currentY;
        segStartX = currentX;
        segStartY = currentY;
        currentSeg = `M ${currentX} ${currentY}`;
        // M 可能带多个坐标对（当作 L 处理）
        for (let i = 2; i < args.length; i += 2) {
          segments.push(currentSeg);
          currentX = args[i];
          currentY = args[i + 1];
          segStartX = currentX;
          segStartY = currentY;
          currentSeg = `M ${currentX} ${currentY}`;
        }
        break;
      }
      case 'L': {
        for (let i = 0; i < args.length; i += 2) {
          currentSeg += ` L ${args[i]} ${args[i + 1]}`;
          currentX = args[i];
          currentY = args[i + 1];
          // 一个 L 命令就是一条边
          segments.push(currentSeg);
          segStartX = currentX;
          segStartY = currentY;
          currentSeg = `M ${currentX} ${currentY}`;
        }
        break;
      }
      case 'Q': {
        for (let i = 0; i < args.length; i += 4) {
          currentSeg += ` Q ${args[i]} ${args[i + 1]} ${args[i + 2]} ${args[i + 3]}`;
          currentX = args[i + 2];
          currentY = args[i + 3];
          // 一个 Q 命令就是一条边
          segments.push(currentSeg);
          segStartX = currentX;
          segStartY = currentY;
          currentSeg = `M ${currentX} ${currentY}`;
        }
        break;
      }
      case 'Z': {
        // 闭合路径：从当前点回到起点，构成一条边
        if (currentX !== startX || currentY !== startY) {
          currentSeg += ` L ${startX} ${startY}`;
          segments.push(currentSeg);
          currentX = startX;
          currentY = startY;
          segStartX = currentX;
          segStartY = currentY;
          currentSeg = `M ${currentX} ${currentY}`;
        }
        break;
      }
    }
  }

  // 处理最后一段（非 Z 结尾的情况，通常不应出现）
  if (currentSeg && currentSeg !== `M ${segStartX} ${segStartY}`) {
    segments.push(currentSeg);
  }

  return segments;
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
            preserveAspectRatio="none"
          >
            {hasMultiPaths ? (
              // 多路径自定义装饰
              customDeco.customSvgPaths.map((p: { pathD: string; fillColor: string; strokeColor: string; strokeWidth: number; isClosed: boolean; clipRect?: { x: number; y: number; width: number; height: number } | null; edgeColors?: string[] }, idx: number) => (
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
                    {/* 逐边着色：如果 edgeColors 存在且有自定义色，则逐边绘制 */}
                    {p.edgeColors && p.edgeColors.some((c: string, i: number) => c && c !== p.strokeColor) ? (
                      (() => {
                        const segPaths = splitPathDByEdges(p.pathD);
                        return segPaths.map((segD: string, segIdx: number) => (
                          <path
                            key={`edge-${segIdx}`}
                            d={segD}
                            fill="none"
                            stroke={p.edgeColors![segIdx] || p.strokeColor}
                            strokeWidth={Math.max(0.5, p.strokeWidth)}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        ));
                      })()
                    ) : (
                      <path
                        d={p.pathD}
                        fill="none"
                        stroke={p.strokeColor === 'transparent' ? 'none' : p.strokeColor}
                        strokeWidth={Math.max(0.5, p.strokeWidth)}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    )}
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

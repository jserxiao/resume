import { useMemo } from 'react';
import type { WatermarkConfig } from '@/types';

interface WatermarkOverlayProps {
  watermark: WatermarkConfig;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * 水印渲染组件
 * 使用 CSS 重复平铺 + 旋转实现水印效果
 */
export default function WatermarkOverlay({ watermark, canvasWidth, canvasHeight }: WatermarkOverlayProps) {
  const { text, fontSize, rotation, color, opacity, gapX, gapY } = watermark;

  // 计算单个水印单元的尺寸（需要容纳旋转后的文字）
  const unitWidth = useMemo(() => {
    // 粗略估计文字宽度
    const textWidth = text.length * fontSize * 0.6;
    // 旋转后需要的空间更大
    const absRot = Math.abs(rotation);
    const rad = (absRot * Math.PI) / 180;
    return Math.max(gapX, textWidth * Math.cos(rad) + fontSize * Math.sin(rad) + gapX * 0.5);
  }, [text, fontSize, rotation, gapX]);

  const unitHeight = useMemo(() => {
    const textWidth = text.length * fontSize * 0.6;
    const absRot = Math.abs(rotation);
    const rad = (absRot * Math.PI) / 180;
    return Math.max(gapY, textWidth * Math.sin(rad) + fontSize * Math.cos(rad) + gapY * 0.5);
  }, [text, fontSize, rotation, gapY]);

  // 使用 SVG 生成水印图案（文字居中在单元格中）
  const svgDataUrl = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${unitWidth}" height="${unitHeight}">
      <text
        x="${unitWidth / 2}"
        y="${unitHeight / 2}"
        font-size="${fontSize}"
        fill="${color}"
        text-anchor="middle"
        dominant-baseline="central"
        transform="rotate(${rotation}, ${unitWidth / 2}, ${unitHeight / 2})"
        font-family="sans-serif"
      >${escapeXml(text)}</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [text, fontSize, rotation, color, unitWidth, unitHeight]);

  if (!text.trim()) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity,
        backgroundImage: `url("${svgDataUrl}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${unitWidth}px ${unitHeight}px`,
      }}
    />
  );
}

/** 转义 XML 特殊字符 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

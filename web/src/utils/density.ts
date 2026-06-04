/**
 * 密度配置 —— 编辑区和预览区共享，确保样式一致
 */
export interface DensityConfig {
  fontSize: number;
  lineHeight: number;
  spacing: number;
}

export const densityStyles: Record<string, DensityConfig> = {
  compact: { fontSize: 12, lineHeight: 1.4, spacing: 8 },
  standard: { fontSize: 13, lineHeight: 1.5, spacing: 12 },
  spacious: { fontSize: 14, lineHeight: 1.65, spacing: 16 },
};

export function getDensity(density: string): DensityConfig {
  return densityStyles[density] || densityStyles.standard;
}

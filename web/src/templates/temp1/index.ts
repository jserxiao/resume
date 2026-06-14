import type { Resume, ColorScheme, CanvasConfig } from '@/types';
import { CANVAS_DEFAULT_WIDTH, CANVAS_DEFAULT_HEIGHT, CANVAS_DEFAULT_PADDING, CANVAS_DEFAULT_BACKGROUND, CURRENT_DATA_VERSION } from '@/utils/constants';
import { v4 as uuid } from 'uuid';
import { createHeaderBlocks } from './header';
import { createLeftColumnBlocks } from './leftColumn';
import { createRightColumnBlocks } from './rightColumn';

/**
 * 创建示例简历（Kelly Blackwell 风格）
 * 使用基础组件 + 弹性盒子 + 自定义装饰搭建
 */
export function createSampleResume(): Resume {
  const resumeId = `resume-${uuid().slice(0, 8)}`;

  const colorScheme: ColorScheme = {
    id: 'cs-sample-blue',
    name: '示例蓝',
    primary: '#2c7bb6',
    secondary: '#e6f2ff',
    background: '#ffffff',
    blockBackground: '#f8faff',
    textPrimary: '#1f2937',
    textSecondary: '#4b5563',
    textMuted: '#9ca3af',
    accent: '#2c7bb6',
    isPreset: false,
  };

  const canvas: CanvasConfig = {
    width: CANVAS_DEFAULT_WIDTH,
    height: CANVAS_DEFAULT_HEIGHT,
    padding: CANVAS_DEFAULT_PADDING,
    background: CANVAS_DEFAULT_BACKGROUND,
  };

  let zIndex = 1;
  const nextZ = () => zIndex++;

  const padding = CANVAS_DEFAULT_PADDING;

  // 组合所有块
  const blocks = [
    ...createHeaderBlocks(resumeId, padding, nextZ),
  ];

  // 左侧栏
  const leftX = padding + 20;
  const leftStartY = padding + 160;
  const { blocks: leftBlocks } = createLeftColumnBlocks(resumeId, leftX, leftStartY, nextZ);
  blocks.push(...leftBlocks);

  // 右侧栏
  const rightX = padding + 260;
  const rightStartY = padding + 160;
  const { blocks: rightBlocks } = createRightColumnBlocks(resumeId, rightX, rightStartY, nextZ);
  blocks.push(...rightBlocks);

  return {
    id: resumeId,
    name: 'Kelly Blackwell - Administrative Assistant',
    title: 'Kelly Blackwell - Administrative Assistant',
    blocks,
    groups: [],
    colorScheme,
    canvas,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastSavedAt: null,
    version: CURRENT_DATA_VERSION,
  };
}

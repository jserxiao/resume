/**
 * 简历数据 Slice
 * 管理简历本身的 CRUD、配色方案、画布配置、JSON 导入导出
 */
import { produce } from 'immer';
import { v4 as uuid } from 'uuid';
import type {
  Resume,
  ColorScheme,
  CanvasConfig,
  CustomDecorationDefinition,
} from '../../types';
import type { StoreSet, StoreGet, ResumeStoreInternal } from '../types';
import {
  CANVAS_DEFAULT_WIDTH,
  CANVAS_DEFAULT_HEIGHT,
  CANVAS_DEFAULT_PADDING,
  CANVAS_DEFAULT_BACKGROUND,
  CURRENT_DATA_VERSION,
} from '../../utils/constants';
import { restoreFromJSON } from '../../utils/migration';
import { createSampleResume } from '@/templates/temp1';

// ========== 默认画布配置 ==========
export const DEFAULT_CANVAS: CanvasConfig = {
  width: CANVAS_DEFAULT_WIDTH,
  height: CANVAS_DEFAULT_HEIGHT,
  padding: CANVAS_DEFAULT_PADDING,
  background: CANVAS_DEFAULT_BACKGROUND,
};

// ========== Slice 类型 ==========
export interface ResumeSlice {
  // 数据
  resume: Resume | null;
  customColorSchemes: ColorScheme[];
  customDecorations: CustomDecorationDefinition[];

  // 简历初始化
  initResume: (title: string, colorScheme: ColorScheme) => void;
  initSampleResume: () => void;
  clearResume: () => void;

  // 简历操作
  setResumeTitle: (title: string) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setCanvasConfig: (config: Partial<CanvasConfig>) => void;
  markSaved: () => void;

  // JSON 导入
  importFromJSON: (json: Record<string, unknown>) => void;

  // 配色方案操作
  addCustomColorScheme: (scheme: ColorScheme) => void;
  removeCustomColorScheme: (schemeId: string) => void;

  // 自定义装饰元素操作
  saveCustomDecoration: (decoration: CustomDecorationDefinition) => void;
  removeCustomDecoration: (decorationId: string) => void;
}

// ========== Slice 实现 ==========
export const createResumeSlice = (set: StoreSet, _get: StoreGet): ResumeSlice => ({
  resume: null,
  customColorSchemes: [],
  customDecorations: [],

  initResume: (title, colorScheme) =>
    set(produce<ResumeStoreInternal>((state) => {
      const resumeId = uuid();
      state.resume = {
        id: resumeId,
        name: title,
        title,
        blocks: [],
        groups: [],
        colorScheme,
        canvas: { ...DEFAULT_CANVAS },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSavedAt: null,
        version: CURRENT_DATA_VERSION,
      };
      // 清除编辑器选中状态（通过 editor slice 处理，这里只清除 resume）
    })),

  initSampleResume: () =>
    set(produce<ResumeStoreInternal>((state) => {
      state.resume = createSampleResume();
    })),

  clearResume: () =>
    set(produce<ResumeStoreInternal>((state) => {
      state.resume = null;
    })),

  setResumeTitle: (title) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      state.resume.title = title;
      state.resume.updatedAt = Date.now();
    })),

  setColorScheme: (scheme) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      state.resume.colorScheme = scheme;
      state.resume.updatedAt = Date.now();
    })),

  setCanvasConfig: (config) =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      for (const [key, value] of Object.entries(config)) {
        if (value === undefined) {
          delete (state.resume.canvas as Record<string, unknown>)[key];
        } else {
          (state.resume.canvas as Record<string, unknown>)[key] = value;
        }
      }
      state.resume.updatedAt = Date.now();
    })),

  markSaved: () =>
    set(produce<ResumeStoreInternal>((state) => {
      if (!state.resume) return;
      state.resume.lastSavedAt = Date.now();
    })),

  importFromJSON: (json) =>
    set(produce<ResumeStoreInternal>((state) => {
      try {
        const resume = restoreFromJSON(json);
        state.resume = resume;
      } catch (e) {
        console.error('导入 JSON 失败:', e);
      }
    })),

  addCustomColorScheme: (scheme) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.customColorSchemes.push(scheme);
    })),

  removeCustomColorScheme: (schemeId) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.customColorSchemes = state.customColorSchemes.filter((s) => s.id !== schemeId);
    })),

  saveCustomDecoration: (decoration) =>
    set(produce<ResumeStoreInternal>((state) => {
      const idx = state.customDecorations.findIndex((d) => d.id === decoration.id);
      if (idx !== -1) {
        state.customDecorations[idx] = { ...decoration, updatedAt: Date.now() };
      } else {
        state.customDecorations.push({ ...decoration, createdAt: Date.now(), updatedAt: Date.now() });
      }
    })),

  removeCustomDecoration: (decorationId) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.customDecorations = state.customDecorations.filter((d) => d.id !== decorationId);
    })),
});

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
  // ===== 数据 =====
  /** 当前简历数据，null 表示尚未创建/加载 */
  resume: Resume | null;
  /** 用户自定义配色方案列表 */
  customColorSchemes: ColorScheme[];
  /** 用户自定义装饰元素定义列表 */
  customDecorations: CustomDecorationDefinition[];

  // ===== 简历初始化 =====
  /**
   * 创建一份空白简历
   * @param title - 简历标题
   * @param colorScheme - 初始配色方案
   */
  initResume: (title: string, colorScheme: ColorScheme) => void;
  /**
   * 使用内置示例简历初始化（用于首次体验引导）
   * @param canvasOverrides - 可选的画布配置覆盖项，padding 等将用于定位块的位置
   */
  initSampleResume: (canvasOverrides?: Partial<CanvasConfig>) => void;
  /** 清除当前简历数据，回到初始状态 */
  clearResume: () => void;

  // ===== 简历操作 =====
  /**
   * 修改简历标题
   * @param title - 新标题
   */
  setResumeTitle: (title: string) => void;
  /**
   * 设置当前简历的配色方案（会更新所有使用主题色的元素）
   * @param scheme - 新配色方案
   */
  setColorScheme: (scheme: ColorScheme) => void;
  /**
   * 更新画布配置（合并更新，仅修改传入的字段）
   * @param config - 要更新的画布配置片段
   */
  setCanvasConfig: (config: Partial<CanvasConfig>) => void;
  /** 标记当前简历为已保存状态（更新 lastSavedAt 时间戳） */
  markSaved: () => void;

  // ===== JSON 导入 =====
  /**
   * 从 JSON 对象导入简历数据（会经过迁移层处理版本兼容）
   * @param json - 简历数据的 JSON 对象
   */
  importFromJSON: (json: Record<string, unknown>) => void;

  // ===== 配色方案操作 =====
  /**
   * 添加用户自定义配色方案
   * @param scheme - 配色方案数据
   */
  addCustomColorScheme: (scheme: ColorScheme) => void;
  /**
   * 删除用户自定义配色方案
   * @param schemeId - 配色方案ID
   */
  removeCustomColorScheme: (schemeId: string) => void;

  // ===== 自定义装饰元素操作 =====
  /**
   * 保存自定义装饰元素（已存在则更新，否则新增）
   * @param decoration - 装饰元素定义数据
   */
  saveCustomDecoration: (decoration: CustomDecorationDefinition) => void;
  /**
   * 删除自定义装饰元素
   * @param decorationId - 装饰元素ID
   */
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

  initSampleResume: (canvasOverrides) =>
    set(produce<ResumeStoreInternal>((state) => {
      state.resume = createSampleResume(canvasOverrides);
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

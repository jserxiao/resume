import type { Resume, BlockInstance, BlockTemplate, LayoutConfig } from '@/types';
import {
  CANVAS_DEFAULT_WIDTH,
  CANVAS_DEFAULT_HEIGHT,
  CANVAS_DEFAULT_PADDING,
  CANVAS_DEFAULT_BACKGROUND,
  CURRENT_DATA_VERSION,
} from './constants';
import { presetBlockTemplates } from './presets';

/**
 * 简历数据版本迁移与 JSON 恢复
 * 从 store 中抽取，降低 store 体积
 */

/** 将旧版本 Resume 数据迁移到当前版本 */
export function migrateResume(data: Record<string, unknown>): Resume {
  let version = (data.version as number) || 1;

  // v1 → v2: 增加 order、templateName，column 从可选变为必填
  if (version < 2) {
    const blocks = (data.blocks as BlockInstance[]) || [];
    const columns: ('header' | 'left' | 'right')[] = ['header', 'left', 'right'];
    for (const col of columns) {
      const colBlocks = blocks
        .filter((b) => ((b as unknown as Record<string, unknown>).column || 'right') === col)
        .sort(() => 0);
      colBlocks.forEach((b, i) => {
        (b as any).column = (b as any).column || 'right';
        (b as any).order = i;
        b.templateName = b.templateName || b.name || '';
      });
    }
    data.blocks = blocks;
    data.version = 2;
    version = 2;
  }

  // v2 → v3: 增加 decorations 字段
  if (version < 3) {
    const blocks = (data.blocks as BlockInstance[]) || [];
    for (const block of blocks) {
      if (!block.decorations) {
        block.decorations = [];
      }
    }
    data.blocks = blocks;
    data.version = 3;
    version = 3;
  }

  // v3 → v4: 移除布局概念，改为自由定位
  if (version < 4) {
    const blocks = (data.blocks as any[]) || [];
    const layout = data.layout as LayoutConfig | undefined;

    const canvasWidth = CANVAS_DEFAULT_WIDTH;
    const canvasHeight = CANVAS_DEFAULT_HEIGHT;
    const padding = CANVAS_DEFAULT_PADDING;

    // 将旧的column布局转为自由定位
    let currentY = padding;

    // 先处理header块
    const headerBlocks = blocks.filter((b) => b.column === 'header');
    for (const block of headerBlocks) {
      block.x = padding;
      block.y = currentY;
      block.width = canvasWidth - padding * 2;
      block.height = 100;
      block.zIndex = 1;
      currentY += 100 + 12;
    }

    if (layout && (layout.type === 'double' || layout.type === 'mixed')) {
      // 双栏布局 → 自由定位
      const leftRatio = layout.columnRatio[0] / 100;
      const leftWidth = (canvasWidth - padding * 2 - 20) * leftRatio;
      const rightWidth = (canvasWidth - padding * 2 - 20) * (1 - leftRatio);
      const leftX = padding;
      const rightX = padding + leftWidth + 20;

      let leftY = currentY;
      let rightY = currentY;

      const leftBlocks = blocks.filter((b) => b.column === 'left');
      for (const block of leftBlocks) {
        block.x = leftX;
        block.y = leftY;
        block.width = leftWidth;
        block.height = 120;
        block.zIndex = 1;
        leftY += 120 + 8;
      }

      const rightBlocks = blocks.filter((b) => b.column === 'right');
      for (const block of rightBlocks) {
        block.x = rightX;
        block.y = rightY;
        block.width = rightWidth;
        block.height = 120;
        block.zIndex = 1;
        rightY += 120 + 8;
      }
    } else {
      // 单栏布局
      const rightBlocks = blocks.filter((b) => b.column === 'right');
      for (const block of rightBlocks) {
        block.x = padding;
        block.y = currentY;
        block.width = canvasWidth - padding * 2;
        block.height = 120;
        block.zIndex = 1;
        currentY += 120 + 8;
      }
    }

    // 清除旧的column和order属性
    for (const block of blocks) {
      delete (block as any).column;
      delete (block as any).order;
      if (!block.x) block.x = padding;
      if (!block.y) block.y = padding;
      if (!block.width) block.width = 300;
      if (!block.height) block.height = 120;
      if (!block.zIndex) block.zIndex = 1;
    }

    data.blocks = blocks;
    data.canvas = {
      width: canvasWidth,
      height: canvasHeight,
      padding,
      background: CANVAS_DEFAULT_BACKGROUND,
    };
    data.groups = [];
    delete data.layout;
    delete data.layoutId;
    data.version = 4;
    version = 4;
  }

  // 未来版本迁移写在这里：
  // if (version < 5) { ... }

  return data as unknown as Resume;
}

/** 按字段名称将旧字段值映射到新模板字段 ID */
export function remapFields(
  oldFields: Record<string, string>,
  template: BlockTemplate,
  fieldNamesMap?: Record<string, string>,
): Record<string, string> {
  const newFields: Record<string, string> = {};

  // 初始化所有字段的默认值
  for (const f of template.fields) {
    newFields[f.id] = f.defaultValue || '';
  }

  // 构建新模板的 fieldName -> fieldId 映射
  const nameToNewId: Record<string, string> = {};
  for (const f of template.fields) {
    nameToNewId[f.name] = f.id;
  }

  // 如果有 fieldNamesMap（fieldId -> fieldName），利用它进行名称映射
  if (fieldNamesMap) {
    for (const [oldFieldId, value] of Object.entries(oldFields)) {
      const fieldName = fieldNamesMap[oldFieldId];
      if (fieldName && nameToNewId[fieldName] !== undefined) {
        newFields[nameToNewId[fieldName]] = value;
      }
    }
    return newFields;
  }

  // 没有 fieldNamesMap 时，先按 ID 直接匹配
  for (const f of template.fields) {
    if (oldFields[f.id] !== undefined) {
      newFields[f.id] = oldFields[f.id];
    }
  }

  return newFields;
}

/** 从导入的 JSON 中恢复 Resume，同时尝试映射旧模板/字段 ID */
export function restoreFromJSON(json: Record<string, unknown>): Resume {
  const migrated = migrateResume(json);
  const templates = presetBlockTemplates;

  // 尝试修复：如果 templateId 在当前模板中找不到，通过 templateName 模糊匹配
  for (const block of migrated.blocks) {
    const matched = templates.find((t) => t.id === block.templateId);
    if (!matched) {
      // 优先按 templateName 匹配
      const byName = templates.find((t) => t.name === block.templateName);
      if (byName) {
        block.templateId = byName.id;
        // 利用 fieldNamesMap 按名称映射字段
        block.fields = remapFields(block.fields, byName, block.fieldNamesMap);
      }
    } else {
      // 模板 ID 存在，但字段 ID 可能已变
      block.fields = remapFields(block.fields, matched, block.fieldNamesMap);
    }
  }

  return migrated;
}

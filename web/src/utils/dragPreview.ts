import type { BlockTemplate, ColorScheme } from '@/types';
import { FieldType } from '@/types';
import { getDefaultBlockWidth, getDefaultBlockHeight } from './constants';

/**
 * 创建拖拽预览 DOM 元素，样式与 FreeBlockCard 一致
 * 返回的元素需要在使用后从 document 中移除
 */

/** 渲染单个字段的占位文本 */
function renderFieldPlaceholder(field: { name: string; type: FieldType; placeholder: string }): string {
  const { name, type, placeholder } = field;
  switch (type) {
    case FieldType.Image:
      return `<div style="width:40px;height:40px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:14px;flex-shrink:0">📷</div>`;
    case FieldType.TagList:
      return `<div style="display:flex;gap:4px;flex-wrap:wrap"><span style="background:#d1e0ff;color:#1a56db;padding:1px 6px;border-radius:3px;font-size:10px">标签1</span><span style="background:#d1e0ff;color:#1a56db;padding:1px 6px;border-radius:3px;font-size:10px">标签2</span></div>`;
    case FieldType.Rating:
      return `<span style="color:#f59e0b;font-size:12px">★★★☆☆</span>`;
    case FieldType.Date:
      return `<span style="color:#9ca3af;font-style:italic;font-size:11px">${placeholder || '选择日期'}</span>`;
    case FieldType.TextArea:
    case FieldType.RichText:
      return `<span style="color:#9ca3af;font-style:italic;font-size:11px">${placeholder || name + '...'}</span>`;
    case FieldType.Select:
      return `<span style="color:#9ca3af;font-style:italic;font-size:11px">${placeholder || '请选择'}</span>`;
    case FieldType.Link:
      return `<span style="color:#6366f1;text-decoration:underline;font-size:11px">${placeholder || '输入链接'}</span>`;
    case FieldType.Switch:
      return `<span style="font-size:11px">☐</span>`;
    default:
      return `<span style="color:#9ca3af;font-style:italic;font-size:11px">${placeholder || name + '...'}</span>`;
  }
}

/** 根据模板名称判断渲染类型 */
type TemplateLayout = 'header' | 'basic' | 'skills' | 'default';

function getTemplateLayout(templateName: string): TemplateLayout {
  if (templateName === '头部信息') return 'header';
  if (templateName === '基本信息') return 'basic';
  if (templateName === '技能') return 'skills';
  return 'default';
}

/** 渲染头部信息布局 */
function renderHeaderLayout(fields: BlockTemplate['fields']): string {
  const avatarField = fields.find(f => f.name === '头像');
  const nameField = fields.find(f => f.name === '姓名');
  const titleField = fields.find(f => f.name === '职位');
  const bioField = fields.find(f => f.name === '一句话简介');
  const contactFields = fields.filter(f => !['头像', '姓名', '职位', '一句话简介'].includes(f.name));

  const avatar = avatarField ? renderFieldPlaceholder(avatarField) : '';
  const name = nameField ? `<div style="font-size:16px;font-weight:700;color:#1f2937;line-height:1.3">${nameField.placeholder || '输入姓名'}</div>` : '';
  const title = titleField ? `<div style="font-size:12px;color:#4b5563;margin-top:2px">${titleField.placeholder || '输入职位'}</div>` : '';
  const bio = bioField ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">${bioField.placeholder || '一句话介绍'}</div>` : '';
  const contacts = contactFields.map(f =>
    `<span style="color:#4b5563;font-size:11px">${f.placeholder || f.name}</span>`
  ).join('<span style="color:#d1d5db;margin:0 4px">·</span>');

  return `
    <div style="display:flex;align-items:center;gap:12px;height:100%">
      ${avatar}
      <div style="flex:1;min-width:0;overflow:hidden">
        ${name}${title}${bio}
        ${contacts ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;font-size:11px">${contacts}</div>` : ''}
      </div>
    </div>
  `;
}

/** 渲染基本信息布局 */
function renderBasicLayout(fields: BlockTemplate['fields']): string {
  const avatarField = fields.find(f => f.type === FieldType.Image);
  const nameField = fields.find(f => f.name === '姓名');
  const contactFields = fields.filter(f => f.name !== '姓名' && f.type !== FieldType.Image);

  const avatar = avatarField ? renderFieldPlaceholder(avatarField) : '';
  const name = nameField ? `<div style="font-size:14px;font-weight:700;margin-bottom:4px">${nameField.placeholder || '输入姓名'}</div>` : '';
  const contacts = contactFields.map(f =>
    `<span style="color:#4b5563;font-size:11px"><span style="color:#9ca3af">${f.name}:</span> ${f.placeholder || ''}</span>`
  ).join('<span style="color:#d1d5db;margin:0 4px">·</span>');

  return `
    <div style="display:flex;align-items:center;gap:10px">
      ${avatar}
      <div style="flex:1;min-width:0">
        ${name}
        <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:11px">${contacts}</div>
      </div>
    </div>
  `;
}

/** 渲染技能布局 */
function renderSkillsLayout(fields: BlockTemplate['fields']): string {
  const items = fields.map(f => {
    const level = f.type === FieldType.Rating ? ' ★★★☆☆' : '';
    return `<span style="background:#d1e0ff;color:#1a56db;padding:2px 8px;border-radius:4px;font-size:11px">${f.placeholder || f.name}${level}</span>`;
  }).join(' ');
  return `<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${items}</div>`;
}

/** 渲染通用布局 */
function renderDefaultLayout(fields: BlockTemplate['fields']): string {
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);
  let html = '';
  let currentTimeGroup = '';

  for (const field of sortedFields) {
    const isTitleField = ['公司名', '学校', '项目名', '名称'].includes(field.name);
    const isTimeField = ['开始时间', '结束时间', '时间'].includes(field.name);
    const isSubtitleField = ['职位', '学位', '专业', '角色'].includes(field.name);

    if (isTitleField) {
      html += `<div style="font-size:13px;font-weight:600;color:#1f2937;margin-bottom:2px;display:flex;align-items:baseline;gap:6px">${field.placeholder || field.name}</div>`;
    } else if (isTimeField) {
      currentTimeGroup += `<span style="font-size:11px;color:#9ca3af">${field.placeholder || field.name}</span>`;
      if (field.name === '开始时间') {
        currentTimeGroup += `<span style="font-size:11px;color:#9ca3af"> - </span>`;
      }
    } else if (isSubtitleField) {
      if (currentTimeGroup) {
        html += `<div style="margin-bottom:2px">${currentTimeGroup}</div>`;
        currentTimeGroup = '';
      }
      html += `<div style="font-size:12px;color:#4b5563;margin-bottom:4px">${field.placeholder || field.name}</div>`;
    } else if (field.name === '是否至今') {
      // skip
    } else {
      if (currentTimeGroup) {
        html += `<div style="margin-bottom:2px">${currentTimeGroup}</div>`;
        currentTimeGroup = '';
      }
      html += `<div style="display:flex;gap:6px;margin-bottom:2px;font-size:12px;line-height:1.5">
        <span style="color:#9ca3af;flex-shrink:0;min-width:48px">${field.name}</span>
        <span style="color:#9ca3af;font-style:italic;font-size:11px">${field.placeholder || field.name + '...'}</span>
      </div>`;
    }
  }

  if (currentTimeGroup) {
    html += `<div style="margin-bottom:2px">${currentTimeGroup}</div>`;
  }

  return `<div style="overflow:hidden">${html}</div>`;
}

/**
 * 创建块模板的拖拽预览元素
 */
export function createBlockDragPreview(
  template: BlockTemplate,
  colorScheme: ColorScheme,
): HTMLElement {
  const width = getDefaultBlockWidth(template.category);
  const height = getDefaultBlockHeight(template.name);
  const fields = [...template.fields].sort((a, b) => a.order - b.order);
  const layout = getTemplateLayout(template.name);

  let contentHtml = '';
  switch (layout) {
    case 'header':
      contentHtml = renderHeaderLayout(fields);
      break;
    case 'basic':
      contentHtml = renderBasicLayout(fields);
      break;
    case 'skills':
      contentHtml = renderSkillsLayout(fields);
      break;
    default:
      contentHtml = renderDefaultLayout(fields);
      break;
  }

  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: ${width}px;
    height: ${height}px;
    background: ${colorScheme.blockBackground};
    border-radius: 6px;
    border: 1.5px solid ${colorScheme.primary};
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    padding: 8px;
    font-size: 12px;
    line-height: 1.4;
    color: ${colorScheme.textPrimary};
    overflow: hidden;
    pointer-events: none;
  `;

  el.innerHTML = contentHtml;
  document.body.appendChild(el);

  return el;
}

/**
 * 创建自定义元素模板的拖拽预览元素
 */
export function createCustomElementDragPreview(
  template: { name: string; blocks: { width: number; height: number; relativeX: number; relativeY: number }[] },
  colorScheme: ColorScheme,
): HTMLElement {
  // 计算包含所有块的边界框
  const minX = Math.min(...template.blocks.map(b => b.relativeX));
  const minY = Math.min(...template.blocks.map(b => b.relativeY));
  const maxX = Math.max(...template.blocks.map(b => b.relativeX + b.width));
  const maxY = Math.max(...template.blocks.map(b => b.relativeY + b.height));
  const totalW = maxX - minX;
  const totalH = maxY - minY;

  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: ${totalW}px;
    height: ${totalH}px;
    pointer-events: none;
    opacity: 0.9;
  `;

  // 渲染每个子块
  for (const block of template.blocks) {
    const blockEl = document.createElement('div');
    blockEl.style.cssText = `
      position: absolute;
      left: ${block.relativeX - minX}px;
      top: ${block.relativeY - minY}px;
      width: ${block.width}px;
      height: ${block.height}px;
      background: ${colorScheme.blockBackground};
      border-radius: 6px;
      border: 1.5px solid ${colorScheme.primary};
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      overflow: hidden;
    `;
    el.appendChild(blockEl);
  }

  document.body.appendChild(el);
  return el;
}

/**
 * 创建分组的拖拽预览元素
 */
export function createGroupDragPreview(
  group: { name: string; blockIds: string[] },
  blocks: { id: string; x: number; y: number; width: number; height: number }[],
  colorScheme: ColorScheme,
): HTMLElement {
  const groupBlocks = blocks.filter(b => group.blockIds.includes(b.id));
  if (groupBlocks.length === 0) {
    // fallback
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; top: -9999px; left: -9999px;
      width: 100px; height: 60px;
      background: ${colorScheme.blockBackground}; border-radius: 6px;
      border: 1.5px dashed ${colorScheme.primary};
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: #9ca3af;
      pointer-events: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    `;
    el.textContent = group.name;
    document.body.appendChild(el);
    return el;
  }

  const minX = Math.min(...groupBlocks.map(b => b.x));
  const minY = Math.min(...groupBlocks.map(b => b.y));
  const maxX = Math.max(...groupBlocks.map(b => b.x + b.width));
  const maxY = Math.max(...groupBlocks.map(b => b.y + b.height));
  const totalW = maxX - minX;
  const totalH = maxY - minY;

  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: ${totalW}px; height: ${totalH}px;
    pointer-events: none; opacity: 0.9;
  `;

  for (const block of groupBlocks) {
    const blockEl = document.createElement('div');
    blockEl.style.cssText = `
      position: absolute;
      left: ${block.x - minX}px; top: ${block.y - minY}px;
      width: ${block.width}px; height: ${block.height}px;
      background: ${colorScheme.blockBackground}; border-radius: 6px;
      border: 1.5px solid ${colorScheme.primary};
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      overflow: hidden;
    `;
    el.appendChild(blockEl);
  }

  document.body.appendChild(el);
  return el;
}

/** 清理拖拽预览元素 */
export function cleanupDragPreview(el: HTMLElement) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

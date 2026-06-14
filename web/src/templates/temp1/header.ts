import type { BlockInstance } from '@/types';
import { v4 as uuid } from 'uuid';

/**
 * 创建顶部 Header 区域（蓝色背景 + 头像 + 姓名 + 职位）
 */
export function createHeaderBlocks(resumeId: string, padding: number, nextZ: () => number): BlockInstance[] {
  const contentWidth = 794 - padding * 2;

  return [
    // 顶部蓝色背景
    {
      id: `${resumeId}-header-bg`,
      templateId: 'tpl-text',
      templateName: '文本框',
      name: '顶部背景',
      fields: { 'text-content': '' },
      fieldNamesMap: { 'text-content': '内容' },
      decorations: [{
        id: uuid(),
        decorationId: 'deco-rectangle',
        x: 0, y: 0,
        width: contentWidth, height: 140,
        rotation: 0,
        color: '#2c7bb6',
        strokeColor: '#2c7bb6',
        strokeWidth: 0,
        opacity: 1,
        zIndex: 1,
      }],
      visible: true, locked: false,
      x: padding, y: padding,
      width: contentWidth, height: 140,
      zIndex: nextZ(),
      style: {
        backgroundColor: '#2c7bb6',
        borderRadius: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    },
    // 头像
    {
      id: `${resumeId}-avatar`,
      templateId: 'tpl-avatar',
      templateName: '头像',
      name: '头像',
      fields: {
        'avatar-src': '',
        'avatar-shape': 'circle',
        'avatar-border-width': '3',
        'avatar-border-color': '#ffffff',
      },
      fieldNamesMap: {
        'avatar-src': '头像图片',
        'avatar-shape': '形状',
        'avatar-border-width': '边框宽度',
        'avatar-border-color': '边框颜色',
      },
      decorations: [],
      visible: true, locked: false,
      x: padding + 30, y: padding + 30,
      width: 80, height: 80,
      zIndex: nextZ(),
      style: {
        backgroundColor: 'transparent',
        borderRadius: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    },
    // 姓名
    {
      id: `${resumeId}-name`,
      templateId: 'tpl-text',
      templateName: '文本框',
      name: '姓名',
      fields: { 'text-content': '<p style="font-size:28px;font-weight:700;color:#ffffff;margin:0;">KELLY BLACKWELL</p>' },
      fieldNamesMap: { 'text-content': '内容' },
      decorations: [],
      visible: true, locked: false,
      x: padding + 130, y: padding + 35,
      width: 400, height: 40,
      zIndex: nextZ(),
      style: {
        backgroundColor: 'transparent',
        color: '#ffffff',
        borderRadius: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    },
    // 职位
    {
      id: `${resumeId}-job-title`,
      templateId: 'tpl-text',
      templateName: '文本框',
      name: '职位',
      fields: { 'text-content': '<p style="font-size:14px;letter-spacing:2px;color:#ffffff;margin:0;">Administrative Assistant</p>' },
      fieldNamesMap: { 'text-content': '内容' },
      decorations: [],
      visible: true, locked: false,
      x: padding + 130, y: padding + 80,
      width: 400, height: 30,
      zIndex: nextZ(),
      style: {
        backgroundColor: 'transparent',
        color: '#ffffff',
        borderRadius: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    },
  ];
}

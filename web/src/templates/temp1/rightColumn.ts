import type { BlockInstance } from '@/types';

/**
 * 创建右侧栏（专业总结 + 工作经历 + 教育背景）
 */
export function createRightColumnBlocks(
  resumeId: string,
  rightX: number,
  startY: number,
  nextZ: () => number
): { blocks: BlockInstance[]; finalY: number } {
  const blocks: BlockInstance[] = [];
  let currentY = startY;

  // PROFESSIONAL SUMMARY 标题
  blocks.push(createTextBlock(resumeId, 'summary-title', '专业总结标题', rightX, currentY, 450, 28,
    '<p style="font-size:16px;font-weight:700;color:#2c7bb6;margin:0;">PROFESSIONAL SUMMARY</p>', nextZ()));
  currentY += 30;

  // 专业总结内容
  blocks.push(createTextBlock(resumeId, 'summary-content', '专业总结内容', rightX, currentY, 450, 80,
    '<p style="font-size:11px;color:#4b5563;line-height:1.6;margin:0;">Administrative assistant with 9+ years of experience organizing presentations, preparing facility reports, and maintaining the utmost confidentiality. Possess a B.A. in history and expertise in Microsoft Excel. Looking to leverage my wealth of knowledge and experience into the open administrative assistant role at your organization.</p>',
    nextZ()));
  currentY += 90;

  // EXPERIENCE 标题
  blocks.push(createTextBlock(resumeId, 'exp-title', '工作经历标题', rightX, currentY, 450, 28,
    '<p style="font-size:16px;font-weight:700;color:#2c7bb6;margin:0;">EXPERIENCE</p>', nextZ()));
  currentY += 32;

  // 工作经历1
  blocks.push(createTextBlock(resumeId, 'exp1-title', '工作经历1标题', rightX, currentY, 450, 20,
    '<p style="font-size:13px;font-weight:700;color:#1f2937;margin:0;">Administrative Assistant <span style="float:right;font-weight:400;color:#9ca3af;font-size:11px;">Sep 2017 – Present</span></p>',
    nextZ()));
  currentY += 22;

  blocks.push(createTextBlock(resumeId, 'exp1-company', '工作经历1公司', rightX, currentY, 450, 18,
    '<p style="font-size:11px;color:#4b5563;margin:0;">Redford & Sons <span style="float:right;color:#9ca3af;">Boston, MA</span></p>',
    nextZ()));
  currentY += 22;

  const exp1Desc = [
    'Schedule and coordinate meetings, appointments, and travel arrangements for supervisors, managers, and C-level executives',
    'Trained 2 administrative assistants during a period of company expansion to ensure attention to detail and adherence to company',
    'Developed new filing and organizational practices, saving the company $3,000 per year in contracted labor expenses',
  ];
  exp1Desc.forEach((desc, idx) => {
    blocks.push(createTextBlock(resumeId, `exp1-desc-${idx}`, `工作经历1描述-${idx}`, rightX + 10, currentY + idx * 28, 440, 26,
      `<p style="font-size:11px;color:#4b5563;line-height:1.5;margin:0 0 4px 0;">• ${desc}</p>`, nextZ()));
  });
  currentY += exp1Desc.length * 28 + 10;

  // 工作经历2
  blocks.push(createTextBlock(resumeId, 'exp2-title', '工作经历2标题', rightX, currentY, 450, 20,
    '<p style="font-size:13px;font-weight:700;color:#1f2937;margin:0;">Secretary <span style="float:right;font-weight:400;color:#9ca3af;font-size:11px;">Jun 2016 – Aug 2017</span></p>',
    nextZ()));
  currentY += 22;

  blocks.push(createTextBlock(resumeId, 'exp2-company', '工作经历2公司', rightX, currentY, 450, 18,
    '<p style="font-size:11px;color:#4b5563;margin:0;">Bright Spot LTD <span style="float:right;color:#9ca3af;">Boston, MA</span></p>',
    nextZ()));
  currentY += 22;

  const exp2Desc = [
    'Typed documents such as correspondence, drafts, memos, and emails, and prepared 3 reports weekly for management',
    'Opened, sorted, and distributed incoming messages and correspondence to the appropriate personnel',
    'Purchased and maintained office supply inventories, and always careful to adhere to budgeting practices',
    'Greeted visitors and determined to whom and when they could speak with specific individuals',
  ];
  exp2Desc.forEach((desc, idx) => {
    blocks.push(createTextBlock(resumeId, `exp2-desc-${idx}`, `工作经历2描述-${idx}`, rightX + 10, currentY + idx * 28, 440, 26,
      `<p style="font-size:11px;color:#4b5563;line-height:1.5;margin:0 0 4px 0;">• ${desc}</p>`, nextZ()));
  });
  currentY += exp2Desc.length * 28 + 15;

  // EDUCATION 标题
  blocks.push(createTextBlock(resumeId, 'edu-title', '教育背景标题', rightX, currentY, 450, 28,
    '<p style="font-size:16px;font-weight:700;color:#2c7bb6;margin:0;">EDUCATION</p>', nextZ()));
  currentY += 32;

  // 教育1
  blocks.push(createTextBlock(resumeId, 'edu1', '教育1', rightX, currentY, 450, 40,
    '<p style="font-size:12px;font-weight:700;color:#1f2937;margin:0;">Bachelor of Arts (B.A.) in Finance <span style="float:right;font-weight:400;color:#9ca3af;font-size:11px;">05/2009</span></p><p style="font-size:11px;color:#4b5563;margin:4px 0 0 0;">Brown University <span style="float:right;color:#9ca3af;">Providence, RI</span></p>',
    nextZ()));
  currentY += 48;

  // 教育2
  blocks.push(createTextBlock(resumeId, 'edu2', '教育2', rightX, currentY, 450, 40,
    '<p style="font-size:12px;font-weight:700;color:#1f2937;margin:0;">Associate of Arts in Business <span style="float:right;font-weight:400;color:#9ca3af;font-size:11px;">05/2007</span></p><p style="font-size:11px;color:#4b5563;margin:4px 0 0 0;">San Antonio Community College <span style="float:right;color:#9ca3af;">San Antonio, TX</span></p>',
    nextZ()));
  currentY += 48;

  return { blocks, finalY: currentY };
}

function createTextBlock(
  resumeId: string,
  suffix: string,
  name: string,
  x: number, y: number,
  width: number, height: number,
  content: string,
  zIndex: number
): BlockInstance {
  return {
    id: `${resumeId}-${suffix}`,
    templateId: 'tpl-text',
    templateName: '文本框',
    name,
    fields: { 'text-content': content },
    fieldNamesMap: { 'text-content': '内容' },
    decorations: [],
    visible: true, locked: false,
    x, y, width, height, zIndex,
    style: {
      backgroundColor: 'transparent',
      borderRadius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
}

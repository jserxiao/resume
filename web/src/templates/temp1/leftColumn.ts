import type { BlockInstance } from '@/types';

/**
 * 创建左侧栏（联系信息 + 技能 + 证书）
 */
export function createLeftColumnBlocks(
  resumeId: string,
  leftX: number,
  startY: number,
  nextZ: () => number
): { blocks: BlockInstance[]; finalY: number } {
  const blocks: BlockInstance[] = [];
  let currentY = startY;

  // CONTACT 标题
  blocks.push(createTextBlock(resumeId, 'contact-title', '联系信息标题', leftX, currentY, 200, 28,
    '<p style="font-size:16px;font-weight:700;color:#2c7bb6;margin:0;">CONTACT</p>', nextZ()));
  currentY += 35;

  // Phone
  blocks.push(createTextBlock(resumeId, 'phone-label', '电话标签', leftX, currentY, 200, 18,
    '<p style="font-size:11px;font-weight:600;color:#1f2937;margin:0;">Phone</p>', nextZ()));
  currentY += 18;
  blocks.push(createTextBlock(resumeId, 'phone-value', '电话值', leftX, currentY, 200, 18,
    '<p style="font-size:11px;color:#4b5563;margin:0;">(210) 286-1624</p>', nextZ()));
  currentY += 28;

  // Email
  blocks.push(createTextBlock(resumeId, 'email-label', '邮箱标签', leftX, currentY, 200, 18,
    '<p style="font-size:11px;font-weight:600;color:#1f2937;margin:0;">Email</p>', nextZ()));
  currentY += 18;
  blocks.push(createTextBlock(resumeId, 'email-value', '邮箱值', leftX, currentY, 200, 18,
    '<p style="font-size:11px;color:#4b5563;margin:0;">kelly.blackwell@gmail.com</p>', nextZ()));
  currentY += 28;

  // Address
  blocks.push(createTextBlock(resumeId, 'address-label', '地址标签', leftX, currentY, 200, 18,
    '<p style="font-size:11px;font-weight:600;color:#1f2937;margin:0;">Address</p>', nextZ()));
  currentY += 18;
  blocks.push(createTextBlock(resumeId, 'address-value', '地址值', leftX, currentY, 200, 18,
    '<p style="font-size:11px;color:#4b5563;margin:0;">San Antonio, TX 78023</p>', nextZ()));
  currentY += 40;

  // SKILLS 标题
  blocks.push(createTextBlock(resumeId, 'skills-title', '技能标题', leftX, currentY, 200, 28,
    '<p style="font-size:16px;font-weight:700;color:#2c7bb6;margin:0;">SKILLS</p>', nextZ()));
  currentY += 30;

  // 技能列表
  const skills = [
    'Analytical Thinking', 'Tolerant & Flexible', 'Team Leadership',
    'Organization & Prioritization', 'Strong Communication', 'Web app development',
    'Computer engineering', 'Web security', 'Critical thinking', 'Effective communication',
  ];
  skills.forEach((skill, idx) => {
    blocks.push(createTextBlock(resumeId, `skill-${idx}`, `技能-${skill}`, leftX, currentY + idx * 22, 200, 20,
      `<p style="font-size:11px;color:#1f2937;margin:0;">• ${skill}</p>`, nextZ()));
  });
  currentY += skills.length * 22 + 10;

  // CERTIFICATIONS 标题
  blocks.push(createTextBlock(resumeId, 'certs-title', '证书标题', leftX, currentY, 200, 28,
    '<p style="font-size:16px;font-weight:700;color:#2c7bb6;margin:0;">CERTIFICATIONS</p>', nextZ()));
  currentY += 30;

  // 证书列表
  const certs = [
    'CPR Certified / 2018', 'PMP Certified / 2009',
    'HIPPA Certified / 2018', 'CAA Certified / 2015',
  ];
  certs.forEach((cert, idx) => {
    blocks.push(createTextBlock(resumeId, `cert-${idx}`, `证书-${idx}`, leftX, currentY + idx * 20, 200, 18,
      `<p style="font-size:11px;color:#1f2937;margin:0;">• ${cert}</p>`, nextZ()));
  });
  currentY += certs.length * 20;

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

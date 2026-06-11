/**
 * Ant Design Icons 映射工具
 *
 * 提供 icon name -> React 组件的动态映射，
 * 以及所有可用图标名称列表（用于图标选择器）。
 */
import * as AllIcons from '@ant-design/icons';

/** 过滤出有效的图标组件名（首字母大写，排除非组件导出） */
const ICON_NAMES: string[] = Object.keys(AllIcons).filter((key) => {
  const val = AllIcons[key as keyof typeof AllIcons];
  return typeof val === 'object' && val !== null && key[0] === key[0].toUpperCase();
});

/** 按后缀自动分类（无重复） */
function categorizeIcons(names: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    '线框风格 (Outlined)': [],
    '实底风格 (Filled)': [],
    '双色风格 (TwoTone)': [],
  };

  const categorized = new Set<string>();

  for (const name of names) {
    if (categorized.has(name)) continue;
    categorized.add(name);

    if (name.endsWith('TwoTone')) {
      categories['双色风格 (TwoTone)'].push(name);
    } else if (name.endsWith('Filled')) {
      categories['实底风格 (Filled)'].push(name);
    } else {
      categories['线框风格 (Outlined)'].push(name);
    }
  }

  // 移除空分类
  for (const key of Object.keys(categories)) {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  }

  return categories;
}

const ICON_CATEGORIES: Record<string, string[]> = categorizeIcons(ICON_NAMES);

export { ICON_NAMES, ICON_CATEGORIES };

/**
 * 根据 icon name 渲染对应的 React 图标组件
 * @param iconName 图标名称（如 'StarOutlined'）
 * @param props 传递给图标组件的额外属性（如 style, className）
 * @returns React 节点，找不到时返回 null
 */
export function renderIconByName(
  iconName: string,
  props?: { style?: React.CSSProperties; className?: string; onClick?: (e: any) => void },
): React.ReactNode {
  if (!iconName) return null;
  const IconComp = (AllIcons as any)[iconName];
  if (!IconComp) return null;
  return <IconComp {...props} />;
}

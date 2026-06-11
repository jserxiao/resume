import { useState, useMemo } from 'react';
import { Input, Tabs, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ICON_CATEGORIES, renderIconByName } from '@/utils/iconMap';
import './AntdIconPicker.less';

interface AntdIconPickerProps {
  /** 当前选中的图标名称 */
  value?: string;
  /** 选择图标后的回调 */
  onChange?: (iconName: string) => void;
  /** 图标大小（px），默认 24 */
  iconSize?: number;
}

/**
 * Ant Design 图标选择器
 *
 * 按分类展示所有 antd 图标，支持搜索，点击选择。
 */
export default function AntdIconPicker({ value, onChange, iconSize = 24 }: AntdIconPickerProps) {
  const [searchText, setSearchText] = useState('');

  // 搜索过滤：跨分类搜索
  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return ICON_CATEGORIES;
    const lower = searchText.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [cat, names] of Object.entries(ICON_CATEGORIES)) {
      const matched = names.filter(
        (n) => n.toLowerCase().includes(lower) || n.replace(/Outlined$|Filled$|TwoTone$/g, '').toLowerCase().includes(lower),
      );
      if (matched.length > 0) {
        result[cat] = matched;
      }
    }
    return result;
  }, [searchText]);

  const categoryKeys = Object.keys(filteredCategories);

  const renderIconGrid = (names: string[]) => {
    if (names.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的图标" />;
    }
    return (
      <div className="antd-icon-picker-grid">
        {names.map((name) => (
          <div
            key={name}
            className={`antd-icon-picker-item ${value === name ? 'antd-icon-picker-item--active' : ''}`}
            title={name}
            onClick={() => onChange?.(name)}
          >
            {renderIconByName(name, { style: { fontSize: iconSize } })}
            <span className="antd-icon-picker-item-label">
              {name.replace(/Outlined$|Filled$|TwoTone$/g, '')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const tabItems = categoryKeys.map((cat) => ({
    key: cat,
    label: `${cat} (${filteredCategories[cat]?.length || 0})`,
    children: renderIconGrid(filteredCategories[cat] || []),
  }));

  return (
    <div className="antd-icon-picker">
      <Input
        placeholder="搜索图标..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
        size="small"
        className="antd-icon-picker-search"
      />
      {searchText.trim() ? (
        // 搜索时直接展示搜索结果
        renderIconGrid(Object.values(filteredCategories).flat())
      ) : (
        <Tabs
          size="small"
          items={tabItems}
          className="antd-icon-picker-tabs"
        />
      )}
    </div>
  );
}

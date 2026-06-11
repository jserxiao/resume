import { Input, ColorPicker } from 'antd';
import { DEFAULT_PRIMARY_COLOR } from '@/utils/constants';

interface ColorFieldInputProps {
  /** 当前颜色值 */
  value: string;
  /** 颜色变更回调 */
  onChange: (value: string) => void;
  /** 占位提示 */
  placeholder?: string;
  /** 是否允许清除 */
  allowClear?: boolean;
  /** 清除回调 */
  onClear?: () => void;
  /** 颜色选择器和输入框的行布局 CSS 类名 */
  rowClassName?: string;
}

/**
 * 颜色字段输入组件
 *
 * 将 ColorPicker + Input 组合成一个行内输入组件，
 * 用于 RightPanel 和 DecorationEditorPage 中所有颜色设置字段。
 */
export default function ColorFieldInput({
  value,
  onChange,
  placeholder = '',
  allowClear = false,
  onClear,
  rowClassName = 'right-panel-color-row',
}: ColorFieldInputProps) {
  return (
    <div className={rowClassName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ColorPicker
        value={value || DEFAULT_PRIMARY_COLOR}
        onChange={(_, hex) => onChange(hex)}
        size="small"
        allowClear={allowClear}
        onClear={onClear}
      />
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        size="small"
        style={{ flex: 1 }}
      />
    </div>
  );
}

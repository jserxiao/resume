import { InputNumber } from 'antd';
import type { BoxSides } from '@/types';

interface SidesInputProps {
  /** 当前四边值 */
  value: BoxSides;
  /** 变更回调 */
  onChange: (value: BoxSides) => void;
  /** 默认值（用于字段为空时的 fallback） */
  defaultValue?: BoxSides;
  /** 最小值 */
  min?: number;
  /** 步进 */
  step?: number;
  /** 网格布局 CSS 类名 */
  gridClassName?: string;
}

const SIDE_LABELS: { key: keyof BoxSides; label: string }[] = [
  { key: 'top', label: '上' },
  { key: 'right', label: '右' },
  { key: 'bottom', label: '下' },
  { key: 'left', label: '左' },
];

/**
 * 四边输入组件
 *
 * 将上/右/下/左四个 InputNumber 组合成一个紧凑的网格布局，
 * 用于 RightPanel 中外边距和内边距的编辑。
 */
export default function SidesInput({
  value,
  onChange,
  defaultValue,
  min = 0,
  step = 1,
  gridClassName = 'right-panel-sides-grid',
}: SidesInputProps) {
  return (
    <div className={gridClassName} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
      {SIDE_LABELS.map(({ key, label }) => (
        <div key={key} className="right-panel-field compact">
          <label className="right-panel-label">{label}</label>
          <InputNumber
            value={value[key]}
            onChange={(val) => {
              const current = { ...defaultValue, ...value };
              onChange({ ...current, [key]: val || 0 });
            }}
            size="small"
            style={{ width: '100%' }}
            min={min}
            step={step}
          />
        </div>
      ))}
    </div>
  );
}

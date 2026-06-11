import { Button, Tooltip, Popconfirm, Input } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  GroupOutlined,
} from '@ant-design/icons';

interface BlockActionsToolbarProps {
  /** 块名称 */
  name?: string;
  /** 名称变更回调（传入后名称变为可编辑 Input） */
  onNameChange?: (value: string) => void;
  /** 名称输入框的自定义样式 */
  nameStyle?: React.CSSProperties;
  /** 工具栏根元素的自定义样式（可覆盖定位等） */
  style?: React.CSSProperties;
  /** 是否可见 */
  visible?: boolean;
  /** 是否锁定 */
  locked?: boolean;
  /** 是否属于分组 */
  hasGroup?: boolean;
  /** 切换可见性 */
  onToggleVisibility?: () => void;
  /** 切换锁定 */
  onToggleLock?: () => void;
  /** 克隆 */
  onClone?: () => void;
  /** 删除 */
  onDelete?: () => void;
  /** 自定义额外操作 */
  extraActions?: React.ReactNode;
}

/**
 * 块操作工具栏组件
 *
 * 在块头部显示操作按钮（可见性、锁定、克隆、删除等）。
 * 用于 FreeBlockCard 和 RightPanel 中的块头部操作栏。
 */
export default function BlockActionsToolbar({
  name,
  onNameChange,
  nameStyle,
  style,
  visible = true,
  locked = false,
  hasGroup = false,
  onToggleVisibility,
  onToggleLock,
  onClone,
  onDelete,
  extraActions,
}: BlockActionsToolbarProps) {
  return (
    <div className="free-block-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 2, ...style }}>
      {name && onNameChange ? (
        <Input
          variant="borderless"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="free-block-name"
          style={nameStyle}
          onClick={(e) => e.stopPropagation()}
        />
      ) : name ? (
        <span className="free-block-name">{name}</span>
      ) : null}
      <div className="free-block-actions" style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
        {hasGroup && (
          <GroupOutlined className="free-block-group-icon" />
        )}
        {onToggleVisibility && (
          <Tooltip title={visible ? '隐藏块' : '显示块'}>
            <Button
              type="text"
              size="small"
              icon={visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
            />
          </Tooltip>
        )}
        {onToggleLock && (
          <Tooltip title={locked ? '解锁块' : '锁定块'}>
            <Button
              type="text"
              size="small"
              icon={locked ? <LockOutlined /> : <UnlockOutlined />}
              onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
            />
          </Tooltip>
        )}
        {extraActions}
        {onClone && (
          <Tooltip title="克隆块">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              className="free-block-action-btn"
              onClick={(e) => { e.stopPropagation(); onClone(); }}
            />
          </Tooltip>
        )}
        {onDelete && (
          <Popconfirm
            title="确认删除该元素？"
            onConfirm={(e) => { e?.stopPropagation(); onDelete(); }}
            onCancel={(e) => e?.stopPropagation()}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除块">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                className="free-block-action-btn"
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        )}
      </div>
    </div>
  );
}

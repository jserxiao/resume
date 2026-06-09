import { Button } from 'antd';
import { CameraOutlined, CloseOutlined } from '@ant-design/icons';
import { uploadImage } from '@/utils/imageUpload';

interface ImageUploadFieldProps {
  /** 当前图片 URL */
  value: string;
  /** 变更回调 */
  onChange: (value: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 上传按钮文字 */
  uploadText?: string;
  /** 预览图最大高度 */
  previewMaxHeight?: number;
  /** CSS 类名前缀 */
  classNamePrefix?: string;
}

/**
 * 图片上传字段组件
 *
 * 封装图片上传逻辑，支持点击上传和清除预览。
 * 用于 RightPanel 中头像、背景图片等字段的编辑。
 */
export default function ImageUploadField({
  value,
  onChange,
  disabled = false,
  uploadText = '上传图片',
  previewMaxHeight = 80,
  classNamePrefix = 'right-panel',
}: ImageUploadFieldProps) {
  if (value) {
    return (
      <div className={`${classNamePrefix}-image-upload`}>
        <div className={`${classNamePrefix}-image-preview`} style={{ position: 'relative' }}>
          <img src={value} alt="" style={{ maxWidth: '100%', maxHeight: previewMaxHeight }} />
          {!disabled && (
            <Button
              type="text"
              size="small"
              danger
              className={`${classNamePrefix}-image-clear`}
              icon={<CloseOutlined />}
              onClick={() => onChange('')}
              style={{ position: 'absolute', top: 2, right: 2 }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <Button
      icon={<CameraOutlined />}
      disabled={disabled}
      onClick={async () => {
        const result = await uploadImage();
        if (result) {
          onChange(result);
        }
      }}
      size="small"
      style={{ width: '100%' }}
    >
      {uploadText}
    </Button>
  );
}

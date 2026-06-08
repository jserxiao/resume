import { message } from 'antd';

/** 图片上传选项 */
export interface ImageUploadOptions {
  /** 最大文件大小（字节），默认 2MB */
  maxSize?: number;
  /** 允许的文件类型，默认 image/* */
  accept?: string;
}

/**
 * 通用的图片上传工具函数
 * 使用浏览器原生 input[type=file] 选择文件，转为 base64 DataURL
 * 与现有头像上传方式保持一致，无需后端服务
 */
export function uploadImage(options?: ImageUploadOptions): Promise<string | null> {
  const maxSize = options?.maxSize ?? 2 * 1024 * 1024; // 默认 2MB
  const accept = options?.accept ?? 'image/*';

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      if (file.size > maxSize) {
        const maxMB = (maxSize / 1024 / 1024).toFixed(1);
        message.error(`图片大小不能超过 ${maxMB}MB`);
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        resolve(result || null);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

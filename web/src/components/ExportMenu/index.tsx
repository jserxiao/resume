import { useState } from 'react';
import { Button, Dropdown, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  ExportOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useResumeStore } from '@/store';
import { TEXT_HINT_COLOR } from '@/utils/constants';
import { exportToPDF, exportToImage, exportToJSON } from '@/utils/export';

export default function ExportMenu() {
  const { resume } = useResumeStore();
  const [isExporting, setIsExporting] = useState(false);

  if (!resume) return null;

  const handleExport = async (format: 'pdf' | 'png' | 'json') => {
    setIsExporting(true);

    try {
      // 优先选择编辑区的画布（排除预览抽屉中的画布）
      const pageElement = (document.querySelector('.editor-canvas:not(.preview-mode) .editor-canvas-page') || document.querySelector('.editor-canvas-page')) as HTMLElement;
      if (!pageElement) {
        return;
      }

      const fileName = resume.title || 'resume';
      // 分页高度：如果设置了 pageHeight 则使用，否则使用画布高度
      // 当内容超过一页时自动分页导出
      const pageHeight = resume.canvas.pageHeight || resume.canvas.height;

      switch (format) {
        case 'pdf':
          await exportToPDF(pageElement, fileName, pageHeight);
          break;
        case 'png':
          await exportToImage(pageElement, fileName, pageHeight);
          break;
        case 'json':
          exportToJSON(resume, fileName);
          break;
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: (
        <div>
          <div style={{ fontWeight: 500 }}>导出 PDF</div>
          <div style={{ fontSize: 11, color: TEXT_HINT_COLOR }}>精确排版，适合投递</div>
        </div>
      ),
      onClick: () => handleExport('pdf'),
    },
    {
      key: 'png',
      icon: <FileImageOutlined />,
      label: (
        <div>
          <div style={{ fontWeight: 500 }}>导出图片</div>
          <div style={{ fontSize: 11, color: TEXT_HINT_COLOR }}>PNG 格式，适合分享</div>
        </div>
      ),
      onClick: () => handleExport('png'),
    },
    {
      key: 'json',
      icon: <FileTextOutlined />,
      label: (
        <div>
          <div style={{ fontWeight: 500 }}>导出 JSON</div>
          <div style={{ fontSize: 11, color: TEXT_HINT_COLOR }}>结构化数据，可再次导入</div>
        </div>
      ),
      onClick: () => handleExport('json'),
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <Button type="text" icon={<ExportOutlined />} disabled={isExporting}>
        {isExporting ? <Spin size="small" /> : '导出'}
      </Button>
    </Dropdown>
  );
}

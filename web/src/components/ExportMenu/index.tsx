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
import { exportToPDF, exportToImage, exportToJSON } from '@/utils/export';

export default function ExportMenu() {
  const { resume } = useResumeStore();
  const [isExporting, setIsExporting] = useState(false);

  if (!resume) return null;

  const handleExport = async (format: 'pdf' | 'png' | 'json') => {
    setIsExporting(true);

    try {
      const pageElement = document.querySelector('.preview-area-page') as HTMLElement;
      if (!pageElement) {
        return;
      }

      const fileName = resume.title || 'resume';

      switch (format) {
        case 'pdf':
          await exportToPDF(pageElement, fileName);
          break;
        case 'png':
          await exportToImage(pageElement, fileName);
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
          <div style={{ fontSize: 11, color: '#999' }}>精确排版，适合投递</div>
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
          <div style={{ fontSize: 11, color: '#999' }}>PNG 格式，适合分享</div>
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
          <div style={{ fontSize: 11, color: '#999' }}>结构化数据，可再次导入</div>
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

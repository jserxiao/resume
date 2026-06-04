import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * 将简历预览区导出为 PDF
 */
export async function exportToPDF(
  element: HTMLElement,
  fileName: string = 'resume'
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2, // 高清
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

  // 如果内容超过一页，分页处理
  const pageHeight = 297; // A4 height in mm
  let heightLeft = imgHeight;
  let position = 0;

  while (heightLeft > pageHeight) {
    position = heightLeft - pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${fileName}.pdf`);
}

/**
 * 将简历预览区导出为 PNG 图片
 */
export async function exportToImage(
  element: HTMLElement,
  fileName: string = 'resume'
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const link = document.createElement('a');
  link.download = `${fileName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * 将简历数据导出为 JSON
 */
export function exportToJSON(data: unknown, fileName: string = 'resume'): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${fileName}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

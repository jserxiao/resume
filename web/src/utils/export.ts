import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { computePageBreaks } from './constants';

/**
 * 导出前隐藏分页线等辅助元素，返回恢复函数
 */
function hideOverlays(element: HTMLElement): () => void {
  // 隐藏分页线覆盖层
  const pageBreakOverlays = element.querySelectorAll('[data-page-break-overlay]');
  const hiddenEls: { el: HTMLElement; prevDisplay: string }[] = [];

  pageBreakOverlays.forEach((el) => {
    const htmlEl = el as HTMLElement;
    hiddenEls.push({ el: htmlEl, prevDisplay: htmlEl.style.display });
    htmlEl.style.display = 'none';
  });

  // 返回恢复函数
  return () => {
    hiddenEls.forEach(({ el, prevDisplay }) => {
      el.style.display = prevDisplay;
    });
  };
}

/**
 * 将简历预览区导出为 PDF（支持多页自动分页）
 * @param element - 画布页面 DOM 元素
 * @param fileName - 文件名
 * @param pageHeight - 每页高度（px），内容超过此高度自动分页
 */
export async function exportToPDF(
  element: HTMLElement,
  fileName: string = 'resume',
  pageHeight?: number,
): Promise<void> {
  // 隐藏辅助元素（分页线等）
  const restore = hideOverlays(element);

  try {
    const effectivePageHeight = pageHeight || element.scrollHeight;
    const elementHeight = element.scrollHeight;
    const { pageCount } = computePageBreaks(elementHeight, effectivePageHeight);

    // 先对整个画布截图
    const fullCanvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const scale = fullCanvas.width / element.offsetWidth;
    const scaledPageHeight = effectivePageHeight * scale;
    const scaledCanvasWidth = fullCanvas.width;

    // A4 宽度（mm）
    const a4Width = 210;
    const mmPerPx = a4Width / scaledCanvasWidth;
    const pageWidthMm = a4Width;
    const pageHeightMm = scaledPageHeight * mmPerPx;

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [pageWidthMm, pageHeightMm],
    });

    for (let i = 0; i < pageCount; i++) {
      const startY = i * scaledPageHeight;
      const endY = Math.min(startY + scaledPageHeight, fullCanvas.height);
      const currentPageHeight = endY - startY;

      // 截取当前页的区域
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = scaledCanvasWidth;
      pageCanvas.height = currentPageHeight;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) continue;

      // 从完整截图上裁剪当前页
      ctx.drawImage(
        fullCanvas,
        0, startY, scaledCanvasWidth, currentPageHeight,
        0, 0, scaledCanvasWidth, currentPageHeight,
      );

      const pageImgData = pageCanvas.toDataURL('image/png');
      const currentPageHeightMm = currentPageHeight * mmPerPx;

      if (i > 0) {
        pdf.addPage([pageWidthMm, currentPageHeightMm]);
      } else if (Math.abs(currentPageHeightMm - pageHeightMm) > 0.1) {
        // 第一页可能需要调整页面大小（最后一页可能不满一页）
        pdf.internal.pageSize.height = currentPageHeightMm;
      }

      pdf.addImage(pageImgData, 'PNG', 0, 0, pageWidthMm, currentPageHeightMm);
    }

    pdf.save(`${fileName}.pdf`);
  } finally {
    restore();
  }
}

/**
 * 将简历预览区导出为 PNG 图片（支持多页导出为多张图片）
 * @param element - 画布页面 DOM 元素
 * @param fileName - 文件名
 * @param pageHeight - 每页高度（px），内容超过此高度自动分页
 */
export async function exportToImage(
  element: HTMLElement,
  fileName: string = 'resume',
  pageHeight?: number,
): Promise<void> {
  // 隐藏辅助元素（分页线等）
  const restore = hideOverlays(element);

  try {
    const effectivePageHeight = pageHeight || element.scrollHeight;
    const elementHeight = element.scrollHeight;
    const { pageCount } = computePageBreaks(elementHeight, effectivePageHeight);

    // 先对整个画布截图
    const fullCanvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const scale = fullCanvas.width / element.offsetWidth;
    const scaledPageHeight = effectivePageHeight * scale;
    const scaledCanvasWidth = fullCanvas.width;

    for (let i = 0; i < pageCount; i++) {
      const startY = i * scaledPageHeight;
      const endY = Math.min(startY + scaledPageHeight, fullCanvas.height);
      const currentPageHeight = endY - startY;

      // 截取当前页的区域
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = scaledCanvasWidth;
      pageCanvas.height = currentPageHeight;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) continue;

      ctx.drawImage(
        fullCanvas,
        0, startY, scaledCanvasWidth, currentPageHeight,
        0, 0, scaledCanvasWidth, currentPageHeight,
      );

      const link = document.createElement('a');
      link.download = pageCount > 1 ? `${fileName}_第${i + 1}页.png` : `${fileName}.png`;
      link.href = pageCanvas.toDataURL('image/png');
      link.click();
    }
  } finally {
    restore();
  }
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

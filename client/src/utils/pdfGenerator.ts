import { jsPDF } from 'jspdf';
import type { PrintCard } from '../store/countdownSlice';

const A4_WIDTH = 210;
const A4_MARGIN = 8;
const CARD_GAP = 4;
const COLS = 2;
const ROWS_PER_PAGE = 4;
const CARDS_PER_PAGE = COLS * ROWS_PER_PAGE; // 8 張/頁
const CONTENT_WIDTH = A4_WIDTH - A4_MARGIN * 2;
const CARD_WIDTH = (CONTENT_WIDTH - CARD_GAP * (COLS - 1)) / COLS;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 將多張卡片排版並生成 PDF（2 列 x 4 行 = 8 張/頁）
 */
export async function generatePrintCardsPDF(cards: PrintCard[], title: string = '列印小卡'): Promise<void> {
  if (cards.length === 0) {
    throw new Error('沒有卡片可以列印');
  }

  // 創建 PDF 文檔
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 計算卡片高度（根據第一張卡片的比例）
  let cardHeight = 65; // 預設高度
  const firstCard = cards.find(c => c.previewImage);
  if (firstCard?.previewImage) {
    try {
      const img = await loadImage(firstCard.previewImage);
      const aspectRatio = img.width / img.height;
      cardHeight = CARD_WIDTH / aspectRatio;
    } catch {
      // 使用預設高度
    }
  }

  for (let i = 0; i < cards.length; i++) {
    try {
      const preview = cards[i].previewImage;
      if (!preview) continue;

      // 計算在當前頁的位置
      const indexInPage = i % CARDS_PER_PAGE;
      const col = indexInPage % COLS;
      const row = Math.floor(indexInPage / COLS);

      // 換頁
      if (i > 0 && indexInPage === 0) {
        pdf.addPage();
      }

      const x = A4_MARGIN + col * (CARD_WIDTH + CARD_GAP);
      const y = A4_MARGIN + row * (cardHeight + CARD_GAP);

      pdf.addImage(preview, 'PNG', x, y, CARD_WIDTH, cardHeight, undefined, 'FAST');
    } catch (error) {
      console.error(`處理第 ${i + 1} 張卡片時發生錯誤:`, error);
    }
  }

  pdf.save(`${title}-列印小卡.pdf`);
}

/**
 * 使用瀏覽器列印功能（保留原有功能）
 */
export function printCardsWithBrowser(): void {
  window.print();
}

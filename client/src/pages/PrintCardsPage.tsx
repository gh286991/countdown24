import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import PrintCardPreview from '../components/PrintCardPreview';
import { fetchCountdownDetail, fetchPrintCards } from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';
import { generatePrintCardsPDF, printCardsWithBrowser } from '../utils/pdfGenerator';

function PrintCardsPage() {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { selected, detailStatus, printCardsStatus } = useSelector((state: RootState) => state.countdowns);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    // 只在 id 改變或 selected 為空時才載入
    if (!selected || selected.id !== id) {
      dispatch(fetchCountdownDetail(id));
    }
  }, [dispatch, id]);

  // 當 selected 載入完成後，載入 printCards
  useEffect(() => {
    if (id && selected && selected.id === id && !selected.printCards) {
      dispatch(fetchPrintCards(id));
    }
  }, [dispatch, id, selected?.id, selected?.printCards]);

  const cards = useMemo(
    () => (selected?.printCards || []).filter((card) => card.isConfigured).sort((a, b) => a.day - b.day),
    [selected?.printCards],
  );
  const isLoading = detailStatus === 'loading' || (printCardsStatus === 'loading' && !cards.length);

  const handleExportPDF = async () => {
    if (cards.length === 0) return;

    setIsGeneratingPDF(true);
    try {
      await generatePrintCardsPDF(cards, selected?.title || '列印小卡');
    } catch (error) {
      console.error('生成 PDF 時發生錯誤:', error);
      alert('生成 PDF 時發生錯誤，請稍後再試');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!id) {
    return <p className="text-center text-slate-500 py-10">找不到倒數專案</p>;
  }

  if (!selected || selected.id !== id || isLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
        <p className="text-sm text-slate-500">載入列印小卡...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 py-8 px-4 md:px-8 print:py-0 print:px-0">
      <div className="max-w-6xl mx-auto space-y-6 print:max-w-none print:mx-0 print:space-y-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Print Pack</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {selected.title} · 列印小卡
            </h1>
            <p className="text-sm text-slate-500 mt-1">共 {cards.length} 張已設定的卡片</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isGeneratingPDF || cards.length === 0}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? '⏳ 生成中...' : '📄 匯出 PDF'}
            </button>
            <button
              type="button"
              onClick={printCardsWithBrowser}
              disabled={cards.length === 0}
              className="px-5 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold flex items-center gap-2 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🖨️ 瀏覽器列印
            </button>
            <Link
              to={`/creator/countdowns/${id}`}
              className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              返回編輯器
            </Link>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="no-print bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-8 text-center">
            <p className="text-slate-500 text-sm">尚未設定任何列印小卡，請先在編輯器中設定。</p>
          </div>
        ) : (
          <div className="a4-preview-container">
            {/* 將卡片分成每頁 8 張 */}
            {Array.from({ length: Math.ceil(cards.length / 8) }).map((_, pageIndex) => {
              const pageCards = cards.slice(pageIndex * 8, (pageIndex + 1) * 8);
              return (
                <div key={pageIndex} className="a4-page no-print-break">
                  <div className="a4-page-label">第 {pageIndex + 1} 頁 / 共 {Math.ceil(cards.length / 8)} 頁</div>
                  <div className="print-stack">
                    {pageCards.map((card) => (
                      <div key={card.day} className="print-card-slot">
                        {card.previewImage ? (
                          <img src={card.previewImage} alt={`Day ${card.day}`} className="print-card-image" />
                        ) : (
                          <div className="print-card loading flex-col text-center">
                            <p className="mb-2 text-xs text-yellow-200">尚未產生預覽，請重新編輯小卡</p>
                            <PrintCardPreview card={card} variant="print" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PrintCardsPage;

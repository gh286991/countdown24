import { useEffect, useState } from 'react';
import { HiOutlineXMark, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi2';
import PrintCardCanvasEditor from './PrintCardCanvasEditor';
import type { PrintCard } from '../store/countdownSlice';

interface PrintCardEditorModalProps {
  countdownId: string;
  day: number;
  isOpen: boolean;
  card?: PrintCard;
  onSave: (card: Partial<PrintCard>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function PrintCardEditorModal({
  countdownId,
  day,
  isOpen,
  card,
  onSave,
  onDelete,
  onClose,
}: PrintCardEditorModalProps) {
  const [canvasState, setCanvasState] = useState<{ canvasJson: any; previewImage: string }>({
    canvasJson: null,
    previewImage: '',
  });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCanvasState({
      canvasJson: card?.canvasJson || null,
      previewImage: card?.previewImage || '',
    });
  }, [card, day, isOpen]);

  const handleSave = () => {
    if (!canvasState.previewImage) {
      alert('請先在畫布中設定內容');
      return;
    }
    onSave({
      template: card?.template || 'imageLeft',
      canvasJson: canvasState.canvasJson,
      previewImage: canvasState.previewImage,
      isConfigured: true,
    });
  };

  const handleDelete = () => {
    onDelete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8">
      <div className="relative w-full max-w-5xl rounded-3xl bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <HiOutlineXMark className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">Day {day}</p>
          <h2 className="text-2xl font-semibold">編輯列印小卡</h2>
          <p className="text-sm text-gray-400 mt-1">選擇喜歡的版型，填入圖片、文字與 QR 內容</p>
        </div>

        <div className="space-y-6">
          <PrintCardCanvasEditor initialJson={card?.canvasJson} onChange={(payload) => setCanvasState(payload)} />
          <div className="rounded-2xl border border-white/10 p-4 text-xs text-gray-400 space-y-1">
            <p>．拖曳 Canvas 內的圖片、文字與 QR Code，自由排版。</p>
            <p>．儲存後會將畫布輸出為高解析 PNG，並用於列印與 PDF。</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-between md:items-center border-t border-white/10 pt-4">
          {card?.isConfigured && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 text-sm text-red-300 hover:text-red-200"
            >
              <HiOutlineTrash className="w-4 h-4" />
              清除這天的小卡設定
            </button>
          )}
          <div className="flex flex-1 gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!canvasState.previewImage}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <HiOutlineEye className="w-4 h-4" />
              預覽輸出
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-aurora to-purple-500 text-slate-900 font-semibold text-sm"
            >
              💾 儲存列印小卡
            </button>
          </div>
        </div>
      </div>

      {/* 預覽彈窗 */}
      {showPreview && canvasState.previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white text-sm flex items-center gap-2"
            >
              <HiOutlineXMark className="w-5 h-5" />
              關閉預覽
            </button>
            <img
              src={canvasState.previewImage}
              alt="Card preview"
              className="w-full rounded-3xl border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PrintCardEditorModal;

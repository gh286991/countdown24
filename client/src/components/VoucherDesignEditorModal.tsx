import { useEffect, useRef, useState } from 'react';
import { HiOutlineSparkles, HiOutlineTrash, HiOutlineXMark, HiOutlineSquares2X2 } from 'react-icons/hi2';
import PrintCardCanvasEditor, { type PrintCardCanvasEditorRef } from './PrintCardCanvasEditor';
import { blankVoucherTemplate, voucherCardTemplates } from '../data/voucherCardTemplates';
import type { VoucherCard } from '../store/countdownSlice';
import type { VoucherDetail } from '../types/voucher';

interface VoucherDesignEditorModalProps {
  countdownId: string;
  day: number;
  isOpen: boolean;
  card?: VoucherCard;
  voucherDetail?: VoucherDetail | null;
  onSave: (payload: Partial<VoucherCard>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function VoucherDesignEditorModal({
  countdownId,
  day,
  isOpen,
  card,
  voucherDetail,
  onSave,
  onDelete,
  onClose,
}: VoucherDesignEditorModalProps) {
  const canvasRef = useRef<PrintCardCanvasEditorRef>(null);
  const [canvasState, setCanvasState] = useState<{ canvasJson: any; previewImage: string }>({
    canvasJson: null,
    previewImage: '',
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(blankVoucherTemplate.id);

  useEffect(() => {
    if (!isOpen) return;
    if (!card) {
      setSelectedTemplateId(blankVoucherTemplate.id);
      setCanvasState({ canvasJson: null, previewImage: '' });
      return;
    }
    setCanvasState({
      canvasJson: card.canvasJson || null,
      previewImage: card.previewImage || '',
    });
    setSelectedTemplateId((card.template as string) || blankVoucherTemplate.id);
  }, [card, day, isOpen]);

  if (!isOpen) return null;

  const handleSelectTemplate = (templateId: string) => {
    const template = voucherCardTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplateId(templateId);
    setShowTemplates(false);
    canvasRef.current?.loadTemplate(template.canvasJson, { voucherDetail: voucherDetail || undefined });
  };

  const handleSave = () => {
    if (!canvasState.previewImage) {
      alert('請先在畫布中追加內容');
      return;
    }
    const template = voucherCardTemplates.find((item) => item.id === selectedTemplateId);
    onSave({
      template: template?.id || blankVoucherTemplate.id,
      canvasJson: canvasState.canvasJson,
      previewImage: canvasState.previewImage,
      isConfigured: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <HiOutlineXMark className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4">
          <HiOutlineSparkles className="text-amber-300" />
          兌換卷設計 · Day {day}
        </div>

        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs text-amber-300 hover:bg-white/20"
          >
            <HiOutlineSquares2X2 className="w-4 h-4" />
            選擇模板
          </button>
        </div>

        <div className="bg-white/5 rounded-[32px] p-5">
          <PrintCardCanvasEditor
            ref={canvasRef}
            countdownId={countdownId}
            day={day}
            initialJson={card?.canvasJson}
            onChange={(payload) => setCanvasState(payload)}
            width={780}
            height={420}
            allowQr={false}
          />
        </div>

        <div className="flex items-center justify-between gap-3 mt-6">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>拖拉文字、圖片，自由排版</span>
            <span>可搭配模板或自己創作</span>
          </div>
          <div className="flex items-center gap-3">
            {card?.isConfigured && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setCanvasState({ canvasJson: null, previewImage: '' });
                  setSelectedTemplateId(blankVoucherTemplate.id);
                }}
                className="inline-flex items-center gap-2 text-sm text-red-300 hover:text-red-200"
              >
                <HiOutlineTrash className="w-4 h-4" />
                清除兌換卷
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-2 text-sm font-semibold text-slate-900"
            >
              設計兌換卷
            </button>
          </div>
        </div>
      </div>

      {showTemplates && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-6">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl p-6 space-y-4">
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-100">選擇兌換卷模板</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {voucherCardTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    handleSelectTemplate(template.id);
                    setShowTemplates(false);
                  }}
                  className={`group relative rounded-2xl overflow-hidden border-2 transition ${
                    selectedTemplateId === template.id ? 'border-amber-400' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={template.thumbnail} alt={template.name} className="w-full aspect-[9/5]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                  <div className="absolute bottom-0 w-full text-center text-[11px] text-white py-1 px-2">
                    {template.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoucherDesignEditorModal;

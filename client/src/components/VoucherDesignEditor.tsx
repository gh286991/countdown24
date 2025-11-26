import { useEffect, useRef, useState } from 'react';
import { HiOutlineTrash, HiOutlineSparkles } from 'react-icons/hi2';
import PrintCardCanvasEditor, { type PrintCardCanvasEditorRef } from './PrintCardCanvasEditor';
import type { VoucherCard } from '../store/countdownSlice';
import { blankVoucherTemplate, voucherCardTemplates } from '../data/voucherCardTemplates';
import PrintCardPreview from './PrintCardPreview';

interface VoucherDesignEditorProps {
  countdownId: string;
  day: number;
  card?: VoucherCard;
  onSave: (payload: Partial<VoucherCard>) => void;
  onDelete: () => void;
}

function VoucherDesignEditor({ countdownId, day, card, onSave, onDelete }: VoucherDesignEditorProps) {
  const canvasRef = useRef<PrintCardCanvasEditorRef>(null);
  const [canvasState, setCanvasState] = useState<{ canvasJson: any; previewImage: string }>({
    canvasJson: null,
    previewImage: '',
  });
  const [showTemplates, setShowTemplates] = useState(!card?.isConfigured);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(blankVoucherTemplate.id);

  useEffect(() => {
    if (!card) {
      setShowTemplates(true);
      setSelectedTemplateId(blankVoucherTemplate.id);
      setCanvasState({ canvasJson: null, previewImage: '' });
      return;
    }
    setCanvasState({
      canvasJson: card.canvasJson || null,
      previewImage: card.previewImage || '',
    });
    setSelectedTemplateId((card.template as string) || blankVoucherTemplate.id);
    setShowTemplates(!card.isConfigured);
  }, [card, day]);

  const handleSelectTemplate = (templateId: string) => {
    const template = voucherCardTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplateId(templateId);
    setShowTemplates(false);
    canvasRef.current?.loadTemplate(template.canvasJson);
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

  const fallbackPreview = (
    <PrintCardPreview
      variant="voucher"
      card={{
        day,
        template: 'imageLeft',
        imageUrl: '',
        qrCode: '',
        title: `Day ${day} Voucher`,
        subtitle: '用這張卷帶對方去想去的地方',
        note: '可自由置入條件、次數限制或貼心提醒。',
        accentColor: '#fbbf24',
      }}
    />
  );

  return (
    <div className="space-y-4 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <HiOutlineSparkles className="text-amber-300" />
          兌換卷設計（Canvas 編輯）
        </div>
        {!showTemplates && (
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="text-xs text-amber-300 hover:text-amber-200"
          >
            更換模板
          </button>
        )}
      </div>

      {showTemplates && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {voucherCardTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelectTemplate(template.id)}
              className={`group relative rounded-2xl overflow-hidden border-2 transition ${
                selectedTemplateId === template.id ? 'border-amber-400' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <img src={template.thumbnail} alt={template.name} className="w-full aspect-[9/5]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
              <div className="absolute bottom-0 w-full text-center text-[11px] text-white py-1 px-2">
                {template.name}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
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
          <div className="flex flex-wrap justify-end gap-3 text-xs text-gray-400">
            <span>拖拉文字、圖片，自由排版</span>
            <span>可搭配模板或自己創作</span>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-[0.3em]">Preview</p>
          {canvasState.previewImage ? (
            <img
              src={canvasState.previewImage}
              alt="Voucher preview"
              className="w-full rounded-[28px] border border-white/10 shadow-xl"
            />
          ) : (
            fallbackPreview
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {card?.isConfigured && (
          <button
            type="button"
            onClick={onDelete}
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
  );
}

export default VoucherDesignEditor;

import { useEffect, useState, useRef } from 'react';
import { HiOutlineXMark, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi2';
import PrintCardCanvasEditor, { type PrintCardCanvasEditorRef } from './PrintCardCanvasEditor';
import type { PrintCard } from '../store/countdownSlice';
import { printCardTemplates, blankTemplate, type PrintCardTemplate } from '../data/printCardTemplates';

interface PrintCardEditorModalProps {
  countdownId: string;
  day: number;
  isOpen: boolean;
  card?: PrintCard;
  onSave: (card: Partial<PrintCard>) => Promise<void> | void;
  onDelete: () => void;
  onClose: () => void;
  isSaving?: boolean;
}

function PrintCardEditorModal({
  countdownId,
  day,
  isOpen,
  card,
  onSave,
  onDelete,
  onClose,
  isSaving = false,
}: PrintCardEditorModalProps) {
  const canvasRef = useRef<PrintCardCanvasEditorRef>(null);
  const [canvasState, setCanvasState] = useState<{ canvasJson: any; previewImage: string }>({
    canvasJson: null,
    previewImage: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(!card?.isConfigured);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(card?.canvasTemplateId || null);

  const allTemplates = [blankTemplate, ...printCardTemplates];
  const activeTemplate = selectedTemplateId ? allTemplates.find((tpl) => tpl.id === selectedTemplateId) : null;

  useEffect(() => {
    if (!isOpen) return;
    setCanvasState({
      canvasJson: card?.canvasJson || null,
      previewImage: card?.previewImage || '',
    });
    setIsTemplateModalOpen(!card?.isConfigured);
    setSelectedTemplateId(card?.canvasTemplateId || null);
  }, [card, day, isOpen]);

  const handleSelectTemplate = (template: PrintCardTemplate) => {
    setSelectedTemplateId(template.id);
    // 透過 ref 載入模板
    canvasRef.current?.loadTemplate(template.canvasJson);
    setIsTemplateModalOpen(false);
  };

  const handleSave = () => {
    if (isSaving) return;
    if (!canvasState.previewImage) {
      alert('請先在畫布中設定內容');
      return;
    }
    onSave({
      template: card?.template || 'imageLeft',
      canvasTemplateId: selectedTemplateId || null,
      canvasJson: canvasState.canvasJson,
      previewImage: canvasState.previewImage,
      isConfigured: true,
    });
  };

  const handleDelete = () => {
    if (isSaving) return;
    onDelete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8">
      <div className="relative w-full max-w-5xl rounded-3xl bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="absolute top-4 right-4 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <HiOutlineXMark className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">Day {day}</p>
          <h2 className="text-2xl font-semibold">編輯列印小卡</h2>
          <p className="text-sm text-gray-400 mt-1">選擇喜歡的版型，填入圖片、文字與禮品內容</p>
        </div>

        <div className="space-y-6">
          {/* 模板選擇器 */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 p-4 flex items-center justify-between bg-white/5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-[0.3em]">目前版型</p>
                <p className="text-sm text-white font-medium">
                  {activeTemplate?.name || '尚未選擇版型'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {activeTemplate?.description || '點選下方按鈕從素材模板中挑選一款。'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-aurora to-purple-500 text-sm text-slate-900 font-semibold"
              >
                選擇模板
              </button>
            </div>
          </div>

          <PrintCardCanvasEditor
            ref={canvasRef}
            countdownId={countdownId}
            day={day}
            initialJson={card?.canvasJson}
            onChange={(payload) => setCanvasState(payload)}
          />
          <div className="rounded-2xl border border-white/10 p-4 text-xs text-gray-400 space-y-1">
            <p>．拖曳 Canvas 內的圖片、文字與禮品卡，自由排版。</p>
            <p>．儲存後會將畫布輸出為高解析 PNG，並用於列印與 PDF。</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-between md:items-center border-t border-white/10 pt-4">
          {card?.isConfigured && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              className="inline-flex items-center gap-2 text-sm text-red-300 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-aurora to-purple-500 text-slate-900 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '儲存中…' : '💾 儲存列印小卡'}
            </button>
          </div>
        </div>
      </div>

      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <HiOutlineXMark className="w-6 h-6" />
            </button>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-[0.3em]">Template Library</p>
              <h3 className="text-xl font-semibold text-white mt-1">選擇一款小卡版型</h3>
              <p className="text-sm text-gray-400">
                精選奢華聖誕、冬日雪景等多款樣式，套用後可以再自行調整內容。
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
              {allTemplates.map((template) => {
                const isActive = selectedTemplateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className={`flex flex-col rounded-2xl border-2 bg-white/5 overflow-hidden text-left transition-all ${
                      isActive ? 'border-aurora shadow-lg shadow-aurora/30' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={template.thumbnail} alt={template.name} className="w-full aspect-[9/5] object-cover" />
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-semibold text-white truncate">{template.name}</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed min-h-[32px] overflow-hidden">
                        {template.description}
                      </p>
                      <p className="text-[10px] text-aurora font-semibold">{isActive ? '已套用' : '套用這款'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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

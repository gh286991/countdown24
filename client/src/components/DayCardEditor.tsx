import { ChangeEvent, useState } from 'react';
import { HiOutlineBookOpen, HiOutlineGift } from 'react-icons/hi2';
import CgScriptEditor from './CgScriptEditor';
import ImageUploadField from './ImageUploadField';
import VoucherDesignEditorModal from './VoucherDesignEditorModal';
import AssetLibraryModal from './AssetLibraryModal';
import type { VoucherCard } from '../store/countdownSlice';
import type { VoucherDetail } from '../types/voucher';
import type { UserAsset } from '../types/assets';
import { useToast } from './ToastProvider';

interface QrReward {
  title?: string;
  message?: string;
  imageUrl?: string;
  qrCode?: string;
}

interface DayCardData {
  day: number;
  title: string;
  description: string;
  coverImage?: string;
  type: 'story' | 'qr' | 'voucher';
  qrReward?: QrReward;
  voucherDetail?: VoucherDetail;
}

interface DayCardEditorProps {
  activeDay: number;
  startDate?: string;
  dayCardDraft: DayCardData;
  cgScriptDraft: string;
  countdownId: string;
  onTypeChange: (type: 'story' | 'qr' | 'voucher') => void;
  onFieldChange: (field: keyof DayCardData, value: any) => void;
  onCgScriptChange: (value: string) => void;
  onSave: () => void;
  voucherCard?: VoucherCard;
  onVoucherSave: (card: Partial<VoucherCard>) => void;
  onVoucherDelete: () => void;
}

function DayCardEditor({
  activeDay,
  startDate,
  dayCardDraft,
  cgScriptDraft,
  countdownId,
  onTypeChange,
  onFieldChange,
  onCgScriptChange,
  onSave,
  voucherCard,
  onVoucherSave,
  onVoucherDelete,
}: DayCardEditorProps) {
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showGlobalAssetModal, setShowGlobalAssetModal] = useState(false);
  // 判斷是否顯示 CG 編輯器：如果是 story 類型，或者 cgScriptDraft 有內容（且不是預設空值）
  // 這裡我們簡單用一個本地狀態來控制顯示，初始化時檢查是否有內容
  const hasContent = Boolean(cgScriptDraft && cgScriptDraft.length > 50 && !cgScriptDraft.includes('"text": "..."'));
  const [showCgEditor, setShowCgEditor] = useState(dayCardDraft.type === 'story' || hasContent);

  // 當類型切換為 story 時，自動顯示編輯器
  if (dayCardDraft.type === 'story' && !showCgEditor) {
    setShowCgEditor(true);
  }

  const { showToast } = useToast();
  return (
    <div className="glass-panel p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">編輯 Day {activeDay}</h2>
          <p className="text-xs text-gray-400">
            {startDate
              ? `釋出：${new Date(new Date(startDate).getTime() + (activeDay - 1) * 86400000).toLocaleDateString()}`
              : '未設定日期'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGlobalAssetModal(true)}
          className="text-xs text-gray-200 border border-white/20 rounded-full px-4 py-1.5 hover:border-white/40"
        >
          開啟素材庫
        </button>
      </div>

      {/* 類型切換 */}
      <div className="flex flex-wrap gap-3 sm:flex-nowrap">
        {['story', 'qr', 'voucher'].map((mode) => (
          <button
            type="button"
            key={mode}
            onClick={() => onTypeChange(mode as 'story' | 'qr' | 'voucher')}
            className={`flex-1 min-w-[140px] rounded-xl border px-4 py-3 text-sm font-semibold transition-all sm:min-w-0 ${dayCardDraft.type === mode
              ? 'border-aurora bg-aurora text-slate-900'
              : 'border-white/20 text-gray-300 hover:border-white/40'
              }`}
          >
            {mode === 'story' ? (
              <span className="flex items-center gap-2">
                <HiOutlineBookOpen className="w-4 h-4" />
                CG 對話劇情
              </span>
            ) : mode === 'qr' ? (
              <span className="flex items-center gap-2">
                <HiOutlineGift className="w-4 h-4" />
                禮品卡片
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <HiOutlineGift className="w-4 h-4" />
                兌換卷
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 基本資訊 */}
      <div className="space-y-3 pt-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">小卡標題</label>
          <input
            type="text"
            placeholder="例：Day 1 的故事開始"
            value={dayCardDraft.title}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onFieldChange('title', event.target.value)
            }
            className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">小卡說明</label>
          <textarea
            placeholder="簡短描述這一天的內容"
            value={dayCardDraft.description}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onFieldChange('description', event.target.value)
            }
            className="w-full bg-white/5 rounded-xl px-4 py-2.5 min-h-[80px] border border-white/10 focus:border-aurora focus:outline-none"
          />
        </div>
        <ImageUploadField
          label="小卡封面圖"
          value={dayCardDraft.coverImage || ''}
          onChange={(url) => onFieldChange('coverImage', url)}
          placeholder="https://example.com/cover.jpg"
          folder={countdownId ? `countdowns/${countdownId}/days/${activeDay}/cover` : undefined}
          helperText="小卡在列表中顯示的封面圖片"
        />
      </div>

      {/* CG 劇本編輯 */}
      <div className="pt-2 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enable-cg"
              checked={showCgEditor}
              onChange={(e) => setShowCgEditor(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-aurora focus:ring-aurora"
            />
            <label htmlFor="enable-cg" className="text-sm font-semibold text-gray-300 cursor-pointer select-none">
              啟用 CG 開場劇情
            </label>
          </div>
          {showCgEditor && (
            <span className="text-xs text-gray-500">
              {dayCardDraft.type === 'story' ? 'Story 模式必填' : '將在禮物顯示前播放'}
            </span>
          )}
        </div>

        {showCgEditor && (
          <CgScriptEditor
            value={cgScriptDraft}
            onChange={onCgScriptChange}
            countdownId={countdownId}
          />
        )}
      </div>

      {/* 禮品卡編輯 */}
      {dayCardDraft.type === 'qr' && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          <h3 className="text-sm font-semibold text-gray-300">禮品卡設定</h3>
          <div>
            <label className="text-xs text-gray-400 block mb-1">禮物名稱</label>
            <input
              type="text"
              placeholder="例：星巴克咖啡券"
              value={dayCardDraft.qrReward?.title || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onFieldChange('qrReward', { ...dayCardDraft.qrReward, title: event.target.value })
              }
              className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">禮物訊息</label>
            <textarea
              placeholder="給接收者的祝福訊息"
              value={dayCardDraft.qrReward?.message || ''}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                onFieldChange('qrReward', { ...dayCardDraft.qrReward, message: event.target.value })
              }
              className="w-full bg-white/5 rounded-xl px-4 py-2.5 min-h-[80px] border border-white/10 focus:border-aurora focus:outline-none"
            />
          </div>
          <ImageUploadField
            label="禮物圖片"
            value={dayCardDraft.qrReward?.imageUrl || ''}
            onChange={(url) =>
              onFieldChange('qrReward', { ...dayCardDraft.qrReward, imageUrl: url })
            }
            placeholder="https://example.com/gift.jpg"
            folder={countdownId ? `countdowns/${countdownId}/days/${activeDay}/qr` : undefined}
          />
          <div>
            <label className="text-xs text-gray-400 block mb-1">禮品卡內容（序號/連結）</label>
            <input
              type="text"
              placeholder="例：https://gift.com/redeem/ABC123"
              value={dayCardDraft.qrReward?.qrCode || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onFieldChange('qrReward', { ...dayCardDraft.qrReward, qrCode: event.target.value })
              }
              className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* 兌換卷設定 */}
      {dayCardDraft.type === 'voucher' && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">兌換卷設定</h3>
            <button
              type="button"
              onClick={() => setShowVoucherModal(true)}
              className="text-xs text-amber-300 hover:text-amber-200"
            >
              編輯兌換卷版型
            </button>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">兌換卷標題</label>
            <input
              type="text"
              placeholder="例：電影約會卷"
              value={dayCardDraft.voucherDetail?.title || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onFieldChange('voucherDetail', { ...dayCardDraft.voucherDetail, title: event.target.value })
              }
              className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">內容描述</label>
            <textarea
              placeholder="想帶對方去哪裡，或這張卷可以換到什麼？"
              value={dayCardDraft.voucherDetail?.message || ''}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                onFieldChange('voucherDetail', { ...dayCardDraft.voucherDetail, message: event.target.value })
              }
              className="w-full bg-white/5 rounded-xl px-4 py-2.5 min-h-[80px] border border-white/10 focus:border-aurora focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">主題 / 地點</label>
              <input
                type="text"
                placeholder="例：想去哪裡我就陪你去"
                value={dayCardDraft.voucherDetail?.location || ''}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onFieldChange('voucherDetail', { ...dayCardDraft.voucherDetail, location: event.target.value })
                }
                className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">使用期限</label>
              <input
                type="text"
                placeholder="例：2025 / 12 / 31 前"
                value={dayCardDraft.voucherDetail?.validUntil || ''}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onFieldChange('voucherDetail', { ...dayCardDraft.voucherDetail, validUntil: event.target.value })
                }
                className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">備註 / 注意事項</label>
            <textarea
              placeholder="使用方式、次數限制或其它貼心提醒"
              value={dayCardDraft.voucherDetail?.terms || ''}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                onFieldChange('voucherDetail', { ...dayCardDraft.voucherDetail, terms: event.target.value })
              }
              className="w-full bg-white/5 rounded-xl px-4 py-2.5 min-h-[80px] border border-white/10 focus:border-aurora focus:outline-none"
            />
          </div>
          <VoucherDesignEditorModal
            countdownId={countdownId}
            day={activeDay}
            isOpen={showVoucherModal}
            card={voucherCard}
            voucherDetail={dayCardDraft.voucherDetail}
            onSave={(payload) => {
              onVoucherSave(payload);
              setShowVoucherModal(false);
            }}
            onDelete={() => {
              onVoucherDelete();
              setShowVoucherModal(false);
            }}
            onClose={() => setShowVoucherModal(false)}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-aurora to-purple-500 text-slate-900 font-bold hover:opacity-90 transition-opacity"
      >
        💾 儲存 Day {activeDay} 小卡
      </button>
      <AssetLibraryModal
        isOpen={showGlobalAssetModal}
        onClose={() => setShowGlobalAssetModal(false)}
        onSelect={async (asset: UserAsset) => {
          try {
            const canUseClipboard = typeof navigator !== 'undefined' && navigator.clipboard?.writeText;
            if (canUseClipboard) {
              await navigator.clipboard.writeText(asset.originalUrl || asset.url);
              showToast('已複製素材連結，可貼到任一圖片欄位', 'success');
            } else {
              throw new Error('Clipboard not supported');
            }
          } catch (error) {
            console.warn('Failed to copy asset url', error);
            showToast('此瀏覽器無法自動複製，請手動貼上', 'warning');
          } finally {
            setShowGlobalAssetModal(false);
          }
        }}
      />
    </div>
  );
}

export default DayCardEditor;

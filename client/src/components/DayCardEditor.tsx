import { ChangeEvent } from 'react';
import { HiOutlineBookOpen, HiOutlineGift } from 'react-icons/hi2';
import CgScriptEditor from './CgScriptEditor';
import ImageUploadField from './ImageUploadField';
import VoucherDesignEditor from './VoucherDesignEditor';
import type { VoucherCard } from '../store/countdownSlice';

interface QrReward {
  title?: string;
  message?: string;
  imageUrl?: string;
  qrCode?: string;
}

interface VoucherDetail {
  title?: string;
  message?: string;
  location?: string;
  terms?: string;
  validUntil?: string;
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
  return (
    <div className="glass-panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">編輯 Day {activeDay}</h2>
        <p className="text-xs text-gray-400">
          {startDate
            ? `釋出：${new Date(new Date(startDate).getTime() + (activeDay - 1) * 86400000).toLocaleDateString()}`
            : '未設定日期'}
        </p>
      </div>

      {/* 類型切換 */}
      <div className="flex gap-3">
        {['story', 'qr', 'voucher'].map((mode) => (
          <button
            type="button"
            key={mode}
            onClick={() => onTypeChange(mode as 'story' | 'qr' | 'voucher')}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
              dayCardDraft.type === mode
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
      {dayCardDraft.type === 'story' && (
        <div className="pt-2 border-t border-white/10">
          <CgScriptEditor
            value={cgScriptDraft}
            onChange={onCgScriptChange}
            countdownId={countdownId}
          />
        </div>
      )}

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
          <h3 className="text-sm font-semibold text-gray-300">兌換卷設定</h3>
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
          <VoucherDesignEditor
            countdownId={countdownId}
            day={activeDay}
            card={voucherCard}
            onSave={onVoucherSave}
            onDelete={onVoucherDelete}
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
    </div>
  );
}

export default DayCardEditor;

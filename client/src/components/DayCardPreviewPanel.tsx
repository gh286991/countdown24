import { useState } from 'react';
import CgPlayer from './CgPlayer';
import QrCardPreview from './QrCardPreview';
import PrintCardPreview from './PrintCardPreview';
import DayCardPreviewCard from './DayCardPreviewCard';
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

interface DayCardPreviewPanelProps {
  activeDay: number;
  type: 'story' | 'qr' | 'voucher';
  title: string;
  description: string;
  coverImage?: string;
  qrReward?: QrReward;
  voucherDetail?: VoucherDetail | null;
  voucherCard?: VoucherCard;
  cgPreview: any;
}

function DayCardPreviewPanel({
  activeDay,
  type,
  title,
  description,
  qrReward,
  voucherDetail,
  voucherCard,
  coverImage,
  cgPreview,
}: DayCardPreviewPanelProps) {
  const [showCgPlayer, setShowCgPlayer] = useState(false);

  return (
    <div className="space-y-4">
      {/* 小卡預覽 */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-300">小卡預覽</span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${
                type === 'story'
                  ? 'bg-blue-500/20 text-blue-300'
                  : type === 'qr'
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'bg-amber-500/20 text-amber-200'
              }`}
            >
              {type === 'story' ? 'CG' : type === 'qr' ? '禮品' : '兌換卷'}
            </span>
          </div>
        </div>
        
        {/* 模擬接收者看到的卡片 */}
        <DayCardPreviewCard coverImage={coverImage}>
          {type === 'story' ? (
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em]">Day {activeDay}</p>
              <h4 className="text-base font-semibold">{title || '尚未命名'}</h4>
              <p className="text-xs text-gray-300 min-h-[3rem] line-clamp-3">
                {description || '預備中...'}
              </p>
            </div>
          ) : type === 'qr' ? (
            <QrCardPreview
              day={activeDay}
              title={title}
              description={description}
              qrReward={qrReward}
              variant="card"
            />
          ) : (
            <div className="space-y-2 text-sm text-gray-300">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em]">Day {activeDay}</p>
                <h4 className="text-base font-semibold">{voucherDetail?.title || title || '尚未命名'}</h4>
                <p className="text-xs text-gray-400">{voucherDetail?.message || description || '預備中...'}</p>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                {voucherDetail?.location && (
                  <p>
                    體驗主題：<span className="text-white">{voucherDetail.location}</span>
                  </p>
                )}
                {voucherDetail?.validUntil && (
                  <p>
                    使用期限：<span className="text-white">{voucherDetail.validUntil}</span>
                  </p>
                )}
                {voucherDetail?.terms && (
                  <p>
                    注意事項：<span className="text-white">{voucherDetail.terms}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </DayCardPreviewCard>
      </div>

      {/* CG 播放器 */}
      {type === 'story' && (
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">CG 播放預覽</h3>
            <button
              type="button"
              onClick={() => setShowCgPlayer(!showCgPlayer)}
              className="text-xs px-3 py-1.5 rounded-lg bg-aurora/20 text-aurora hover:bg-aurora/30 transition-colors"
            >
              {showCgPlayer ? '收起' : '▶️ 播放'}
            </button>
          </div>
          {showCgPlayer && (
            cgPreview ? (
              <CgPlayer script={cgPreview} />
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400 bg-white/5 rounded-xl">
                JSON 格式錯誤
              </div>
            )
          )}
        </div>
      )}

      {/* 禮品卡模態預覽 - 接收者視角 */}
      {type === 'qr' && (
        <div className="glass-panel p-0 overflow-hidden">
          <div className="bg-white/5 px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">接收者視角 · 禮品預覽</h3>
            <span className="text-xs text-gray-400">Day {activeDay}</span>
          </div>
          <div className="p-5">
            <QrCardPreview
              day={activeDay}
              title={title}
              description={description}
              qrReward={qrReward}
              variant="modal"
            />
          </div>
        </div>
      )}
      {type === 'voucher' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">接收者視角 · 兌換卷資訊</h3>
            <span className="text-xs text-gray-400">Day {activeDay}</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <p className="text-lg font-semibold">{voucherDetail?.title || title || '未命名兌換卷'}</p>
            <p className="text-sm text-gray-300">{voucherDetail?.message || description || '尚未填寫內容'}</p>
            <div className="grid gap-2 text-xs text-gray-400">
              {voucherDetail?.location && (
                <p>
                  主題 / 地點：<span className="text-white">{voucherDetail.location}</span>
                </p>
              )}
              {voucherDetail?.validUntil && (
                <p>
                  使用期限：<span className="text-white">{voucherDetail.validUntil}</span>
                </p>
              )}
              {voucherDetail?.terms && (
                <p>
                  注意事項：<span className="text-white">{voucherDetail.terms}</span>
                </p>
              )}
            </div>
          </div>
          {voucherCard ? (
            <div>
              {voucherCard.previewImage ? (
                <img
                  src={voucherCard.previewImage}
                  alt={`Day ${activeDay} Voucher`}
                  className="w-full rounded-[28px] border border-white/10 shadow-lg"
                />
              ) : (
                <PrintCardPreview
                  variant="voucher"
                  card={{
                    day: activeDay,
                    template: voucherCard.template,
                    imageUrl: voucherCard.imageUrl,
                    qrCode: '',
                    title: voucherCard.title,
                    subtitle: voucherCard.subtitle,
                    note: voucherCard.note,
                    accentColor: voucherCard.accentColor,
                  }}
                />
              )}
            </div>
          ) : (
            <PrintCardPreview
              variant="voucher"
              card={{
                day: activeDay,
                template: 'imageLeft',
                imageUrl: '',
                qrCode: '',
                title: `Day ${activeDay} Voucher`,
                subtitle: '用這張卷帶對方去想去的地方',
                note: '可自由置入條件、次數限制或貼心提醒。',
                accentColor: '#fbbf24',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default DayCardPreviewPanel;

import { useState } from 'react';
import CgPlayer from './CgPlayer';
import QrCardPreview from './QrCardPreview';
import { PresignedImage } from './PresignedImage';

interface QrReward {
  title?: string;
  message?: string;
  imageUrl?: string;
  qrCode?: string;
}

interface DayCardPreviewPanelProps {
  activeDay: number;
  type: 'story' | 'qr';
  title: string;
  description: string;
  qrReward?: QrReward;
  cgPreview: any;
}

function DayCardPreviewPanel({
  activeDay,
  type,
  title,
  description,
  qrReward,
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
                  : 'bg-purple-500/20 text-purple-300'
              }`}
            >
              {type === 'story' ? 'CG' : 'QR'}
            </span>
          </div>
        </div>
        
        {/* 模擬接收者看到的卡片 */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {type === 'story' ? (
            <>
              {cgPreview?.cover?.image || cgPreview?.scenes?.[0]?.background ? (
                <PresignedImage
                  src={cgPreview.cover?.image || cgPreview.scenes[0].background}
                  alt={`Day ${activeDay}`}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-gray-500 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                  尚未設定 CG 封面
                </div>
              )}
              <div className="p-4 space-y-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em]">Day {activeDay}</p>
                <h4 className="text-base font-semibold">{title || '尚未命名'}</h4>
                <p className="text-xs text-gray-300 min-h-[3rem] line-clamp-3">
                  {description || '預備中...'}
                </p>
              </div>
            </>
          ) : (
            <QrCardPreview
              day={activeDay}
              title={title}
              description={description}
              qrReward={qrReward}
              variant="card"
            />
          )}
        </div>
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

      {/* QR 模態預覽 - 接收者視角 */}
      {type === 'qr' && (
        <div className="glass-panel p-0 overflow-hidden">
          <div className="bg-white/5 px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">接收者視角 · QR 預覽</h3>
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
    </div>
  );
}

export default DayCardPreviewPanel;


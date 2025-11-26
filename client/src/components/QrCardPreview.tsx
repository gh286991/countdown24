import { QRCodeSVG } from 'qrcode.react';
import { PresignedImage } from './PresignedImage';

interface QrReward {
  title?: string;
  message?: string;
  imageUrl?: string;
  qrCode?: string;
}

interface QrCardPreviewProps {
  day: number;
  title?: string;
  description?: string;
  qrReward?: QrReward;
  variant?: 'card' | 'modal';
}

/**
 * 禮品卡預覽元件
 * @param variant - 'card': 小卡樣式（用於列表）, 'modal': 完整模態樣式（用於詳細預覽）
 */
function QrCardPreview({ day, title, description, qrReward, variant = 'card' }: QrCardPreviewProps) {
  if (variant === 'card') {
    // 小卡樣式 - 用於倒數列表
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {qrReward?.imageUrl ? (
          <PresignedImage
            src={qrReward.imageUrl}
            alt={qrReward.title || title || `Day ${day}`}
            className="h-48 w-full object-cover"
          />
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-gray-500 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
            尚未設定禮物圖片
          </div>
        )}
        <div className="p-4 space-y-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em]">Day {day}</p>
          <h4 className="text-base font-semibold">
            {qrReward?.title || title || '尚未命名'}
          </h4>
          <p className="text-xs text-gray-300 min-h-[3rem] line-clamp-3">
            {qrReward?.message || description || '預備中...'}
          </p>
        </div>
      </div>
    );
  }

  // 模態樣式 - 用於完整預覽（與接收者看到的一致）
  return (
    <div className="space-y-3">
      {qrReward?.imageUrl ? (
        <PresignedImage
          src={qrReward.imageUrl}
          alt={qrReward.title || title || `Day ${day}`}
          className="w-full h-64 object-cover rounded-2xl"
        />
      ) : (
        <div className="w-full h-64 flex items-center justify-center bg-white/5 rounded-2xl text-xs text-gray-400">
          尚未設定圖片
        </div>
      )}
      <div className="space-y-1">
        <h4 className="text-lg font-semibold">
          {qrReward?.title || title || '未命名禮物'}
        </h4>
        <p className="text-sm text-gray-300">
          {qrReward?.message || description || '尚未填寫訊息'}
        </p>
        <div className="text-xs text-gray-400">
          禮品卡內容：<span className="text-white">{qrReward?.qrCode || '尚未設定'}</span>
        </div>
        {qrReward?.qrCode && (
          <div className="mt-3 flex justify-center">
            <QRCodeSVG
              value={qrReward.qrCode}
              size={192}
              bgColor="transparent"
              fgColor="#f8fafc"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default QrCardPreview;

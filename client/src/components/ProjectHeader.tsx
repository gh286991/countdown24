import { ChangeEvent, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ProjectHeaderProps {
  title: string;
  totalDays: number;
  availableDay: number;
  startDate?: string;
  recipientCount: number;
  receiverEmails: string;
  onReceiverEmailsChange: (value: string) => void;
  onAssign: () => void;
  onViewReceivers: () => void;
  onGenerateInvite: () => Promise<{ token: string; inviteUrl: string }>;
  countdownId: string;
}

function ProjectHeader({
  title,
  totalDays,
  availableDay,
  startDate,
  recipientCount,
  receiverEmails,
  onReceiverEmailsChange,
  onAssign,
  onViewReceivers,
  onGenerateInvite,
  countdownId,
}: ProjectHeaderProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState<{ token: string; inviteUrl: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerateInvite = async () => {
    setGenerating(true);
    try {
      const data = await onGenerateInvite();
      setInviteData(data);
      setShowInviteModal(true);
    } catch (error) {
      console.error('Failed to generate invite:', error);
      alert('生成邀請連結失敗');
    } finally {
      setGenerating(false);
    }
  };

  const fullInviteUrl = inviteData ? `${window.location.origin}/invite/${inviteData.token}` : '';

  const handleCopyLink = () => {
    if (fullInviteUrl) {
      navigator.clipboard.writeText(fullInviteUrl);
      alert('連結已複製！');
    }
  };

  return (
    <>
      <div className="mb-5 grid gap-6 items-stretch lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="glass-panel p-6 space-y-3 flex flex-col justify-center">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">倒數專案</p>
            <h1 className="text-3xl font-bold mt-1">{title}</h1>
          </div>
          <p className="text-sm text-gray-300">
            共 {totalDays} 天 · 目前解鎖 Day {availableDay}{' '}
            {startDate ? `· 開始日期 ${new Date(startDate).toLocaleDateString()}` : ''}
          </p>
          <p className="text-xs text-gray-500">
            在右側可快速分享給朋友或生成邀請 QR code，底下則可編輯每日小卡內容。
          </p>
        </div>
        
        {/* 分享設定 */}
        <div className="glass-panel p-4 space-y-3 w-full">
          <h3 className="text-sm font-semibold text-gray-300">分享給朋友</h3>
          
          {/* 生成邀請連結 */}
          <button
            type="button"
            onClick={handleGenerateInvite}
            disabled={generating}
            className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-semibold transition-colors disabled:opacity-50"
          >
            {generating ? '生成中...' : '📱 生成邀請 QR Code'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-slate-900 text-gray-500">或</span>
            </div>
          </div>

          <textarea
            placeholder="輸入朋友的 Email，用逗號分隔&#10;例：user1@example.com, user2@example.com"
            value={receiverEmails}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onReceiverEmailsChange(event.target.value)}
            className="w-full bg-white/5 rounded-xl px-3 py-2 min-h-[60px] text-sm border border-white/10 focus:border-aurora focus:outline-none"
          />
          <button
            type="button"
            onClick={onAssign}
            className="w-full py-2 bg-aurora/90 hover:bg-aurora rounded-xl text-slate-900 font-semibold transition-colors"
          >
            ✉️ 發送邀請
          </button>
          <button
            type="button"
            onClick={onViewReceivers}
            className="w-full py-2 text-xs text-gray-300 hover:text-aurora border border-white/10 hover:border-aurora/50 rounded-xl transition-colors"
          >
            👥 查看已分享名單 ({recipientCount})
          </button>
        </div>
      </div>

      {/* 邀請 QR Code 模態視窗 */}
      {showInviteModal && inviteData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-2xl">
            <button
              type="button"
              className="absolute top-3 right-3 text-sm text-gray-400 hover:text-white"
              onClick={() => setShowInviteModal(false)}
            >
              ✕
            </button>
            
            <h3 className="text-2xl font-semibold mb-4">邀請 QR Code</h3>
            <p className="text-sm text-gray-400 mb-6">
              朋友掃描此 QR Code 或點擊連結後，會自動註冊並加入到這個倒數專案。
            </p>

            {/* QR Code */}
            <div className="flex justify-center py-6 bg-white rounded-2xl mb-4">
              <QRCodeSVG value={fullInviteUrl} size={220} />
            </div>

            {/* 連結 */}
            <div className="bg-white/5 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-400 mb-1">邀請連結</p>
              <p className="text-sm text-gray-200 break-all">{fullInviteUrl}</p>
            </div>

            {/* 按鈕 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-semibold transition-colors"
              >
                📋 複製連結
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 bg-aurora/90 hover:bg-aurora rounded-xl text-slate-900 text-sm font-semibold transition-colors"
              >
                🖨️ 列印 QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectHeader;


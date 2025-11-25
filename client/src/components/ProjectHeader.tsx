import { ChangeEvent, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  HiOutlineQrCode, 
  HiOutlineEnvelope, 
  HiOutlineUsers, 
  HiOutlineXMark,
  HiOutlineClipboardDocument,
  HiOutlinePrinter,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineXCircle
} from 'react-icons/hi2';
import { useToast } from './ToastProvider';

interface ProjectHeaderProps {
  title: string;
  description?: string;
  coverImage?: string;
  totalDays: number;
  availableDay: number;
  startDate?: string;
  recipientCount: number;
  receiverEmails: string;
  onReceiverEmailsChange: (value: string) => void;
  onAssign: () => void;
  onViewReceivers: () => void;
  onGenerateInvite: () => Promise<{ token: string; inviteUrl: string }>;
  onUpdateProject?: (data: { title?: string; description?: string; coverImage?: string; startDate?: string; totalDays?: number }) => void;
  countdownId: string;
}

function ProjectHeader({
  title,
  description,
  coverImage,
  totalDays,
  availableDay,
  startDate,
  recipientCount,
  receiverEmails,
  onReceiverEmailsChange,
  onAssign,
  onViewReceivers,
  onGenerateInvite,
  onUpdateProject,
  countdownId,
}: ProjectHeaderProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState<{ token: string; inviteUrl: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description || '');
  const [editCoverImage, setEditCoverImage] = useState(coverImage || '');
  const [editStartDate, setEditStartDate] = useState(startDate ? new Date(startDate).toISOString().split('T')[0] : '');
  const [editTotalDays, setEditTotalDays] = useState(totalDays);
  const [saving, setSaving] = useState(false);

  const handleGenerateInvite = async () => {
    setGenerating(true);
    try {
      const data = await onGenerateInvite();
      setInviteData(data);
      setShowInviteModal(true);
    } catch (error) {
      console.error('Failed to generate invite:', error);
      showToast('生成邀請連結失敗', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const fullInviteUrl = inviteData ? `${window.location.origin}/invite/${inviteData.token}` : '';

  const handleCopyLink = () => {
    if (fullInviteUrl) {
      navigator.clipboard.writeText(fullInviteUrl);
      showToast('連結已複製！', 'success');
    }
  };

  const handleStartEdit = () => {
    setEditTitle(title);
    setEditDescription(description || '');
    setEditCoverImage(coverImage || '');
    setEditStartDate(startDate ? new Date(startDate).toISOString().split('T')[0] : '');
    setEditTotalDays(totalDays);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditTitle(title);
    setEditDescription(description || '');
    setEditCoverImage(coverImage || '');
    setEditStartDate(startDate ? new Date(startDate).toISOString().split('T')[0] : '');
    setEditTotalDays(totalDays);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!onUpdateProject) return;
    setSaving(true);
    try {
      await onUpdateProject({
        title: editTitle,
        description: editDescription,
        coverImage: editCoverImage,
        startDate: editStartDate || undefined,
        totalDays: editTotalDays,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update project:', error);
      showToast('更新失敗，請稍後再試', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-5 grid gap-6 items-stretch lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="glass-panel p-6 space-y-3 flex flex-col justify-center">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">倒數專案</p>
              {isEditing ? (
                <div className="space-y-3 mt-2">
                  {/* 封面圖片 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">封面圖片 URL</label>
                    <input
                      type="url"
                      value={editCoverImage}
                      onChange={(e) => setEditCoverImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/10 focus:border-christmas-red focus:outline-none"
                    />
                    {editCoverImage && (
                      <img 
                        src={editCoverImage} 
                        alt="封面預覽" 
                        className="mt-2 w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  {/* 專案名稱 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">專案名稱</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="輸入專案名稱"
                      className="w-full bg-white/5 rounded-lg px-3 py-2 text-lg font-bold border border-white/10 focus:border-christmas-red focus:outline-none"
                    />
                  </div>
                  {/* 專案說明 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">專案說明</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="輸入專案說明..."
                      rows={3}
                      className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/10 focus:border-christmas-red focus:outline-none resize-none"
                    />
                  </div>
                  {/* 倒數天數 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">倒數天數</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={editTotalDays}
                      onChange={(e) => setEditTotalDays(Number(e.target.value) || 1)}
                      className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/10 focus:border-christmas-red focus:outline-none"
                    />
                  </div>
                  {/* 開始日期 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">開始日期</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/10 focus:border-christmas-red focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">留空則不設定開始日期</p>
                  </div>
                  {/* 編輯按鈕 */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={saving || !editTitle.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-christmas-red/90 hover:bg-christmas-red rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <HiOutlineCheck className="w-4 h-4" />
                      {saving ? '儲存中...' : '儲存'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <HiOutlineXCircle className="w-4 h-4" />
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-3xl font-bold mt-1">{title}</h1>
                  {description && (
                    <p className="text-sm text-gray-300 mt-2">{description}</p>
                  )}
                  {coverImage && (
                    <img 
                      src={coverImage} 
                      alt={title} 
                      className="mt-3 w-full h-40 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              )}
            </div>
            {!isEditing && onUpdateProject && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                title="編輯專案資訊"
              >
                <HiOutlinePencil className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-300">
            共 {totalDays} 天 · 目前解鎖 Day {availableDay}{' '}
            {startDate && (
              <>
                · 開始日期 {new Date(startDate).toLocaleDateString()}
                {(() => {
                  const start = new Date(startDate);
                  const end = new Date(start);
                  end.setDate(end.getDate() + totalDays - 1);
                  return ` · 結束日期 ${end.toLocaleDateString()}`;
                })()}
              </>
            )}
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
            className="w-full py-2 bg-gradient-to-r from-christmas-red to-christmas-red-dark hover:from-christmas-red-light hover:to-christmas-red rounded-xl text-white font-semibold transition-colors disabled:opacity-50"
          >
            {generating ? '生成中...' : (
              <span className="flex items-center justify-center gap-2">
                <HiOutlineQrCode className="w-4 h-4" />
                生成邀請 QR Code
              </span>
            )}
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
            className="w-full bg-white/5 rounded-xl px-3 py-2 min-h-[60px] text-sm border border-white/10 focus:border-christmas-red focus:outline-none"
          />
          <button
            type="button"
            onClick={onAssign}
            className="w-full py-2 bg-christmas-red/90 hover:bg-christmas-red rounded-xl text-white font-semibold transition-colors"
          >
            <span className="flex items-center justify-center gap-2">
              <HiOutlineEnvelope className="w-4 h-4" />
              發送邀請
            </span>
          </button>
          <button
            type="button"
            onClick={onViewReceivers}
            className="w-full py-2 text-xs text-gray-300 hover:text-christmas-green border border-white/10 hover:border-christmas-green/50 rounded-xl transition-colors"
          >
            <span className="flex items-center justify-center gap-2">
              <HiOutlineUsers className="w-4 h-4" />
              查看已分享名單 ({recipientCount})
            </span>
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
              <HiOutlineXMark className="w-5 h-5" />
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
                <span className="flex items-center justify-center gap-2">
                  <HiOutlineClipboardDocument className="w-4 h-4" />
                  複製連結
                </span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 bg-christmas-red/90 hover:bg-christmas-red rounded-xl text-white text-sm font-semibold transition-colors"
              >
                <span className="flex items-center justify-center gap-2">
                  <HiOutlinePrinter className="w-4 h-4" />
                  列印 QR Code
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectHeader;


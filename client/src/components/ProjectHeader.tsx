import { ChangeEvent } from 'react';

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
}: ProjectHeaderProps) {
  return (
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
          在右側可快速指派接收者，底下則可編輯每日小卡內容。
        </p>
      </div>
      
      {/* 分享設定 */}
      <div className="glass-panel p-4 space-y-3 w-full">
        <h3 className="text-sm font-semibold text-gray-300">分享給接收者</h3>
        <textarea
          placeholder="輸入接收者 Email，用逗號分隔&#10;例：user1@example.com, user2@example.com"
          value={receiverEmails}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onReceiverEmailsChange(event.target.value)}
          className="w-full bg-white/5 rounded-xl px-3 py-2 min-h-[60px] text-sm border border-white/10 focus:border-aurora focus:outline-none"
        />
        <button
          type="button"
          onClick={onAssign}
          className="w-full py-2 bg-aurora/90 hover:bg-aurora rounded-xl text-slate-900 font-semibold transition-colors"
        >
          ✉️ 指派接收者
        </button>
        <button
          type="button"
          onClick={onViewReceivers}
          className="w-full py-2 text-xs text-gray-300 hover:text-aurora border border-white/10 hover:border-aurora/50 rounded-xl transition-colors"
        >
          👥 查看接收者列表 ({recipientCount})
        </button>
      </div>
    </div>
  );
}

export default ProjectHeader;


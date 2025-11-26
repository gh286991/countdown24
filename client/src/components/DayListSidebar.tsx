import { PresignedImage } from './PresignedImage';

interface DayCard {
  day: number;
  title?: string;
  description?: string;
  type?: 'story' | 'qr';
  coverImage?: string;
}

interface DayListSidebarProps {
  totalDays: number;
  activeDay: number;
  dayCards: DayCard[];
  onDaySelect: (day: number) => void;
}

function DayListSidebar({ totalDays, activeDay, dayCards, onDaySelect }: DayListSidebarProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-400 px-2">選擇編輯日期</h2>
      <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto pr-2">
        {Array.from({ length: totalDays }, (_, index) => {
          const day = index + 1;
          const card = dayCards.find((c) => c.day === day);
          return (
            <button
              key={day}
              onClick={() => onDaySelect(day)}
              className={`w-full text-left glass-panel rounded-xl transition-all overflow-hidden ${
                activeDay === day
                  ? 'border-2 border-aurora bg-aurora/10'
                  : 'border border-white/10 hover:border-white/30'
              }`}
            >
              {/* 封面圖 */}
              <div className="h-20 bg-white/5">
                {card?.coverImage ? (
                  <PresignedImage
                    src={card.coverImage}
                    alt={`Day ${day}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-500 bg-white/5">
                    尚未設定封面
                  </div>
                )}
              </div>
              
              {/* 內容資訊 */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Day {day}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      card?.type === 'story'
                        ? 'bg-blue-500/20 text-blue-300'
                        : card?.type === 'qr'
                        ? 'bg-purple-500/20 text-purple-300'
                        : card?.type === 'voucher'
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {card?.type === 'story'
                      ? 'CG'
                      : card?.type === 'qr'
                      ? '禮品'
                      : card?.type === 'voucher'
                      ? '兌換卷'
                      : '未設定'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold truncate">
                  {card?.title || '尚未設定標題'}
                </h3>
                {card?.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{card.description}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DayListSidebar;

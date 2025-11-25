interface DayCard {
  day: number;
  title?: string;
  description?: string;
  type?: 'story' | 'qr';
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
      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
        {Array.from({ length: totalDays }, (_, index) => {
          const day = index + 1;
          const card = dayCards.find((c) => c.day === day);
          return (
            <button
              key={day}
              onClick={() => onDaySelect(day)}
              className={`w-full text-left glass-panel p-4 rounded-xl transition-all ${
                activeDay === day
                  ? 'border-2 border-aurora bg-aurora/10'
                  : 'border border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Day {day}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    card?.type === 'story'
                      ? 'bg-blue-500/20 text-blue-300'
                      : card?.type === 'qr'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {card?.type === 'story' ? 'CG' : card?.type === 'qr' ? 'QR' : '未設定'}
                </span>
              </div>
              <h3 className="text-sm font-semibold truncate">
                {card?.title || '尚未設定標題'}
              </h3>
              {card?.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{card.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DayListSidebar;


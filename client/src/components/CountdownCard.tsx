import { KeyboardEvent } from 'react';
import { PresignedImage } from './PresignedImage';

const typeBadge: Record<string, string> = {
  story: '混合專案',
  qr: '禮品驚喜庫',
};

interface CountdownCardProps {
  item: any;
  onSelect?: (item: any) => void;
  onDelete?: (item: any) => void;
  onDaySelect?: (item: any, day: number) => void;
}

function CountdownCard({ item, onSelect, onDelete, onDaySelect }: CountdownCardProps) {
  const handleSelect = () => {
    onSelect?.(item);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect();
    }
  };

  const dayCards = item.dayCards?.length
    ? item.dayCards
    : Array.from({ length: item.totalDays || 0 }, (_, index) => ({
        day: index + 1,
        title: '',
        description: '',
        coverImage: '',
      }));
  const previewCards = dayCards.slice(0, 6);
  const remainingDays = Math.max((item.totalDays || dayCards.length) - previewCards.length, 0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className="story-card relative text-left hover:border-aurora/60 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-aurora/60"
    >
      {onDelete && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item);
          }}
          className="absolute top-5 right-5 rounded-full bg-black/60 text-xs px-3 py-1 text-white hover:bg-red-500 transition z-10"
        >
          刪除
        </button>
      )}
      <div className="relative h-56 overflow-hidden rounded-[1.5rem] m-4 mb-0">
        <PresignedImage src={item.coverImage} alt={item.title} className="absolute inset-0 object-cover w-full h-full" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/80" />
        <div className="relative z-10 flex h-full flex-col justify-end p-6 gap-2">
          <span className="inline-flex items-center text-[10px] uppercase tracking-[0.3em] text-white/70">
            {typeBadge[item.type] || 'Countdown'}
          </span>
          <h3 className="text-2xl font-semibold">{item.title}</h3>
          <p className="text-sm text-white/80 line-clamp-2">{item.description || '尚未填寫描述'}</p>
        </div>
      </div>
      <div className="story-card__content space-y-4">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>目前解鎖：Day {item.availableDay ?? 0}</span>
          <span>{item.totalDays} Days</span>
        </div>
        <div className="pt-1">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-[0.2em]">倒數列表</p>
          <div className="grid grid-cols-2 gap-3">
            {previewCards.map((card: any) => (
              <button
                key={`${item.id}-day-${card.day}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDaySelect?.(item, card.day);
                }}
                className="flex flex-col rounded-2xl bg-white/5 text-left hover:bg-white/10 transition overflow-hidden border border-white/5"
              >
                <div className="h-20 bg-white/5">
                  {card.coverImage ? (
                    <PresignedImage src={card.coverImage} alt={`Day ${card.day}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-500">尚未設定</div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em]">Day {card.day}</p>
                  <p className="text-sm font-semibold">{card.title || '未命名'}</p>
                  <p className="text-xs text-gray-400 line-clamp-2 min-h-[1.5rem]">
                    {card.description || '尚未輸入內容'}
                  </p>
                </div>
              </button>
            ))}
          </div>
          {remainingDays > 0 && (
            <p className="text-[11px] text-gray-400 text-right mt-3">
              還有 {remainingDays} 天等待編輯
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CountdownCard;

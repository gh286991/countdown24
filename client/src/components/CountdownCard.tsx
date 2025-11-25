import { KeyboardEvent } from 'react';
import { PresignedImage } from './PresignedImage';

const typeBadge: Record<string, string> = {
  story: '混合專案',
  qr: 'QR 禮物庫',
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
          className="absolute top-3 right-3 rounded-full bg-black/50 text-xs px-3 py-1 text-white hover:bg-red-500 transition"
        >
          刪除
        </button>
      )}
      <div className="h-48 overflow-hidden rounded-t-[1rem]">
        <PresignedImage src={item.coverImage} alt={item.title} className="object-cover w-full h-full" loading="lazy" />
      </div>
      <div className="story-card__content space-y-2">
        <div className="text-xs uppercase tracking-[0.3em] text-aurora">
          {typeBadge[item.type] || 'Countdown'}
        </div>
        <h3 className="text-xl font-semibold">{item.title}</h3>
        <p className="text-sm text-gray-300 line-clamp-2 min-h-[3rem]">{item.description}</p>
        <div className="flex justify-between text-xs text-gray-400">
          <span>目前解鎖：Day {item.availableDay ?? 0}</span>
          <span>{item.totalDays} Days</span>
        </div>
        <div className="pt-3">
          <p className="text-xs text-gray-400 mb-2">倒數列表</p>
          <div className="grid grid-cols-2 gap-2">
            {(item.dayCards?.length
              ? item.dayCards
              : Array.from({ length: item.totalDays || 0 }, (_, index) => ({
                  day: index + 1,
                  title: '',
                  description: '',
                  coverImage: '',
                }))
            ).map((card: any) => (
              <button
                key={`${item.id}-day-${card.day}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDaySelect?.(item, card.day);
                }}
                className="flex flex-col rounded-2xl bg-white/5 text-left hover:bg-white/10 transition overflow-hidden"
              >
                <div className="h-20 bg-white/5">
                  {card.coverImage ? (
                    <PresignedImage src={card.coverImage} alt={`Day ${card.day}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-500">尚未設定</div>
                  )}
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">Day {card.day}</p>
                  <p className="text-sm font-semibold">{card.title || '未命名'}</p>
                  <p className="text-xs text-gray-400 line-clamp-2 min-h-[1.5rem]">
                    {card.description || '尚未輸入內容'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CountdownCard;


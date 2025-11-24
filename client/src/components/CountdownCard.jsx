const typeBadge = {
  story: 'CG 遊戲過場',
  qr: 'QR 禮物庫',
};

function CountdownCard({ item, onSelect, onDelete }) {
  const handleSelect = () => {
    onSelect?.(item);
  };

  const handleKeyDown = (event) => {
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
        <img src={item.coverImage} alt={item.title} className="object-cover w-full h-full" loading="lazy" />
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
      </div>
    </div>
  );
}

export default CountdownCard;

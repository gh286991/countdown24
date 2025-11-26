interface ReceiverCardProps {
  assignment: any;
  onOpen?: (assignment: any) => void;
}

function ReceiverCard({ assignment, onOpen }: ReceiverCardProps) {
  const { countdown, creator } = assignment;
  if (!countdown) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(assignment)}
      className="w-full block glass-panel text-left hover:border-aurora/70 transition p-4"
    >
      <div className="flex items-start gap-4">
        <img src={countdown.coverImage} alt={countdown.title} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-[0.3em]">
            {countdown.type === 'qr' ? '禮品體驗' : countdown.type === 'voucher' ? '兌換卷體驗' : '劇情倒數'}
          </p>
          <h4 className="text-xl font-semibold truncate">{countdown.title}</h4>
          <p className="text-sm text-gray-400">Day {countdown.availableDay}</p>
          
          {/* 創建者資訊 */}
          {creator && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
              {creator.avatar ? (
                <img src={creator.avatar} alt={creator.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-aurora/20 flex items-center justify-center text-xs text-aurora">
                  {creator.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs text-gray-400">
                來自 <span className="text-aurora">{creator.name}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default ReceiverCard;

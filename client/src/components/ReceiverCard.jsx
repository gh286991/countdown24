function ReceiverCard({ assignment, onOpen }) {
  const { countdown } = assignment;
  if (!countdown) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(assignment)}
      className="glass-panel text-left hover:border-aurora/70 transition"
    >
      <div className="flex items-center gap-4">
        <img src={countdown.coverImage} alt={countdown.title} className="w-20 h-20 rounded-2xl object-cover" />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-[0.3em]">{countdown.type === 'qr' ? 'QR 禮物' : '劇情倒數'}</p>
          <h4 className="text-xl font-semibold">{countdown.title}</h4>
          <p className="text-sm text-gray-400">Day {countdown.availableDay}</p>
        </div>
      </div>
    </button>
  );
}

export default ReceiverCard;

import { Link } from 'react-router-dom';
import { HiOutlineCog6Tooth, HiOutlinePrinter } from 'react-icons/hi2';
import PrintCardPreview from './PrintCardPreview';
import { PresignedImage } from './PresignedImage';
import type { PrintCard } from '../store/countdownSlice';

interface PrintCardPanelProps {
  day: number;
  countdownId: string;
  card?: PrintCard;
  onEdit: () => void;
}

function PrintCardPanel({ day, countdownId, card, onEdit }: PrintCardPanelProps) {
  const linkTarget = countdownId ? `/creator/countdowns/${countdownId}/print` : '#';

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">列印小卡</h3>
          <p className="text-xs text-gray-500">
            {card?.isConfigured ? '已設定此日的小卡' : '尚未設定，點擊下方開始'}
          </p>
        </div>
        <span className="text-xs text-gray-400">Day {day}</span>
      </div>

      {card?.previewImage ? (
        <PresignedImage
          src={card.previewImage}
          preferObjectUrl
          alt={`Day ${day}`}
          className="w-full rounded-[28px] border border-white/10 shadow-lg"
        />
      ) : (
        <div>
          <div className="mb-2 text-xs text-yellow-200">尚未產生預覽，請設定 Canvas</div>
          <PrintCardPreview card={{ day, ...(card || {}) }} />
        </div>
      )}

      <div className="grid gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 py-2.5 text-sm font-semibold text-white"
        >
          <HiOutlineCog6Tooth className="w-4 h-4" />
          {card?.isConfigured ? '調整小卡版型' : '設定列印小卡'}
        </button>
        <Link
          to={linkTarget}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
            countdownId
              ? 'bg-aurora/80 hover:bg-aurora text-slate-900'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          <HiOutlinePrinter className="w-4 h-4" />
          列印全部小卡
        </Link>
      </div>
    </div>
  );
}

export default PrintCardPanel;

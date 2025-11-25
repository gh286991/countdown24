interface Reward {
  day: number;
  title: string;
  message: string;
  imageUrl: string;
  qrCode: string;
}

import { PresignedImage } from './PresignedImage';

interface RewardGridProps {
  rewards?: Reward[];
}

function RewardGrid({ rewards = [] }: RewardGridProps) {
  if (!rewards.length) {
    return <p className="text-gray-400">尚未新增 QR 禮物。</p>;
  }

  return (
    <div className="countdown-grid">
      {rewards.map((reward) => (
        <div key={`${reward.day}-${reward.title}`} className="glass-panel bg-white/5">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-400">
            <span>Day {reward.day}</span>
            <span>QR 禮物</span>
          </div>
          <PresignedImage src={reward.imageUrl} alt={reward.title} className="h-40 w-full object-cover rounded-2xl my-4" loading="lazy" />
          <h4 className="text-lg font-semibold">{reward.title}</h4>
          <p className="text-sm text-gray-300">{reward.message}</p>
          <div className="mt-4 p-4 rounded-2xl bg-black/30 text-center">
            <p className="text-xs text-gray-400">掃描兌換</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                reward.qrCode,
              )}`}
              alt={reward.qrCode}
              className="mx-auto mt-2"
              loading="lazy"
            />
            <p className="text-xs text-gray-500 break-all mt-2">{reward.qrCode}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RewardGrid;


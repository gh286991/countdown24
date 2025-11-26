import { PresignedImage } from './PresignedImage';

interface DayCardPreviewCardProps {
  coverImage?: string;
  children: React.ReactNode;
}

function DayCardPreviewCard({ coverImage, children }: DayCardPreviewCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="h-48 bg-white/5">
        {coverImage ? (
          <PresignedImage
            src={coverImage}
            alt="卡片封面"
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
      <div className="p-4">{children}</div>
    </div>
  );
}

export default DayCardPreviewCard;

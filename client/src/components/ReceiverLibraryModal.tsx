import { useEffect, useState } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import DayCardPreviewPanel from './DayCardPreviewPanel';
import api from '../api/client';
import type { VoucherCard } from '../store/countdownSlice';

interface ReceiverLibraryModalProps {
  openItem: {
    assignmentId: string;
    day: number;
    voucherCard?: VoucherCard;
  } | null;
  onClose: () => void;
}

function ReceiverLibraryModal({ openItem, onClose }: ReceiverLibraryModalProps) {
  const [content, setContent] = useState<any | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [voucherCard, setVoucherCard] = useState<VoucherCard | undefined>(undefined);

  useEffect(() => {
    if (!openItem) {
      setContent(null);
      setStatus('idle');
      setVoucherCard(undefined);
      return;
    }

    const fetchDayContent = async () => {
      setStatus('loading');
      try {
        const { data } = await api.get(
          `/receiver/countdowns/${openItem.assignmentId}/days/${openItem.day}`,
        );
        setContent(data);
        if (openItem.voucherCard) {
          setVoucherCard(openItem.voucherCard);
        } else if (data.type === 'voucher') {
          const detail = await api.get(`/receiver/countdowns/${openItem.assignmentId}`);
          const card =
            detail.data?.countdown?.voucherCards?.find(
              (vc: VoucherCard) => vc.day === openItem.day,
            ) || null;
          setVoucherCard(card || undefined);
        } else {
          setVoucherCard(undefined);
        }
        setStatus('idle');
      } catch (error) {
        console.error(error);
        setStatus('error');
      }
    };

    fetchDayContent();
  }, [openItem]);

  if (!openItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-3xl rounded-[32px] bg-[#0b1628] p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <HiOutlineXMark className="w-6 h-6" />
        </button>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Day {openItem.day}</p>
          <h3 className="text-2xl font-semibold">禮物內容</h3>
        </div>

        {status === 'loading' && <p className="text-sm text-gray-400">載入中...</p>}
        {status === 'error' && (
          <p className="text-sm text-red-300">無法載入內容，請稍後再試。</p>
        )}
        {content && (
          <DayCardPreviewPanel
            activeDay={content.day}
            type={content.type}
            title={content.title}
            description={content.description}
            coverImage={content.coverImage}
            qrReward={content.qrReward}
            voucherDetail={content.voucherDetail}
            voucherCard={voucherCard}
            cgPreview={content.cgScript}
          />
        )}
      </div>
    </div>
  );
}

export default ReceiverLibraryModal;

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { HiOutlineXMark } from 'react-icons/hi2';
import DayTimeline from '../components/DayTimeline';
import CgPlayer from '../components/CgPlayer';
import QrCardPreview from '../components/QrCardPreview';
import { clearDayContent, fetchReceiverDayContent, fetchReceiverExperience } from '../store/receiverSlice';
import type { RootState, AppDispatch } from '../store';

function ReceiverExperience() {
  const { assignmentId } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { selected, experienceStatus, dayStatus, dayContent } = useSelector((state: RootState) => state.receiver);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  useEffect(() => {
    if (assignmentId) {
      dispatch(fetchReceiverExperience(assignmentId));
    }
  }, [assignmentId, dispatch]);

  // 所有 Hooks 必須在條件返回之前調用
  const countdown = selected?.countdown || null;
  const creator = selected?.creator || null;
  
  const cards = useMemo(
    () => {
      if (!countdown) return [];
      return (countdown.dayCards || []).map((card: any) => ({
        ...card,
        locked: card.day > (countdown.availableDay || 0),
      }));
    },
    [countdown],
  );
  
  const firstUnlockedDay = useMemo(() => cards.find((card: any) => !card.locked)?.day || null, [cards]);
  const [modalDay, setModalDay] = useState<number | null>(null);

  useEffect(() => {
    if (!modalDay) {
      dispatch(clearDayContent());
      return;
    }
    if (assignmentId) {
      dispatch(fetchReceiverDayContent({ assignmentId, day: modalDay }));
    }
  }, [modalDay, assignmentId, dispatch]);

  const currentDayContent = modalDay && dayContent?.day === modalDay ? dayContent : null;
  const modalLoading = modalDay && dayStatus === 'loading' && !currentDayContent;

  // 載入中或沒有資料時顯示載入訊息（在所有 Hooks 之後）
  if (experienceStatus === 'loading' || !countdown) {
    return <p className="text-gray-400 text-center py-12">載入禮物內容中...</p>;
  }

  return (
    <section className="max-w-5xl mx-auto py-10 px-6 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-400">你收到的倒數</p>
        <h2 className="text-4xl font-semibold">{countdown.title}</h2>
        <p className="text-gray-300">{countdown.description}</p>
        
        {/* 創建者資訊 */}
        {creator && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {creator.avatar ? (
              <img src={creator.avatar} alt={creator.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-aurora/20 flex items-center justify-center text-sm text-aurora font-semibold">
                {creator.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-400">
              來自 <span className="text-aurora font-semibold">{creator.name}</span> 的禮物
            </span>
          </div>
        )}
      </div>
      <img src={countdown.coverImage} alt={countdown.title} className="w-full h-80 object-cover rounded-3xl" />
      <DayTimeline total={countdown.totalDays} current={countdown.availableDay} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card: any) => (
          <button
            key={`receiver-card-${card.day}`}
            type="button"
            className={`relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden text-left ${
              card.locked ? 'cursor-not-allowed opacity-60' : 'hover:border-aurora/60 transition'
            }`}
            onClick={() => {
              if (card.locked) return;
              setActiveDay(card.day);
              setModalDay(card.day);
            }}
          >
            {card.coverImage ? (
              <img src={card.coverImage} alt={`Day ${card.day}`} className="h-32 w-full object-cover" />
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-gray-500 bg-white/10">尚未設定封面</div>
            )}
            <div className="p-3 space-y-1">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em]">Day {card.day}</p>
              <h4 className="text-base font-semibold">{card.title || '尚未命名'}</h4>
              <p className="text-xs text-gray-300 min-h-[3rem]">{card.description || '預備中...'}</p>
            </div>
            {card.locked && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-sm">
                <p>尚未解鎖</p>
                <p className="text-xs text-gray-300 mt-1">請等待解鎖日期</p>
              </div>
            )}
          </button>
        ))}
      </div>
      {modalDay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute top-3 right-3 text-sm text-gray-400 hover:text-white"
              onClick={() => {
                setModalDay(null);
                dispatch(clearDayContent());
              }}
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-semibold mb-4">Day {modalDay}</h3>
            {modalLoading && <p className="text-gray-300">載入內容中...</p>}
            {!modalLoading && currentDayContent && currentDayContent.type === 'qr' && currentDayContent.qrReward ? (
              <QrCardPreview
                day={modalDay}
                qrReward={currentDayContent.qrReward}
                variant="modal"
              />
            ) : null}
            {!modalLoading && currentDayContent && currentDayContent.type === 'qr' && !currentDayContent.qrReward && (
              <p className="text-sm text-gray-300">此日尚未設定 QR 禮物內容。</p>
            )}
            {!modalLoading && currentDayContent && currentDayContent.type === 'story' ? (
              currentDayContent.cgScript ? (
                <CgPlayer key={`receiver-player-${modalDay}`} script={currentDayContent.cgScript} />
              ) : (
                <p className="text-sm text-gray-300">此日尚未設定 CG 劇情。</p>
              )
            ) : null}
            {!modalLoading && !currentDayContent && (
              <p className="text-sm text-gray-300">此日尚未設定內容。</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ReceiverExperience;

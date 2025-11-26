import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { fetchReceiverInbox } from '../store/receiverSlice';
import type { RootState, AppDispatch } from '../store';
import type { VoucherCard } from '../store/countdownSlice';
import ReceiverLibraryModal from '../components/ReceiverLibraryModal';

type QuickItem = {
  assignmentId: string;
  countdownTitle: string;
  day: number;
  type: 'qr' | 'voucher';
  cardTitle: string;
  releaseDate: string | null;
  voucherCard?: VoucherCard;
};

function ReceiverLibrary() {
  const dispatch = useDispatch<AppDispatch>();
  const { inbox, status } = useSelector((state: RootState) => state.receiver);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'gift' | 'voucher'>('gift');
  const [openItem, setOpenItem] = useState<{ assignmentId: string; day: number; voucherCard?: any } | null>(null);

  useEffect(() => {
    dispatch(fetchReceiverInbox());
  }, [dispatch]);

  const quickItems: QuickItem[] = useMemo(() => {
    return inbox.flatMap((assignment: any) => {
      const countdown = assignment.countdown;
      if (!countdown) return [];
      const baseDate = countdown.startDate ? new Date(countdown.startDate).getTime() : null;
      return (countdown.dayCards || [])
        .filter((card: any) => card.type === 'qr' || card.type === 'voucher')
        .map((card: any) => {
          const releaseDate =
            baseDate && Number.isFinite(baseDate)
              ? new Date(baseDate + (card.day - 1) * 86400000).toISOString()
              : null;
          const voucherCard =
            card.type === 'voucher'
              ? countdown.voucherCards?.find((voucher: any) => voucher.day === card.day)
              : undefined;
          return {
            assignmentId: assignment.id,
            countdownTitle: countdown.title,
            day: card.day,
            type: card.type,
            cardTitle: card.title,
            releaseDate,
            voucherCard,
          };
        });
    });
  }, [inbox]);

  const giftItems = useMemo(() => quickItems.filter((item) => item.type === 'qr'), [quickItems]);
  const voucherItems = useMemo(() => quickItems.filter((item) => item.type === 'voucher'), [quickItems]);

  const filterItems = (list: typeof quickItems) =>
    list.filter((item) => {
      const target = `${item.cardTitle || ''} ${item.countdownTitle || ''}`.toLowerCase();
      return target.includes(searchTerm.toLowerCase());
    });

  const filteredGiftItems = filterItems(giftItems);
  const filteredVoucherItems = filterItems(voucherItems);

  const formatDate = (value?: string | null) => {
    if (!value) return '未設定';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '未設定';
    return date.toLocaleDateString();
  };

  return (
    <section className="max-w-5xl mx-auto py-12 px-6 space-y-6">
      <div className="space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-[0.4em]">Gift Library</p>
        <h2 className="text-3xl font-semibold flex items-center gap-2">
          <HiOutlineSparkles className="w-7 h-7 text-amber-300" />
          禮品卡 / 兌換卷列表
        </h2>
        <p className="text-sm text-gray-400">
          快速查看你已收到的所有禮品卡與兌換卷。點擊即可前往指定日期體驗。
        </p>
      </div>

      <div className="glass-panel p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-200">搜尋禮品卡、兌換卷</p>
            <p className="text-xs text-gray-400">可輸入禮物名稱或倒數專案名稱</p>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="輸入標題或專案名稱..."
            className="w-full md:w-72 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm focus:border-aurora focus:outline-none"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-full bg-white/5 p-1">
            {[
              { key: 'gift', label: '禮品卡', count: filteredGiftItems.length },
              { key: 'voucher', label: '兌換卷', count: filteredVoucherItems.length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'gift' | 'voucher')}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? tab.key === 'gift'
                      ? 'bg-aurora/80 text-slate-900'
                      : 'bg-amber-400/80 text-slate-900'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {tab.label}
                <span className="text-xs ml-2">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {activeTab === 'gift' && filteredGiftItems.length === 0 && (
              <p className="text-xs text-gray-500">目前沒有禮品卡或符合搜尋的項目。</p>
            )}
            {activeTab === 'voucher' && filteredVoucherItems.length === 0 && (
              <p className="text-xs text-gray-500">目前沒有兌換卷或符合搜尋的項目。</p>
            )}
            {(activeTab === 'gift' ? filteredGiftItems : filteredVoucherItems).map((item) => (
              <button
                key={`${item.assignmentId}-${activeTab}-${item.day}`}
                type="button"
                onClick={() => setOpenItem({ assignmentId: item.assignmentId, day: item.day, voucherCard: item.voucherCard })}
                className={`w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-left transition ${
                  activeTab === 'gift'
                    ? 'hover:border-aurora/60'
                    : 'hover:border-amber-300/40'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400">Day {item.day}</p>
                <p className="text-sm font-semibold text-white">
                  {item.cardTitle || (activeTab === 'gift' ? '禮品驚喜' : '兌換卷')}
                </p>
                <p className="text-xs text-gray-400">{item.countdownTitle}</p>
                <p className="text-[11px] text-gray-500 mt-1">開啟日：{formatDate(item.releaseDate)}</p>
              </button>
            ))}
          </div>
        </div>

        {status === 'loading' && <p className="text-xs text-gray-500">同步中...</p>}
      </div>
      <ReceiverLibraryModal openItem={openItem} onClose={() => setOpenItem(null)} />
    </section>
  );
}

export default ReceiverLibrary;

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClock, HiOutlineGift, HiOutlineUser, HiOutlineArrowLeft, HiOutlineCalendar } from 'react-icons/hi2';
import { useToast } from '../components/ToastProvider';
import { fetchCountdownDetail, fetchVoucherRedemptions, confirmVoucherRedemption, rejectVoucherRedemption } from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';
import type { VoucherRedemption } from '../store/countdownSlice';

function VoucherRedemptionsPage() {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { selected, redemptions, redemptionsStatus, pendingRedemptionsCount } = useSelector((state: RootState) => state.countdowns);
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');

  useEffect(() => {
    if (id) {
      dispatch(fetchCountdownDetail(id));
      dispatch(fetchVoucherRedemptions(id));
    }
  }, [id, dispatch]);

  const handleConfirm = async (redemption: VoucherRedemption) => {
    if (!id) return;
    setProcessingId(redemption.id);
    try {
      await dispatch(confirmVoucherRedemption({
        countdownId: id,
        redemptionId: redemption.id,
        note: noteInput[redemption.id] || undefined,
      })).unwrap();
      showToast('已確認兌換', 'success');
      setNoteInput((prev) => ({ ...prev, [redemption.id]: '' }));
    } catch (error: any) {
      showToast(error || '確認兌換失敗', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (redemption: VoucherRedemption) => {
    if (!id) return;
    setProcessingId(redemption.id);
    try {
      await dispatch(rejectVoucherRedemption({
        countdownId: id,
        redemptionId: redemption.id,
        note: noteInput[redemption.id] || undefined,
      })).unwrap();
      showToast('已拒絕兌換', 'success');
      setNoteInput((prev) => ({ ...prev, [redemption.id]: '' }));
    } catch (error: any) {
      showToast(error || '拒絕兌換失敗', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRedemptions = redemptions.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getStatusBadge = (status: VoucherRedemption['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <HiOutlineClock className="w-4 h-4" />
            待確認
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/30">
            <HiOutlineCheckCircle className="w-4 h-4" />
            已確認
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30">
            <HiOutlineXCircle className="w-4 h-4" />
            已拒絕
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (redemptionsStatus === 'loading' && redemptions.length === 0) {
    return (
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center text-gray-400 py-20">載入中...</div>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      {/* 頁面標題 */}
      <div className="mb-8">
        <Link
          to={`/creator/countdowns/${id}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          返回編輯頁面
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <HiOutlineGift className="w-8 h-8 text-aurora" />
              兌換請求管理
            </h1>
            {selected && (
              <p className="text-gray-400 mt-2 flex items-center gap-2">
                <HiOutlineCalendar className="w-4 h-4" />
                {selected.title}
              </p>
            )}
          </div>
          {pendingRedemptionsCount > 0 && (
            <div className="px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
              <span className="text-yellow-300 font-bold text-lg">{pendingRedemptionsCount}</span>
              <span className="text-yellow-300/80 ml-2">個待處理</span>
            </div>
          )}
        </div>
      </div>

      {/* 篩選按鈕 */}
      <div className="glass-panel p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'confirmed', 'rejected'] as const).map((f) => {
            const count = f === 'all' 
              ? redemptions.length 
              : redemptions.filter((r) => r.status === f).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  filter === f
                    ? 'bg-aurora/20 text-aurora border border-aurora/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                }`}
              >
                {f === 'all' ? '全部' : f === 'pending' ? '待確認' : f === 'confirmed' ? '已確認' : '已拒絕'}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  filter === f ? 'bg-aurora/30' : 'bg-white/10'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 兌換請求列表 */}
      {filteredRedemptions.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <HiOutlineGift className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400 text-lg">
            {filter === 'all' ? '尚無兌換請求' : `沒有${filter === 'pending' ? '待確認' : filter === 'confirmed' ? '已確認' : '已拒絕'}的請求`}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            當接收者請求兌換兌換卷時，請求會顯示在這裡
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRedemptions.map((redemption) => (
            <div
              key={redemption.id}
              className="glass-panel p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-aurora/20 flex items-center justify-center flex-shrink-0">
                    {redemption.receiver?.avatar ? (
                      <img
                        src={redemption.receiver.avatar}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <HiOutlineUser className="w-7 h-7 text-aurora" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {redemption.receiver?.name || redemption.receiver?.email || '未知用戶'}
                    </p>
                    {redemption.receiver?.name && redemption.receiver?.email && (
                      <p className="text-sm text-gray-400">{redemption.receiver.email}</p>
                    )}
                    <p className="text-aurora font-medium mt-1">
                      Day {redemption.day} 兌換卷
                    </p>
                  </div>
                </div>
                {getStatusBadge(redemption.status)}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm bg-white/5 rounded-xl p-4">
                <div>
                  <p className="text-gray-500 mb-1">請求時間</p>
                  <p className="text-gray-200">{formatDate(redemption.requestedAt)}</p>
                </div>
                {redemption.confirmedAt && (
                  <div>
                    <p className="text-gray-500 mb-1">確認時間</p>
                    <p className="text-green-300">{formatDate(redemption.confirmedAt)}</p>
                  </div>
                )}
                {redemption.rejectedAt && (
                  <div>
                    <p className="text-gray-500 mb-1">拒絕時間</p>
                    <p className="text-red-300">{formatDate(redemption.rejectedAt)}</p>
                  </div>
                )}
                {redemption.note && (
                  <div className="sm:col-span-2">
                    <p className="text-gray-500 mb-1">接收者備註</p>
                    <p className="text-gray-200">{redemption.note}</p>
                  </div>
                )}
                {redemption.creatorNote && (
                  <div className="sm:col-span-2">
                    <p className="text-gray-500 mb-1">您的備註</p>
                    <p className="text-gray-200">{redemption.creatorNote}</p>
                  </div>
                )}
              </div>

              {redemption.status === 'pending' && (
                <div className="space-y-3 pt-2">
                  <input
                    type="text"
                    placeholder="回覆備註（可選，例如：已完成、請於週末前使用等）"
                    value={noteInput[redemption.id] || ''}
                    onChange={(e) => setNoteInput((prev) => ({ ...prev, [redemption.id]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-aurora/50 transition-colors"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={processingId === redemption.id}
                      onClick={() => handleConfirm(redemption)}
                      className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <HiOutlineCheckCircle className="w-5 h-5" />
                      確認兌換
                    </button>
                    <button
                      type="button"
                      disabled={processingId === redemption.id}
                      onClick={() => handleReject(redemption)}
                      className="flex-1 py-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <HiOutlineXCircle className="w-5 h-5" />
                      拒絕兌換
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default VoucherRedemptionsPage;


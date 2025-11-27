import dayjs from 'dayjs';
import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { HiOutlineXMark, HiSquares2X2, HiOutlineListBullet } from 'react-icons/hi2';
import CountdownCard from '../components/CountdownCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { createCountdown, deleteCountdown, fetchCreatorCountdowns } from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';

function CreatorDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items, status } = useSelector((state: RootState) => state.countdowns);
  const { user } = useSelector((state: RootState) => state.auth);
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recipientEmails, setRecipientEmails] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [totalDays, setTotalDays] = useState(24);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; countdown: any | null }>({
    isOpen: false,
    countdown: null,
  });

  useEffect(() => {
    // 只在尚未載入過（idle 狀態）且用戶是創作者時才發起請求
    if (user?.role === 'creator' && status === 'idle') {
      dispatch(fetchCreatorCountdowns());
    }
  }, [dispatch, user, status]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      showToast('請輸入倒數標題', 'warning');
      return;
    }
    if (!startDate) {
      showToast('請選擇開始日期', 'warning');
      return;
    }

    const payload = {
      title,
      description,
      startDate: dayjs(startDate).startOf('day').toISOString(),
      totalDays: Number.isFinite(Number(totalDays)) ? Number(totalDays) : 24,
      type: 'story',
      storyMoments: [],
      qrRewards: [],
      recipientEmails: recipientEmails
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean),
    };
    try {
      setIsSubmitting(true);
      await dispatch(createCountdown(payload)).unwrap();
      setIsSubmitting(false);
      setTitle('');
      setDescription('');
      setRecipientEmails('');
      setStartDate(new Date());
      setTotalDays(24);
      setIsModalOpen(false);
      dispatch(fetchCreatorCountdowns());
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const handleDeleteCountdown = (countdown: any) => {
    setDeleteConfirm({ isOpen: true, countdown });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.countdown) return;
    try {
      await dispatch(deleteCountdown(deleteConfirm.countdown.id)).unwrap();
      showToast('刪除成功', 'success');
      setDeleteConfirm({ isOpen: false, countdown: null });
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || '刪除失敗，請稍後再試。', 'error');
    }
  };

  const handleRefresh = () => {
    dispatch(fetchCreatorCountdowns());
  };

  return (
    <section className="max-w-6xl mx-auto py-12 px-6 space-y-10">
      <div className="glass-panel p-6 md:p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-[0.4em]">Dashboard</p>
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold leading-tight">我的倒數專案</h2>
            <p className="text-sm text-gray-400 mt-2">
              管理你所有的倒數體驗，快速檢視進度與每一天的內容，讓送禮氛圍更完整。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-2 py-1">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-full transition ${viewMode === 'card' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`}
              aria-pressed={viewMode === 'card'}
              aria-label="圖卡檢視"
            >
              <HiSquares2X2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-full transition ${viewMode === 'list' ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`}
              aria-pressed={viewMode === 'list'}
              aria-label="列表檢視"
            >
              <HiOutlineListBullet className="w-5 h-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 rounded-full border border-white/15 text-sm text-white/80 hover:border-aurora/60 hover:text-white transition"
          >
            重新整理
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-aurora to-blush text-slate-900 font-semibold text-sm shadow-lg shadow-aurora/30"
          >
            建立新專案
          </button>
        </div>
      </div>

      {status === 'loading' && (
        <div className="glass-panel p-6 text-center text-gray-400">載入倒數專案中，請稍候...</div>
      )}

      {!items.length && status === 'succeeded' && (
        <div className="glass-panel p-12 text-center space-y-4">
          <h3 className="text-2xl font-semibold">尚未建立倒數專案</h3>
          <p className="text-gray-400 text-sm">點擊「建立新專案」開始打造你的第一場倒數體驗。</p>
        </div>
      )}

      {viewMode === 'card' ? (
        <div className="countdown-grid">
          {items.map((item) => (
            <CountdownCard
              key={item.id}
              item={item}
              onSelect={(selected: any) => navigate(`/creator/countdowns/${selected.id}`)}
              onDelete={handleDeleteCountdown}
              onDaySelect={(selectedCountdown: any, day: number) => navigate(`/creator/countdowns/${selectedCountdown.id}?day=${day}`)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/creator/countdowns/${item.id}`)}
              className="w-full text-left glass-panel p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between hover:border-aurora/50 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 text-xs rounded-full bg-white/10 text-white/80">
                    {item.type === 'qr' ? '禮品驚喜庫' : '混合專案'}
                  </span>
                  <p className="text-xs text-gray-400">
                    開始：{item.startDate ? dayjs(item.startDate).format('YYYY/MM/DD') : '尚未設定'}
                  </p>
                </div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{item.description || '尚未填寫描述'}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-300">
                <span className="px-3 py-1 rounded-full bg-white/5">解鎖進度：Day {item.availableDay ?? 0}</span>
                <span className="px-3 py-1 rounded-full bg-white/5">總天數：{item.totalDays}</span>
                <span className="px-3 py-1 rounded-full bg-white/5">
                  接收者：{item.recipientIds ? item.recipientIds.length : (item.recipientEmails?.length || 0)}
                </span>
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteCountdown(item);
                  }}
                >
                  刪除
                </button>
              </div>
            </button>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-900/95 backdrop-blur-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute top-3 right-3 text-sm text-gray-400 hover:text-white"
              onClick={() => setIsModalOpen(false)}
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-semibold mb-4">建立新倒數專案</h3>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">倒數標題</label>
                <input
                  type="text"
                  placeholder="像是：2024 聖誕驚喜"
                  className="w-full bg-white/5 rounded-xl px-3 py-2"
                  value={title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">描述</label>
                <textarea
                  placeholder="簡單介紹這個倒數專案，收件者將在 Inbox 看見這段文字"
                  className="w-full bg-white/5 rounded-xl px-3 py-2 h-24"
                  value={description}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">選擇開始日期</p>
                <div className="rounded-2xl bg-white/5 p-3">
                  <DayPicker mode="single" selected={startDate} onSelect={(date) => setStartDate(date || new Date())} styles={{ caption: { color: 'white' } }} />
                </div>
                {startDate && (
                  <p className="text-xs text-gray-400">
                    開始於：{dayjs(startDate).format('YYYY / MM / DD')}，結束於：
                    {dayjs(startDate).add(Number(totalDays || 1) - 1, 'day').format('YYYY / MM / DD')}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-400">倒數天數</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={totalDays}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setTotalDays(Number(event.target.value) || 1)}
                  className="mt-1 w-full bg-white/5 rounded-xl px-3 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">接收者 Email</label>
                <textarea
                  placeholder="輸入多位接收者時以逗號分隔"
                  className="w-full bg-white/5 rounded-xl px-3 py-2"
                  value={recipientEmails}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRecipientEmails(event.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-white/10 text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-aurora to-blush text-slate-900 font-semibold disabled:opacity-70"
                >
                  {isSubmitting ? '建立中...' : '建立倒數'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="確認刪除"
        message={`確定要刪除「${deleteConfirm.countdown?.title}」嗎？此操作無法復原。`}
        confirmText="刪除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, countdown: null })}
      />
    </section>
  );
}

export default CreatorDashboard;

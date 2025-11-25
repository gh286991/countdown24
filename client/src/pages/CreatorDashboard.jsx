import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CountdownCard from '../components/CountdownCard';
import { createCountdown, deleteCountdown, fetchCreatorCountdowns } from '../store/countdownSlice';

function CreatorDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status } = useSelector((state) => state.countdowns);
  const { user } = useSelector((state) => state.auth);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recipientEmails, setRecipientEmails] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [totalDays, setTotalDays] = useState(24);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'creator') {
      dispatch(fetchCreatorCountdowns());
    }
  }, [dispatch, user]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      alert('請輸入倒數標題');
      return;
    }
    if (!startDate) {
      alert('請選擇開始日期');
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

  const handleDeleteCountdown = async (countdown) => {
    if (!window.confirm(`確定要刪除「${countdown.title}」嗎？`)) return;
    try {
      await dispatch(deleteCountdown(countdown.id)).unwrap();
    } catch (error) {
      console.error(error);
      alert(error?.message || '刪除失敗，請稍後再試。');
    }
  };

  return (
    <section className="max-w-6xl mx-auto py-10 px-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-[0.4em]">Dashboard</p>
              <h2 className="text-3xl font-semibold">我的倒數專案</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => dispatch(fetchCreatorCountdowns())}
                className="text-sm text-aurora"
              >
                重新整理
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-full bg-white/10 text-sm"
              >
                建立新專案
              </button>
            </div>
          </div>

          {status === 'loading' && <p className="text-gray-400">載入中...</p>}
          <div className="countdown-grid">
            {items.map((item) => (
              <CountdownCard
                key={item.id}
                item={item}
                onSelect={(selected) => navigate(`/creator/countdowns/${selected.id}`)}
                onDelete={handleDeleteCountdown}
                onDaySelect={(selectedCountdown, day) => navigate(`/creator/countdowns/${selectedCountdown.id}?day=${day}`)}
              />
            ))}
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-6">
            <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                className="absolute top-3 right-3 text-sm text-gray-400 hover:text-white"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
              <h3 className="text-xl font-semibold mb-4">建立新倒數專案</h3>
              <form className="space-y-4" onSubmit={handleCreate}>
                <input
                  type="text"
                  placeholder="倒數標題"
                  className="w-full bg-white/5 rounded-xl px-3 py-2"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
                <textarea
                  placeholder="描述"
                  className="w-full bg-white/5 rounded-xl px-3 py-2 h-24"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">選擇開始日期</p>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <DayPicker mode="single" selected={startDate} onSelect={setStartDate} styles={{ caption: { color: 'white' } }} />
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
                    onChange={(event) => setTotalDays(Number(event.target.value) || 1)}
                    className="mt-1 w-full bg-white/5 rounded-xl px-3 py-2"
                  />
                </div>
                <textarea
                  placeholder="接收者 Email（以逗號分隔）"
                  className="w-full bg-white/5 rounded-xl px-3 py-2"
                  value={recipientEmails}
                  onChange={(event) => setRecipientEmails(event.target.value)}
                />
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
      </div>
    </section>
  );
}

export default CreatorDashboard;

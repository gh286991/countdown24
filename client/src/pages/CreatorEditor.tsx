import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import CgPlayer from '../components/CgPlayer';
import QrCardPreview from '../components/QrCardPreview';
import sampleCgScript from '../data/sampleCgScript';
import { assignReceivers, fetchCountdownDetail, updateCountdown } from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';

const defaultQrReward = { title: '', message: '', imageUrl: '', qrCode: '' };
const emptyCard = { day: 1, title: '', description: '', coverImage: '', type: 'story', qrReward: { ...defaultQrReward } };

function CreatorEditor() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { selected, detailStatus } = useSelector((state: RootState) => state.countdowns);
  const [receiverEmails, setReceiverEmails] = useState('');
  const [cgScriptDraft, setCgScriptDraft] = useState(JSON.stringify(sampleCgScript, null, 2));
  const [activeDay, setActiveDay] = useState(Number(searchParams.get('day')) || 1);
  const [dayCardDraft, setDayCardDraft] = useState({ ...emptyCard, day: Number(searchParams.get('day')) || 1 });
  const [showPreview, setShowPreview] = useState(false);
  const dayFromUrl = Number(searchParams.get('day')) || 1;

  useEffect(() => {
    if (id) {
      dispatch(fetchCountdownDetail(id));
    }
  }, [id, dispatch]);

useEffect(() => {
  setActiveDay(dayFromUrl);
}, [dayFromUrl]);

  const handleAssign = () => {
    if (!id) return;
    const receiverList = receiverEmails
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
    if (!receiverList.length) return;
    dispatch(assignReceivers({ id, receiverEmails: receiverList }));
    setReceiverEmails('');
  };

  const totalDays = selected ? selected.totalDays || 24 : 24;

  const currentDayCard = useMemo(() => {
    if (!selected) return { ...emptyCard, day: activeDay };
    const match = (selected.dayCards || []).find((card) => card.day === activeDay);
    return match || { ...emptyCard, day: activeDay };
  }, [selected, activeDay]);

useEffect(() => {
  const normalized = {
    ...emptyCard,
    ...currentDayCard,
    day: activeDay,
    qrReward: { ...defaultQrReward, ...(currentDayCard.qrReward || {}) },
  };
  setDayCardDraft(normalized);
  setCgScriptDraft(
    normalized.type === 'story' && normalized.cgScript
      ? JSON.stringify(normalized.cgScript, null, 2)
      : JSON.stringify(sampleCgScript, null, 2),
  );
}, [currentDayCard, activeDay]);

  const cgPreview = useMemo(() => {
    if (!cgScriptDraft.trim()) return null;
    try {
      return JSON.parse(cgScriptDraft);
    } catch (error) {
      return null;
    }
  }, [cgScriptDraft]);

  if (detailStatus === 'loading' || !selected) {
    return <p className="text-center text-gray-400 py-10">載入倒數內容...</p>;
  }

  const handleDaySelect = (value: number) => {
    setActiveDay(value);
    setSearchParams({ day: String(value) });
  };

  const handleDayCardSave = () => {
    if (!id) return;
    let parsedScript = null;
    if (dayCardDraft.type === 'story') {
      if (!cgScriptDraft.trim()) {
        alert('請輸入 CG JSON');
        return;
      }
      try {
        parsedScript = JSON.parse(cgScriptDraft);
      } catch (error) {
        alert('CG JSON 格式錯誤，請檢查括號或逗號。');
        return;
      }
    }

    const normalizedCard = {
      ...dayCardDraft,
      day: activeDay,
      type: dayCardDraft.type === 'qr' ? 'qr' : 'story',
      cgScript: dayCardDraft.type === 'story' ? parsedScript : null,
      qrReward:
        dayCardDraft.type === 'qr'
          ? { ...defaultQrReward, ...(dayCardDraft.qrReward || {}) }
          : null,
    };

    const existing = selected.dayCards || [];
    const map = new Map(existing.map((card) => [card.day, card]));
    map.set(normalizedCard.day, normalizedCard);
    const nextCards = Array.from({ length: totalDays }).map((_, index) => {
      const day = index + 1;
      return map.get(day) || { ...emptyCard, day };
    });
    dispatch(updateCountdown({ id, data: { dayCards: nextCards } }));
    if (dayCardDraft.type === 'story') {
      dispatch(updateCountdown({ id, data: { cgScript: parsedScript } }));
    }
  };

  const handleTypeChange = (mode: 'story' | 'qr') => {
    setDayCardDraft((prev) => ({ ...prev, type: mode }));
  };

  return (
    <section className="max-w-[1800px] mx-auto py-6 px-6">
      {/* 頂部：專案資訊 + 分享設定 */}
      <div className="mb-5 grid gap-6 items-stretch lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="glass-panel p-6 space-y-3 flex flex-col justify-center">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">倒數專案</p>
            <h1 className="text-3xl font-bold mt-1">{selected.title}</h1>
          </div>
          <p className="text-sm text-gray-300">
            共 {selected.totalDays} 天 · 目前解鎖 Day {selected.availableDay}{' '}
            {selected.startDate ? `· 開始日期 ${new Date(selected.startDate).toLocaleDateString()}` : ''}
          </p>
          <p className="text-xs text-gray-500">
            在右側可快速指派接收者，底下則可編輯每日小卡內容。
          </p>
        </div>
        
        {/* 分享設定 */}
        <div className="glass-panel p-4 space-y-3 w-full">
          <h3 className="text-sm font-semibold text-gray-300">分享給接收者</h3>
          <textarea
            placeholder="輸入接收者 Email，用逗號分隔&#10;例：user1@example.com, user2@example.com"
            value={receiverEmails}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReceiverEmails(event.target.value)}
            className="w-full bg-white/5 rounded-xl px-3 py-2 min-h-[60px] text-sm border border-white/10 focus:border-aurora focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAssign}
            className="w-full py-2 bg-aurora/90 hover:bg-aurora rounded-xl text-slate-900 font-semibold transition-colors"
          >
            ✉️ 指派接收者
          </button>
          <div className="text-xs text-gray-400">
            <p>已分享給 {(selected.recipientIds || []).length} 位接收者</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr_420px] gap-6">
        {/* 左側：Day 列表 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 px-2">選擇編輯日期</h2>
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
            {Array.from({ length: totalDays }, (_, index) => {
              const day = index + 1;
              const card = (selected.dayCards || []).find((c) => c.day === day);
              return (
                <button
                  key={day}
                  onClick={() => handleDaySelect(day)}
                  className={`w-full text-left glass-panel p-4 rounded-xl transition-all ${
                    activeDay === day
                      ? 'border-2 border-aurora bg-aurora/10'
                      : 'border border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Day {day}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        card?.type === 'story'
                          ? 'bg-blue-500/20 text-blue-300'
                          : card?.type === 'qr'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {card?.type === 'story' ? 'CG' : card?.type === 'qr' ? 'QR' : '未設定'}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold truncate">
                    {card?.title || '尚未設定標題'}
                  </h3>
                  {card?.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{card.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 中間：編輯區 */}
        <div className="space-y-4">
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">編輯 Day {activeDay}</h2>
              <p className="text-xs text-gray-400">
                {selected.startDate
                  ? `釋出：${new Date(new Date(selected.startDate).getTime() + (activeDay - 1) * 86400000).toLocaleDateString()}`
                  : '未設定日期'}
              </p>
            </div>

            {/* 類型切換 */}
            <div className="flex gap-3">
              {['story', 'qr'].map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => handleTypeChange(mode as 'story' | 'qr')}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    dayCardDraft.type === mode
                      ? 'border-aurora bg-aurora text-slate-900'
                      : 'border-white/20 text-gray-300 hover:border-white/40'
                  }`}
                >
                  {mode === 'story' ? '📖 CG 對話劇情' : '🎁 QR 禮物卡片'}
                </button>
              ))}
            </div>

            {/* 基本資訊 */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">小卡標題</label>
                <input
                  type="text"
                  placeholder="例：Day 1 的故事開始"
                  value={dayCardDraft.title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setDayCardDraft({ ...dayCardDraft, title: event.target.value })
                  }
                  className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">小卡說明</label>
                <textarea
                  placeholder="簡短描述這一天的內容"
                  value={dayCardDraft.description}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setDayCardDraft({ ...dayCardDraft, description: event.target.value })
                  }
                  className="w-full bg-white/5 rounded-xl px-4 py-2.5 min-h-[80px] border border-white/10 focus:border-aurora focus:outline-none"
                />
              </div>
            </div>

            {/* CG 劇本編輯 */}
            {dayCardDraft.type === 'story' && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-300">CG JSON 劇本</h3>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-aurora hover:text-aurora/80"
                  >
                    {showPreview ? '隱藏預覽' : '顯示預覽'}
                  </button>
                </div>
                <textarea
                  value={cgScriptDraft}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setCgScriptDraft(event.target.value)}
                  className="w-full bg-black/40 font-mono text-xs rounded-xl px-4 py-3 min-h-[320px] border border-white/10 focus:border-aurora focus:outline-none"
                  placeholder="貼上或編輯 CG 劇本 JSON..."
                />
                <p className="text-xs text-gray-400">
                  支援封面、背景、對話與選項分支。修改後記得點擊下方「儲存小卡」按鈕。
                </p>
              </div>
            )}

            {/* QR 禮物編輯 */}
            {dayCardDraft.type === 'qr' && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h3 className="text-sm font-semibold text-gray-300">QR 禮物設定</h3>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">禮物名稱</label>
                  <input
                    type="text"
                    placeholder="例：星巴克咖啡券"
                    value={dayCardDraft.qrReward?.title || ''}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setDayCardDraft({
                        ...dayCardDraft,
                        qrReward: { ...dayCardDraft.qrReward, title: event.target.value },
                      })
                    }
                    className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">禮物訊息</label>
                  <textarea
                    placeholder="給接收者的祝福訊息"
                    value={dayCardDraft.qrReward?.message || ''}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setDayCardDraft({
                        ...dayCardDraft,
                        qrReward: { ...dayCardDraft.qrReward, message: event.target.value },
                      })
                    }
                    className="w-full bg-white/5 rounded-xl px-4 py-2.5 min-h-[80px] border border-white/10 focus:border-aurora focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">禮物圖片 URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/gift.jpg"
                    value={dayCardDraft.qrReward?.imageUrl || ''}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setDayCardDraft({
                        ...dayCardDraft,
                        qrReward: { ...dayCardDraft.qrReward, imageUrl: event.target.value },
                      })
                    }
                    className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">QR Code 內容（序號/連結）</label>
                  <input
                    type="text"
                    placeholder="例：https://gift.com/redeem/ABC123"
                    value={dayCardDraft.qrReward?.qrCode || ''}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setDayCardDraft({
                        ...dayCardDraft,
                        qrReward: { ...dayCardDraft.qrReward, qrCode: event.target.value },
                      })
                    }
                    className="w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 focus:border-aurora focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleDayCardSave}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-aurora to-purple-500 text-slate-900 font-bold hover:opacity-90 transition-opacity"
            >
              💾 儲存 Day {activeDay} 小卡
            </button>
          </div>
        </div>

        {/* 右側：小卡預覽 + CG 播放器 */}
        <div className="space-y-4">
          {/* 小卡預覽 */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-300">小卡預覽</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    dayCardDraft.type === 'story'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}
                >
                  {dayCardDraft.type === 'story' ? 'CG' : 'QR'}
                </span>
              </div>
            </div>
            
            {/* 模擬接收者看到的卡片 */}
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              {dayCardDraft.type === 'story' ? (
                <>
                  {cgPreview?.cover?.image || cgPreview?.scenes?.[0]?.background ? (
                    <img
                      src={cgPreview.cover?.image || cgPreview.scenes[0].background}
                      alt={`Day ${activeDay}`}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-gray-500 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                      尚未設定 CG 封面
                    </div>
                  )}
                  <div className="p-4 space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em]">Day {activeDay}</p>
                    <h4 className="text-base font-semibold">
                      {dayCardDraft.title || '尚未命名'}
                    </h4>
                    <p className="text-xs text-gray-300 min-h-[3rem] line-clamp-3">
                      {dayCardDraft.description || '預備中...'}
                    </p>
                  </div>
                </>
              ) : (
                <QrCardPreview
                  day={activeDay}
                  title={dayCardDraft.title}
                  description={dayCardDraft.description}
                  qrReward={dayCardDraft.qrReward}
                  variant="card"
                />
              )}
            </div>
          </div>

          {/* CG 播放器 */}
          {dayCardDraft.type === 'story' && (
            <div className="glass-panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">CG 播放預覽</h3>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-aurora/20 text-aurora hover:bg-aurora/30 transition-colors"
                >
                  {showPreview ? '收起' : '▶️ 播放'}
                </button>
              </div>
              {showPreview && (
                cgPreview ? (
                  <CgPlayer script={cgPreview} />
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-gray-400 bg-white/5 rounded-xl">
                    JSON 格式錯誤
                  </div>
                )
              )}
            </div>
          )}

          {/* QR 模態預覽 - 接收者視角 */}
          {dayCardDraft.type === 'qr' && (
            <div className="glass-panel p-0 overflow-hidden">
              <div className="bg-white/5 px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">接收者視角 · QR 預覽</h3>
                <span className="text-xs text-gray-400">Day {activeDay}</span>
              </div>
              <div className="p-5">
                <QrCardPreview
                  day={activeDay}
                  title={dayCardDraft.title}
                  description={dayCardDraft.description}
                  qrReward={dayCardDraft.qrReward}
                  variant="modal"
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

export default CreatorEditor;

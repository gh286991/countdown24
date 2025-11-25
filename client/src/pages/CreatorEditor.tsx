import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import CgPlayer from '../components/CgPlayer';
import DayTimeline from '../components/DayTimeline';
import sampleCgScript from '../data/sampleCgScript';
import { assignReceivers, fetchCountdownDetail, updateCountdown } from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';

const defaultQrReward = { title: '', message: '', imageUrl: '', qrCode: '' };
const emptyCard = { day: 1, title: '', description: '', coverImage: '', type: 'story', qrReward: { ...defaultQrReward } };
const emptyReward = { day: 1, availableOn: '', title: '', message: '', imageUrl: '', qrCode: '' };

function CreatorEditor() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { selected, detailStatus, assignments } = useSelector((state: RootState) => state.countdowns);
  const [receiverEmails, setReceiverEmails] = useState('');
  const [cgScriptDraft, setCgScriptDraft] = useState(JSON.stringify(sampleCgScript, null, 2));
  const [activeDay, setActiveDay] = useState(Number(searchParams.get('day')) || 1);
  const [dayCardDraft, setDayCardDraft] = useState({ ...emptyCard, day: Number(searchParams.get('day')) || 1 });
  const [rewardDraft, setRewardDraft] = useState({ ...emptyReward, day: Number(searchParams.get('day')) || 1 });
  const dayFromUrl = Number(searchParams.get('day')) || 1;

  useEffect(() => {
    if (id) {
      dispatch(fetchCountdownDetail(id));
    }
  }, [id, dispatch]);

useEffect(() => {
  setActiveDay(dayFromUrl);
  setRewardDraft((prev) => ({ ...prev, day: dayFromUrl }));
}, [dayFromUrl]);

  const handleAssign = () => {
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

  useEffect(() => {
    setRewardDraft((prev) => ({ ...prev, day: activeDay }));
  }, [activeDay]);

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

  const handleAddReward = () => {
    if (!rewardDraft.title.trim()) {
      alert('請輸入禮物名稱');
      return;
    }
    const normalizedDay = Math.min(totalDays, Math.max(1, Number(rewardDraft.day) || 1));
    const availableOnIso = rewardDraft.availableOn
      ? new Date(rewardDraft.availableOn).toISOString()
      : null;
    const nextReward = {
      day: normalizedDay,
      title: rewardDraft.title,
      message: rewardDraft.message,
      imageUrl: rewardDraft.imageUrl,
      qrCode: rewardDraft.qrCode,
      availableOn: availableOnIso,
    };
    const existingRewards = selected.qrRewards || [];
    const filtered = existingRewards.filter((reward) => reward.day !== normalizedDay);
    dispatch(updateCountdown({ id, data: { qrRewards: [...filtered, nextReward] } }));
    setRewardDraft({ ...emptyReward, day: normalizedDay });
  };

  return (
    <section className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <img src={selected.coverImage} alt={selected.title} className="w-full h-80 object-cover rounded-3xl" />
          <DayTimeline total={selected.totalDays} current={selected.availableDay} />
          {dayCardDraft.type === 'story' ? (
            cgPreview ? (
              <CgPlayer script={cgPreview} />
            ) : (
              <div className="glass-panel text-sm text-gray-400">尚未設定 CG JSON。</div>
            )
          ) : dayCardDraft.qrReward?.title || dayCardDraft.qrReward?.message ? (
            <div className="glass-panel space-y-3">
              {dayCardDraft.qrReward.imageUrl ? (
                <img src={dayCardDraft.qrReward.imageUrl} alt={dayCardDraft.qrReward.title} className="w-full h-64 object-cover rounded-2xl" />
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-gray-500 bg-white/10 rounded-2xl">尚未設定圖片</div>
              )}
              <div>
                <h4 className="text-lg font-semibold">{dayCardDraft.qrReward.title || '未命名禮物'}</h4>
                <p className="text-sm text-gray-300">{dayCardDraft.qrReward.message || '尚未填寫訊息'}</p>
                <p className="text-xs text-gray-400 mt-1">QR 內容：{dayCardDraft.qrReward.qrCode || '尚未設定'}</p>
                {dayCardDraft.qrReward.qrCode && (
                  <div className="mt-4 flex justify-center">
                    <QRCodeSVG
                      value={dayCardDraft.qrReward.qrCode}
                      size={192}
                      bgColor="transparent"
                      fgColor="#f8fafc"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel text-sm text-gray-400">尚未設定 QR 禮物內容。</div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-panel flex flex-col gap-3">
            <div>
              <p className="text-xs text-gray-400">目前編輯</p>
              <h3 className="text-2xl font-semibold">Day {activeDay}</h3>
              <p className="text-xs text-gray-500">
                {selected.startDate
                  ? `預計釋出：${new Date(selected.startDate).toLocaleDateString()} 起第 ${activeDay} 天`
                  : '未設定開始日期'}
              </p>
            </div>
            <select
              value={activeDay}
              onChange={(event) => handleDaySelect(Number(event.target.value))}
              className="bg-white/5 rounded-xl px-3 py-2"
            >
              {Array.from({ length: totalDays }, (_, index) => index + 1).map((day) => (
                <option key={`day-option-${day}`} value={day}>
                  Day {day}
                </option>
              ))}
            </select>
          </div>

      <div className="glass-panel space-y-3">
        <p className="text-sm text-gray-400">倒數內容類型</p>
        <div className="flex gap-3">
          {['story', 'qr'].map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => handleTypeChange(mode)}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm ${dayCardDraft.type === mode ? 'border-aurora text-aurora' : 'border-white/10 text-gray-300'}`}
            >
              {mode === 'story' ? 'CG 對話' : 'QR 禮物'}
            </button>
          ))}
        </div>
      </div>

          <div className="glass-panel space-y-3">
            <h3 className="text-lg font-semibold">Day {activeDay} 小卡資訊</h3>
            <input
              type="text"
              placeholder="小卡標題"
              value={dayCardDraft.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDayCardDraft({ ...dayCardDraft, title: event.target.value })}
              className="w-full bg-white/5 rounded-xl px-3 py-2"
            />
            <textarea
              placeholder="說明"
              value={dayCardDraft.description}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDayCardDraft({ ...dayCardDraft, description: event.target.value })}
              className="w-full bg-white/5 rounded-xl px-3 py-2 min-h-[80px]"
            />
            <input
              type="url"
              placeholder="封面圖片 URL"
              value={dayCardDraft.coverImage}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDayCardDraft({ ...dayCardDraft, coverImage: event.target.value })}
              className="w-full bg-white/5 rounded-xl px-3 py-2"
            />
            <button
              type="button"
              onClick={handleDayCardSave}
              className="w-full py-2 rounded-full bg-white/10 text-sm"
            >
              儲存小卡
            </button>
          </div>

          {dayCardDraft.type === 'story' ? (
            <div className="glass-panel space-y-3">
              <h3 className="text-lg font-semibold">CG JSON 劇本</h3>
              <textarea
                value={cgScriptDraft}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setCgScriptDraft(event.target.value)}
                className="w-full bg-black/40 font-mono text-sm rounded-xl px-3 py-3 min-h-[260px] border border-white/10"
              />
              <p className="text-xs text-gray-400">
                封面、背景、對話與選項都能用 JSON 編輯；點擊下方按鈕後才會儲存到伺服器。
              </p>
            </div>
          ) : (
            <div className="glass-panel space-y-3">
              <h3 className="text-lg font-semibold">新增 QR 禮物</h3>
              <input
                type="number"
                min={1}
                max={selected.totalDays || 60}
                value={rewardDraft.day}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setRewardDraft({ ...rewardDraft, day: Number(event.target.value) })}
                className="w-full bg-white/5 rounded-xl px-3 py-2"
                placeholder="第幾天"
              />
              <input
                type="date"
                value={rewardDraft.availableOn}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setRewardDraft({ ...rewardDraft, availableOn: event.target.value })}
                className="w-full bg-white/5 rounded-xl px-3 py-2"
              />
              <input
                type="text"
                placeholder="禮物名稱"
                value={rewardDraft.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setRewardDraft({ ...rewardDraft, title: event.target.value })}
                className="w-full bg-white/5 rounded-xl px-3 py-2"
              />
              <input
                type="text"
                placeholder="訊息"
                value={rewardDraft.message}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setRewardDraft({ ...rewardDraft, message: event.target.value })}
                className="w-full bg-white/5 rounded-xl px-3 py-2"
              />
              <input
                type="url"
                placeholder="圖片 URL"
                value={rewardDraft.imageUrl}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setRewardDraft({ ...rewardDraft, imageUrl: event.target.value })}
                className="w-full bg-white/5 rounded-xl px-3 py-2"
              />
              <input
                type="text"
                placeholder="QR 內容 / 序號"
                value={rewardDraft.qrCode}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setRewardDraft({ ...rewardDraft, qrCode: event.target.value })}
                className="w-full bg-white/5 rounded-xl px-3 py-2"
              />
              <button type="button" onClick={handleAddReward} className="w-full py-2 bg-white/10 rounded-xl">
                加到禮物列表
              </button>
              <p className="text-xs text-gray-400">已設定禮物：{selected.qrRewards?.length || 0} 個</p>
            </div>
          )}

          <div className="glass-panel space-y-2">
            <h3 className="text-lg font-semibold">分享給接收者</h3>
            <textarea
              placeholder="輸入接收者 Email，逗號分隔"
              value={receiverEmails}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReceiverEmails(event.target.value)}
              className="w-full bg-white/5 rounded-xl px-3 py-2"
            />
            <button type="button" onClick={handleAssign} className="w-full py-2 bg-aurora/80 rounded-xl text-slate-900 font-semibold">
              指派接收者
            </button>
            <div className="text-xs text-gray-400">
              已分享：{(selected.recipientIds || []).length} 人
            </div>
            {assignments?.length > 0 && (
              <ul className="text-xs text-gray-400 space-y-1">
                {assignments.map((assignment) => (
                  <li key={assignment.id} className="flex items-center justify-between">
                    <span>{assignment.receiverId}</span>
                    <span>{assignment.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CreatorEditor;

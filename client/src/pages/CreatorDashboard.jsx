import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CountdownCard from '../components/CountdownCard';
import sampleCgScript from '../data/sampleCgScript';
import { createCountdown, deleteCountdown, fetchCreatorCountdowns } from '../store/countdownSlice';

const emptyReward = { day: 1, title: '', message: '', imageUrl: '', qrCode: '' };

function CreatorDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status } = useSelector((state) => state.countdowns);
  const { user } = useSelector((state) => state.auth);
  const [type, setType] = useState('story');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardDraft, setRewardDraft] = useState(emptyReward);
  const [rewards, setRewards] = useState([]);
  const [recipientEmails, setRecipientEmails] = useState('');
  const [cgScriptDraft, setCgScriptDraft] = useState(JSON.stringify(sampleCgScript, null, 2));

  useEffect(() => {
    if (user?.role === 'creator') {
      dispatch(fetchCreatorCountdowns());
    }
  }, [dispatch, user]);

  const handleCreate = async (event) => {
    event.preventDefault();
    let parsedScript = null;
    if (type === 'story' && cgScriptDraft.trim()) {
      try {
        parsedScript = JSON.parse(cgScriptDraft);
      } catch (error) {
        alert('CG JSON 格式錯誤，請確認內容是否為有效的 JSON。');
        return;
      }
    }
    const payload = {
      title,
      type,
      description,
      storyMoments: [],
      qrRewards: rewards,
      cgScript: parsedScript,
      recipientEmails: recipientEmails
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean),
    };
    try {
      const result = await dispatch(createCountdown(payload)).unwrap();
      setTitle('');
      setDescription('');
      setRewards([]);
      setCgScriptDraft(JSON.stringify(sampleCgScript, null, 2));
      setRecipientEmails('');
      navigate(`/creator/countdowns/${result.id}`);
    } catch (error) {
      console.error(error);
    }
  };

  const addReward = () => {
    setRewards((prev) => [...prev, rewardDraft]);
    setRewardDraft(emptyReward);
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
            <button
              type="button"
              onClick={() => dispatch(fetchCreatorCountdowns())}
              className="text-sm text-aurora"
            >
              重新整理
            </button>
          </div>

          {status === 'loading' && <p className="text-gray-400">載入中...</p>}
          <div className="countdown-grid">
            {items.map((item) => (
              <CountdownCard
                key={item.id}
                item={item}
                onSelect={(selected) => navigate(`/creator/countdowns/${selected.id}`)}
                onDelete={handleDeleteCountdown}
              />
            ))}
          </div>
        </div>

        <div className="lg:w-1/3 glass-panel space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400">建立新倒數</p>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="flex gap-3">
              {['story', 'qr'].map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={`flex-1 py-2 rounded-xl border ${type === mode ? 'border-aurora text-aurora' : 'border-white/10 text-gray-300'}`}
                  onClick={() => setType(mode)}
                >
                  {mode === 'story' ? 'CG 對話' : 'QR 禮物'}
                </button>
              ))}
            </div>
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
            <textarea
              placeholder="接收者 Email（以逗號分隔）"
              className="w-full bg-white/5 rounded-xl px-3 py-2"
              value={recipientEmails}
              onChange={(event) => setRecipientEmails(event.target.value)}
            />

            {type === 'story' ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">CG JSON 劇本</p>
                <textarea
                  value={cgScriptDraft}
                  onChange={(event) => setCgScriptDraft(event.target.value)}
                  className="w-full bg-black/40 font-mono text-xs rounded-xl px-3 py-3 min-h-[220px] border border-white/10"
                />
                <p className="text-xs text-gray-400">
                  封面、背景、對話與選項都透過 JSON 設定；上方已提供範例，可直接貼上修改。
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">新增 QR 禮物</p>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={rewardDraft.day}
                  onChange={(event) => setRewardDraft({ ...rewardDraft, day: Number(event.target.value) })}
                  className="w-full bg-white/5 rounded-xl px-3 py-2"
                  placeholder="Day"
                />
                <input
                  type="text"
                  value={rewardDraft.title}
                  onChange={(event) => setRewardDraft({ ...rewardDraft, title: event.target.value })}
                  className="w-full bg-white/5 rounded-xl px-3 py-2"
                  placeholder="禮物名稱"
                />
                <input
                  type="text"
                  value={rewardDraft.message}
                  onChange={(event) => setRewardDraft({ ...rewardDraft, message: event.target.value })}
                  className="w-full bg-white/5 rounded-xl px-3 py-2"
                  placeholder="訊息"
                />
                <input
                  type="url"
                  value={rewardDraft.imageUrl}
                  onChange={(event) => setRewardDraft({ ...rewardDraft, imageUrl: event.target.value })}
                  className="w-full bg-white/5 rounded-xl px-3 py-2"
                  placeholder="圖片 URL"
                />
                <input
                  type="text"
                  value={rewardDraft.qrCode}
                  onChange={(event) => setRewardDraft({ ...rewardDraft, qrCode: event.target.value })}
                  className="w-full bg-white/5 rounded-xl px-3 py-2"
                  placeholder="QR 內容，例如序號"
                />
                <button type="button" onClick={addReward} className="w-full py-2 rounded-xl bg-white/10">
                  加到禮物庫
                </button>
                <div className="text-xs text-gray-400">目前禮物：{rewards.length}</div>
              </div>
            )}

            <button type="submit" className="w-full py-3 rounded-full bg-gradient-to-r from-aurora to-blush text-slate-900 font-semibold">
              建立倒數
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default CreatorDashboard;

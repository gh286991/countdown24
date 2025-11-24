import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import CgPlayer from '../components/CgPlayer';
import DayTimeline from '../components/DayTimeline';
import RewardGrid from '../components/RewardGrid';
import StoryMoments from '../components/StoryMoments';
import sampleCgScript from '../data/sampleCgScript';
import { assignReceivers, fetchCountdownDetail, updateCountdown } from '../store/countdownSlice';

function CreatorEditor() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { selected, detailStatus, assignments } = useSelector((state) => state.countdowns);
  const [receiverEmails, setReceiverEmails] = useState('');
  const [cgScriptDraft, setCgScriptDraft] = useState(JSON.stringify(sampleCgScript, null, 2));

  useEffect(() => {
    if (id) {
      dispatch(fetchCountdownDetail(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (selected) {
      setCgScriptDraft(
        selected.cgScript ? JSON.stringify(selected.cgScript, null, 2) : JSON.stringify(sampleCgScript, null, 2),
      );
    }
  }, [selected]);

  const handleSaveScript = () => {
    let parsedScript = null;
    if (cgScriptDraft.trim()) {
      try {
        parsedScript = JSON.parse(cgScriptDraft);
      } catch (error) {
        alert('CG JSON 格式錯誤，請檢查括號或逗號。');
        return;
      }
    }
    dispatch(updateCountdown({ id, data: { cgScript: parsedScript } }));
  };

  const handleAssign = () => {
    const receiverList = receiverEmails
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
    if (!receiverList.length) return;
    dispatch(assignReceivers({ id, receiverEmails: receiverList }));
    setReceiverEmails('');
  };

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

  return (
    <section className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <img src={selected.coverImage} alt={selected.title} className="w-full h-80 object-cover rounded-3xl" />
          <DayTimeline total={selected.totalDays} current={selected.availableDay} />
          {selected.type === 'story' ? (
            cgPreview ? (
              <CgPlayer script={cgPreview} />
            ) : (
              <StoryMoments moments={selected.storyMoments || []} />
            )
          ) : (
            <RewardGrid rewards={selected.qrRewards || []} />
          )}
        </div>

        <div className="space-y-6">
          {selected.type === 'story' ? (
            <div className="glass-panel space-y-3">
              <h3 className="text-lg font-semibold">CG JSON 劇本</h3>
              <textarea
                value={cgScriptDraft}
                onChange={(event) => setCgScriptDraft(event.target.value)}
                className="w-full bg-black/40 font-mono text-sm rounded-xl px-3 py-3 min-h-[260px] border border-white/10"
              />
              <p className="text-xs text-gray-400">
                封面、背景、對話與選項都能用 JSON 編輯；點擊下方按鈕後才會儲存到伺服器。
              </p>
              <button
                type="button"
                onClick={handleSaveScript}
                className="w-full py-2 rounded-full bg-gradient-to-r from-aurora to-blush text-slate-900 font-semibold"
              >
                儲存 CG JSON
              </button>
            </div>
          ) : (
            <div className="glass-panel text-sm text-gray-400">
              目前僅支援以 JSON 編輯 CG 倒數，QR 禮物請改在建立時設定。
            </div>
          )}

          <div className="glass-panel space-y-2">
            <h3 className="text-lg font-semibold">分享給接收者</h3>
            <textarea
              placeholder="輸入接收者 Email，逗號分隔"
              value={receiverEmails}
              onChange={(event) => setReceiverEmails(event.target.value)}
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

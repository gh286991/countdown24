import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import DayListSidebar from '../components/DayListSidebar';
import DayCardEditor from '../components/DayCardEditor';
import DayCardPreviewPanel from '../components/DayCardPreviewPanel';
import ReceiversModal from '../components/ReceiversModal';
import sampleCgScript from '../data/sampleCgScript';
import { assignReceivers, fetchCountdownDetail, updateCountdown } from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';

const defaultQrReward = { title: '', message: '', imageUrl: '', qrCode: '' };
const emptyCard = { day: 1, title: '', description: '', coverImage: '', type: 'story' as 'story' | 'qr', qrReward: { ...defaultQrReward } };

function CreatorEditor() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { selected, detailStatus } = useSelector((state: RootState) => state.countdowns);
  const [receiverEmails, setReceiverEmails] = useState('');
  const [cgScriptDraft, setCgScriptDraft] = useState(JSON.stringify(sampleCgScript, null, 2));
  const [activeDay, setActiveDay] = useState(Number(searchParams.get('day')) || 1);
  const [dayCardDraft, setDayCardDraft] = useState({ ...emptyCard, day: Number(searchParams.get('day')) || 1 });
  const [showReceiversModal, setShowReceiversModal] = useState(false);
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

  const handleFieldChange = (field: string, value: any) => {
    setDayCardDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <section className="max-w-[1800px] mx-auto py-6 px-6">
      {/* 頂部：專案資訊 + 分享設定 */}
      <ProjectHeader
        title={selected.title}
        totalDays={selected.totalDays || 24}
        availableDay={selected.availableDay || 0}
        startDate={selected.startDate}
        recipientCount={(selected.recipientIds || []).length}
        receiverEmails={receiverEmails}
        onReceiverEmailsChange={setReceiverEmails}
        onAssign={handleAssign}
        onViewReceivers={() => setShowReceiversModal(true)}
      />

      {/* 接收者管理 Modal */}
      {id && (
        <ReceiversModal
          countdownId={id}
          isOpen={showReceiversModal}
          onClose={() => setShowReceiversModal(false)}
        />
      )}

      <div className="grid lg:grid-cols-[280px_1fr_420px] gap-6">
        {/* 左側：Day 列表 */}
        <DayListSidebar
          totalDays={totalDays}
          activeDay={activeDay}
          dayCards={selected.dayCards || []}
          onDaySelect={handleDaySelect}
        />

        {/* 中間：編輯區 */}
        <div className="space-y-4">
          <DayCardEditor
            activeDay={activeDay}
            startDate={selected.startDate}
            dayCardDraft={dayCardDraft}
            cgScriptDraft={cgScriptDraft}
            onTypeChange={handleTypeChange}
            onFieldChange={handleFieldChange}
            onCgScriptChange={setCgScriptDraft}
            onSave={handleDayCardSave}
          />
        </div>

        {/* 右側：預覽區 */}
        <DayCardPreviewPanel
          activeDay={activeDay}
          type={dayCardDraft.type as 'story' | 'qr'}
          title={dayCardDraft.title}
          description={dayCardDraft.description}
          qrReward={dayCardDraft.qrReward}
          cgPreview={cgPreview}
        />
      </div>
    </section>
  );
}

export default CreatorEditor;

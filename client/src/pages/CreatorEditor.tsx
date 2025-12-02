import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import DayListSidebar from '../components/DayListSidebar';
import DayCardEditor from '../components/DayCardEditor';
import DayCardPreviewPanel from '../components/DayCardPreviewPanel';
import DayQrCodeGenerator from '../components/DayQrCodeGenerator';
import ReceiversModal from '../components/ReceiversModal';
import PrintCardPanel from '../components/PrintCardPanel';
import PrintCardEditorModal from '../components/PrintCardEditorModal';
import CuteLoadingSpinner from '../components/CuteLoadingSpinner';
import { useToast } from '../components/ToastProvider';
import sampleCgScript from '../data/sampleCgScript';
import {
  assignReceivers,
  createInvitation,
  deleteVoucherCard,
  deletePrintCard,
  fetchCountdownDetail,
  fetchCountdownDay,
  savePrintCard,
  saveVoucherCard,
  updateCountdown,
} from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';

const defaultQrReward = { title: '', message: '', imageUrl: '', qrCode: '' };
const defaultVoucherDetail = { title: '', message: '', location: '', terms: '', validUntil: '' };
const emptyCard = {
  day: 1,
  title: '',
  description: '',
  coverImage: '',
  type: 'story' as 'story' | 'qr' | 'voucher',
  qrReward: { ...defaultQrReward },
  voucherDetail: { ...defaultVoucherDetail },
};

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
  const [showPrintCardModal, setShowPrintCardModal] = useState(false);
  const [isSavingPrintCard, setIsSavingPrintCard] = useState(false);
  const dayFromUrl = Number(searchParams.get('day')) || 1;
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      // Pass activeDay (from URL or default 1) to fetch initial content
      dispatch(fetchCountdownDetail({ id, day: dayFromUrl }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dispatch]);

  useEffect(() => {
    setActiveDay(dayFromUrl);
  }, [dayFromUrl]);

  // Lazy load day content
  useEffect(() => {
    if (id && selected) {
      const card = (selected.dayCards || []).find((c) => c.day === activeDay);
      // 如果沒有 _loaded 標記，表示還沒載入過詳細內容（包含 cgScript）
      if (card && !card._loaded) {
        dispatch(fetchCountdownDay({ id, day: activeDay }));
      }
    }
  }, [id, activeDay, selected, dispatch]);

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

  const handleGenerateInvite = async () => {
    if (!id) throw new Error('No countdown ID');
    const result = await dispatch(createInvitation(id)).unwrap();
    return result;
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
      voucherDetail: { ...defaultVoucherDetail, ...(currentDayCard.voucherDetail || {}) },
    };
    setDayCardDraft(normalized);
    setCgScriptDraft(
      normalized.cgScript
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

  const currentPrintCard = useMemo(() => {
    if (!selected?.printCards) return undefined;
    return selected.printCards.find((card) => card.day === activeDay);
  }, [selected?.printCards, activeDay]);

  const currentVoucherCard = useMemo(() => {
    if (!selected?.voucherCards) return undefined;
    return selected.voucherCards.find((card) => card.day === activeDay);
  }, [selected?.voucherCards, activeDay]);

  if (detailStatus === 'loading' || !selected) {
    return <CuteLoadingSpinner label="載入倒數內容..." />;
  }

  const handleDaySelect = (value: number) => {
    setActiveDay(value);
    setSearchParams({ day: String(value) });
  };

  const handleDayCardSave = async () => {
    if (!id) return;
    let parsedScript = null;
    // 嘗試解析 CG Script，無論類型為何
    if (cgScriptDraft.trim()) {
      try {
        parsedScript = JSON.parse(cgScriptDraft);
      } catch (error) {
        // 如果是 story 類型，則必須解析成功；如果是其他類型但有內容，也提示錯誤
        if (dayCardDraft.type === 'story' || cgScriptDraft.length > 10) {
          showToast('CG JSON 格式錯誤，請檢查括號或逗號。', 'error');
          return;
        }
      }
    }

    if (dayCardDraft.type === 'story' && !parsedScript) {
      showToast('請輸入 CG JSON', 'warning');
      return;
    }

    const nextType = dayCardDraft.type === 'qr' ? 'qr' : dayCardDraft.type === 'voucher' ? 'voucher' : 'story';
    const normalizedCard = {
      ...dayCardDraft,
      day: activeDay,
      type: nextType,
      cgScript: parsedScript,
      qrReward:
        nextType === 'qr'
          ? { ...defaultQrReward, ...(dayCardDraft.qrReward || {}) }
          : null,
      voucherDetail:
        nextType === 'voucher'
          ? { ...defaultVoucherDetail, ...(dayCardDraft.voucherDetail || {}) }
          : null,
    };

    const existing = selected.dayCards || [];
    const map = new Map(existing.map((card) => [card.day, card]));
    map.set(normalizedCard.day, normalizedCard);
    const nextCards = Array.from({ length: totalDays }).map((_, index) => {
      const day = index + 1;
      return map.get(day) || { ...emptyCard, day };
    });
    try {
      await dispatch(updateCountdown({ id, data: { dayCards: nextCards } })).unwrap();
      // 如果有 parsedScript，也更新它（雖然上面已經包含在 dayCards 裡了，但為了保險起見或者特定邏輯）
      // 注意：這裡原本的邏輯似乎是分開更新的？其實 updateCountdown 應該一次處理完
      // 我們保留原本的行為，但擴展到所有類型
      if (parsedScript) {
        await dispatch(updateCountdown({ id, data: { cgScript: parsedScript } })).unwrap();
      }
      showToast(`已儲存 Day ${activeDay} 設定`, 'success');
    } catch (error: any) {
      console.error('Failed to save day card', error);
      showToast(error?.message || '儲存失敗，請稍後再試', 'error');
    }
  };

  const handleTypeChange = (mode: 'story' | 'qr' | 'voucher') => {
    setDayCardDraft((prev) => ({
      ...prev,
      type: mode,
      qrReward: mode === 'qr' ? { ...defaultQrReward, ...(prev.qrReward || {}) } : prev.qrReward,
      voucherDetail: mode === 'voucher' ? { ...defaultVoucherDetail, ...(prev.voucherDetail || {}) } : prev.voucherDetail,
    }));
  };

  const handleFieldChange = (field: string, value: any) => {
    setDayCardDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrintCardSave = async (data: any) => {
    if (!id || isSavingPrintCard) return;
    try {
      setIsSavingPrintCard(true);
      await dispatch(savePrintCard({ countdownId: id, day: activeDay, card: data })).unwrap();
      showToast('列印小卡已儲存', 'success');
      setShowPrintCardModal(false);
    } catch (error: any) {
      console.error('Failed to save print card', error);
      showToast(error?.message || '儲存列印小卡失敗，請稍後再試', 'error');
    } finally {
      setIsSavingPrintCard(false);
    }
  };

  const handlePrintCardDelete = () => {
    if (!id) return;
    dispatch(deletePrintCard({ countdownId: id, day: activeDay }));
    setShowPrintCardModal(false);
  };

  const handleVoucherCardSave = (data: any) => {
    if (!id) return;
    dispatch(saveVoucherCard({ countdownId: id, day: activeDay, card: data }));
  };

  const handleVoucherCardDelete = () => {
    if (!id) return;
    dispatch(deleteVoucherCard({ countdownId: id, day: activeDay }));
  };

  return (
    <>
      <section className="max-w-[1800px] mx-auto py-6 px-6 relative z-10">
        {/* 頂部：專案資訊 + 分享設定 */}
        <ProjectHeader
          title={selected.title}
          description={selected.description}
          coverImage={selected.coverImage}
          totalDays={selected.totalDays || 24}
          availableDay={selected.availableDay || 0}
          startDate={selected.startDate}
          recipientCount={(selected.recipientIds || []).length}
          receiverEmails={receiverEmails}
          onReceiverEmailsChange={setReceiverEmails}
          onAssign={handleAssign}
          onViewReceivers={() => setShowReceiversModal(true)}
          onGenerateInvite={handleGenerateInvite}
          onUpdateProject={(data) => {
            if (id) {
              dispatch(updateCountdown({ id, data }));
            }
          }}
          countdownId={id || ''}
          extraPanel={
            <DayQrCodeGenerator
              activeDay={activeDay}
              countdownId={id || ''}
            />
          }
        />

        {/* 接收者管理 Modal */}
        {id && (
          <ReceiversModal
            countdownId={id}
            isOpen={showReceiversModal}
            onClose={() => setShowReceiversModal(false)}
          />
        )}

        <div className="grid lg:grid-cols-[280px_1fr_420px] gap-6 relative z-10">
          {/* 左側：Day 列表 + 封面圖 + 禮品卡 */}
          <div className="space-y-4">
            <DayListSidebar
              totalDays={totalDays}
              activeDay={activeDay}
              dayCards={selected.dayCards || []}
              onDaySelect={handleDaySelect}
            />
          </div>

          {/* 中間：編輯區 */}
          <div className="space-y-4 relative z-10">
            <DayCardEditor
              activeDay={activeDay}
              startDate={selected.startDate}
              dayCardDraft={dayCardDraft}
              cgScriptDraft={cgScriptDraft}
              countdownId={id || ''}
              onTypeChange={handleTypeChange}
              onFieldChange={handleFieldChange}
              onCgScriptChange={setCgScriptDraft}
              onSave={handleDayCardSave}
              voucherCard={currentVoucherCard}
              onVoucherSave={handleVoucherCardSave}
              onVoucherDelete={handleVoucherCardDelete}
            />
          </div>

          {/* 右側：預覽 + 列印小卡 */}
          <div className="space-y-4">
            <DayCardPreviewPanel
              activeDay={activeDay}
              type={dayCardDraft.type as 'story' | 'qr' | 'voucher'}
              title={dayCardDraft.title}
              description={dayCardDraft.description}
              coverImage={dayCardDraft.coverImage}
              qrReward={dayCardDraft.qrReward}
              cgPreview={cgPreview}
              voucherDetail={dayCardDraft.voucherDetail}
              voucherCard={currentVoucherCard}
            />
            <PrintCardPanel
              day={activeDay}
              countdownId={id || ''}
              card={currentPrintCard}
              onEdit={() => setShowPrintCardModal(true)}
            />
          </div>
        </div>
      </section>

      <PrintCardEditorModal
        countdownId={id || ''}
        day={activeDay}
        isOpen={showPrintCardModal}
        card={currentPrintCard}
        onSave={handlePrintCardSave}
        onDelete={handlePrintCardDelete}
        onClose={() => {
          if (!isSavingPrintCard) {
            setShowPrintCardModal(false);
          }
        }}
        isSaving={isSavingPrintCard}
      />
    </>
  );
}

export default CreatorEditor;

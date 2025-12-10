import { useEffect, useMemo, useState, useRef } from 'react';
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
  fetchPrintCard,
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
  const [mobileSection, setMobileSection] = useState<'days' | 'edit' | 'preview'>('edit');
  const [showReceiversModal, setShowReceiversModal] = useState(false);
  const [showPrintCardModal, setShowPrintCardModal] = useState(false);
  const [isSavingPrintCard, setIsSavingPrintCard] = useState(false);
  const fetchedPrintCardDays = useRef<Set<string>>(new Set());
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

  useEffect(() => {
    // 切換倒數時重置已載入的列印卡片記錄
    fetchedPrintCardDays.current.clear();
  }, [id]);

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

  // Lazy load print card when opening editor
  useEffect(() => {
    if (!showPrintCardModal || !id) return;
    const key = `${id}-${activeDay}`;
    if (fetchedPrintCardDays.current.has(key)) return;
    fetchedPrintCardDays.current.add(key);
    dispatch(fetchPrintCard({ countdownId: id, day: activeDay }));
  }, [dispatch, showPrintCardModal, id, activeDay]);

  // Prefetch print card for preview if configured but missing preview image
  useEffect(() => {
    if (!id || !selected) return;
    const key = `${id}-${activeDay}`;
    const card = (selected.printCards || []).find((item) => item.day === activeDay);
    const needsFetch = !card || (card.isConfigured && !card.previewImage);
    if (!needsFetch) return;
    if (fetchedPrintCardDays.current.has(key)) return;
    fetchedPrintCardDays.current.add(key);
    dispatch(fetchPrintCard({ countdownId: id, day: activeDay }));
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

    try {
      // 只送出本次編輯的單一天卡，避免覆寫其他天的資料
      await dispatch(updateCountdown({ id, data: { dayCards: [normalizedCard] } })).unwrap();
      // 如果有 parsedScript，也更新它（與 dayCards 分開傳輸）
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

        <div className="lg:hidden mb-4 sticky top-0 z-20 -mx-6 px-6 pt-4 pb-2 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950/80 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'days', label: '日期列表' },
              { key: 'edit', label: '內容編輯' },
              { key: 'preview', label: '預覽 / 列印' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMobileSection(item.key as 'days' | 'edit' | 'preview')}
                className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  mobileSection === item.key
                    ? 'border-aurora bg-white text-slate-900'
                    : 'border-white/20 text-white/80 hover:border-white/40'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr_420px] gap-6 relative z-10">
          {/* 左側：Day 列表 + 封面圖 + 禮品卡 */}
          <div
            className={`${mobileSection === 'days' ? 'block' : 'hidden'} space-y-4 lg:block`}
          >
            <div className="max-h-[60vh] overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible">
              <DayListSidebar
                totalDays={totalDays}
                activeDay={activeDay}
                dayCards={selected.dayCards || []}
                onDaySelect={handleDaySelect}
              />
            </div>
          </div>

          {/* 中間：編輯區 */}
          <div
            className={`${mobileSection === 'edit' ? 'space-y-4' : 'hidden'} relative z-10 lg:space-y-4 lg:block`}
          >
            <DayCardEditor
              activeDay={activeDay}
              startDate={selected.startDate}
              dayCardDraft={dayCardDraft}
              cgScriptDraft={cgScriptDraft}
              countdownId={id || ''}
              totalDays={totalDays}
              onTypeChange={handleTypeChange}
              onFieldChange={handleFieldChange}
              onCgScriptChange={setCgScriptDraft}
              onSave={handleDayCardSave}
              onDayChange={handleDaySelect}
              onBackToDays={() => setMobileSection('days')}
              voucherCard={currentVoucherCard}
              onVoucherSave={handleVoucherCardSave}
              onVoucherDelete={handleVoucherCardDelete}
            />
          </div>

          {/* 右側：預覽 + 列印小卡 */}
          <div
            className={`${mobileSection === 'preview' ? 'space-y-4' : 'hidden'} lg:space-y-4 lg:block`}
          >
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

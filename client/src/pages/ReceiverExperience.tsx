import { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { HiOutlineXMark, HiOutlineLockClosed, HiOutlineQrCode, HiOutlineCamera } from 'react-icons/hi2';
import { Html5Qrcode } from 'html5-qrcode';
import DayTimeline from '../components/DayTimeline';
import CgPlayer from '../components/CgPlayer';
import QrCardPreview from '../components/QrCardPreview';
import { useToast } from '../components/ToastProvider';
import { clearDayContent, fetchReceiverDayContent, fetchReceiverExperience, unlockDayWithQr } from '../store/receiverSlice';
import type { RootState, AppDispatch } from '../store';

function ReceiverExperience() {
  const { assignmentId } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { selected, experienceStatus, dayStatus, dayContent } = useSelector((state: RootState) => state.receiver);
  const { showToast } = useToast();

  useEffect(() => {
    if (assignmentId) {
      dispatch(fetchReceiverExperience(assignmentId));
    }
  }, [assignmentId, dispatch]);

  // 所有 Hooks 必須在條件返回之前調用
  const countdown = selected?.countdown || null;
  const creator = selected?.creator || null;
  
  const assignment = selected?.assignment || null;
  const unlockedDays = assignment?.unlockedDays || [];
  
  const cards = useMemo(
    () => {
      if (!countdown) return [];
      return (countdown.dayCards || []).map((card: any) => ({
        ...card,
        locked: !unlockedDays.includes(card.day),
      }));
    },
    [countdown, unlockedDays],
  );
  
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modalDay) {
      dispatch(clearDayContent());
      return;
    }
    if (assignmentId) {
      dispatch(fetchReceiverDayContent({ assignmentId, day: modalDay }));
    }
  }, [modalDay, assignmentId, dispatch]);

  const currentDayContent = modalDay && dayContent?.day === modalDay ? dayContent : null;
  const modalLoading = modalDay && dayStatus === 'loading' && !currentDayContent;

  // 停止相機的輔助函數
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        // 忽略停止錯誤
      }
      try {
        html5QrCodeRef.current.clear();
      } catch (error) {
        // 忽略清理錯誤
      }
      html5QrCodeRef.current = null;
    }
  };

  const handleUnlockDay = async (qrData: string) => {
    if (!assignmentId || !qrData || unlocking) return;
    
    // 如果掃描到的是完整 URL，提取 token
    let qrToken = qrData.trim();
    if (qrToken.includes('/scan/')) {
      const urlParts = qrToken.split('/scan/');
      if (urlParts.length > 1) {
        qrToken = urlParts[1].split('?')[0]; // 移除可能的查詢參數
      }
    }
    
    // 先停止相機
    await stopCamera();
    
    setUnlocking(true);
    try {
      await dispatch(unlockDayWithQr({ assignmentId, qrToken })).unwrap();
      // 重新獲取體驗數據以更新解鎖狀態
      if (assignmentId) {
        await dispatch(fetchReceiverExperience(assignmentId));
      }
      setShowQrScanner(false);
      setQrInput('');
      setScanMode('camera');
      showToast('解鎖成功！', 'success');
    } catch (error: any) {
      showToast('解鎖失敗：' + (error?.message || '未知錯誤'), 'error');
    } finally {
      setUnlocking(false);
    }
  };

  const handleQrInputSubmit = () => {
    if (qrInput.trim()) {
      handleUnlockDay(qrInput.trim());
    }
  };

  // 啟動相機掃描
  useEffect(() => {
    if (!showQrScanner || scanMode !== 'camera') {
      // 如果不是相機模式，停止相機
      stopCamera();
      return;
    }

    // 等待 DOM 元素準備好
    const timer = setTimeout(async () => {
      const element = document.getElementById('qr-reader');
      if (!element) return;

      // 先停止之前的相機（如果有的話）
      await stopCamera();

      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        // 計算適合的掃描框尺寸（手機上使用較小的尺寸）
        const isMobile = window.innerWidth < 768;
        const qrboxSize = isMobile ? 200 : 250;

        await html5QrCode.start(
          { facingMode: 'environment' }, // 使用後置相機
          {
            fps: 10,
            qrbox: { width: qrboxSize, height: qrboxSize },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // 掃描成功
            handleUnlockDay(decodedText);
          },
          (_errorMessage) => {
            // 掃描錯誤（忽略，因為會持續掃描）
          }
        );
        setCameraError(null);
      } catch (error: any) {
        console.error('Camera error:', error);
        setCameraError('無法啟動相機，請檢查權限或使用手動輸入');
        setScanMode('manual');
      }
    }, 100);

    // 清理函數
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [showQrScanner, scanMode]);

  // 當關閉掃描器時停止相機
  useEffect(() => {
    if (!showQrScanner) {
      stopCamera();
    }
  }, [showQrScanner]);

  // 載入中或沒有資料時顯示載入訊息（在所有 Hooks 之後）
  if (experienceStatus === 'loading' || !countdown) {
    return <p className="text-gray-400 text-center py-12">載入禮物內容中...</p>;
  }

  return (
    <section className="max-w-5xl mx-auto py-10 px-6 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-400">你收到的倒數</p>
        <h2 className="text-4xl font-semibold">{countdown.title}</h2>
        <p className="text-gray-300">{countdown.description}</p>
        
        {/* 創建者資訊 */}
        {creator && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {creator.avatar ? (
              <img src={creator.avatar} alt={creator.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-aurora/20 flex items-center justify-center text-sm text-aurora font-semibold">
                {creator.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-400">
              來自 <span className="text-aurora font-semibold">{creator.name}</span> 的禮物
            </span>
          </div>
        )}
      </div>
      <img src={countdown.coverImage} alt={countdown.title} className="w-full h-80 object-cover rounded-3xl" />
      <DayTimeline total={countdown.totalDays} current={countdown.availableDay} />
      
      {/* QR Code 掃描按鈕 */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setShowQrScanner(true)}
          className="flex items-center gap-2 px-6 py-3 bg-christmas-red/90 hover:bg-christmas-red rounded-xl text-white font-semibold transition-colors"
        >
          <HiOutlineQrCode className="w-5 h-5" />
          掃描 QR Code 解鎖
        </button>
      </div>

      {/* QR Code 掃描模態視窗 */}
      {showQrScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-2xl">
            <button
              type="button"
              className="absolute top-3 right-3 text-sm text-gray-400 hover:text-white z-10"
              onClick={async () => {
                await stopCamera();
                setShowQrScanner(false);
                setQrInput('');
                setScanMode('camera');
                setCameraError(null);
              }}
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-semibold mb-4">掃描 QR Code</h3>

            {/* 模式切換 */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={async () => {
                  await stopCamera();
                  setScanMode('camera');
                  setQrInput('');
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  scanMode === 'camera'
                    ? 'bg-christmas-red/90 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <HiOutlineCamera className="w-4 h-4" />
                  相機掃描
                </span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await stopCamera();
                  setScanMode('manual');
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  scanMode === 'manual'
                    ? 'bg-christmas-red/90 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <HiOutlineQrCode className="w-4 h-4" />
                  手動輸入
                </span>
              </button>
            </div>

            {/* 相機掃描模式 */}
            {scanMode === 'camera' && (
              <div className="space-y-4">
                {cameraError && (
                  <div className="bg-christmas-red/20 border border-christmas-red/50 rounded-lg p-3 text-sm text-christmas-red">
                    {cameraError}
                  </div>
                )}
                <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ minHeight: '300px', position: 'relative' }}>
                  <div
                    id="qr-reader"
                    ref={scannerContainerRef}
                    className="w-full"
                    style={{ 
                      minHeight: '300px',
                      width: '100%',
                      position: 'relative'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  將 QR Code 對準相機框內即可自動掃描
                </p>
              </div>
            )}

            {/* 手動輸入模式 */}
            {scanMode === 'manual' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  請輸入或貼上 QR Code 的內容來解鎖對應的日期
                </p>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">QR Code Token</label>
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    placeholder="day1-xxxxxxxxxxxxxxxx"
                    className="w-full bg-white/5 rounded-lg px-4 py-3 text-sm border border-white/10 focus:border-christmas-red focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleQrInputSubmit();
                      }
                    }}
                  />
                </div>
                
                <button
                  type="button"
                  onClick={handleQrInputSubmit}
                  disabled={!qrInput.trim() || unlocking}
                  className="w-full py-3 bg-christmas-red/90 hover:bg-christmas-red rounded-xl text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {unlocking ? '解鎖中...' : '解鎖'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card: any) => (
          <button
            key={`receiver-card-${card.day}`}
            type="button"
            className={`relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden text-left ${
              card.locked ? 'cursor-not-allowed opacity-60' : 'hover:border-aurora/60 transition'
            }`}
            onClick={() => {
              if (card.locked) return;
              setModalDay(card.day);
            }}
          >
            {card.coverImage ? (
              <img src={card.coverImage} alt={`Day ${card.day}`} className="h-32 w-full object-cover" />
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-gray-500 bg-white/10">尚未設定封面</div>
            )}
            <div className="p-3 space-y-1">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em]">Day {card.day}</p>
              <h4 className="text-base font-semibold">{card.title || '尚未命名'}</h4>
              <p className="text-xs text-gray-300 min-h-[3rem]">{card.description || '預備中...'}</p>
            </div>
            {card.locked && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
                <HiOutlineLockClosed className="w-12 h-12 mb-2 text-gray-400" />
                <p className="text-sm font-semibold">尚未解鎖</p>
                <p className="text-xs text-gray-400 mt-1">請掃描 QR Code 解鎖</p>
              </div>
            )}
          </button>
        ))}
      </div>
      {modalDay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute top-3 right-3 text-sm text-gray-400 hover:text-white"
              onClick={() => {
                setModalDay(null);
                dispatch(clearDayContent());
              }}
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-semibold mb-4">Day {modalDay}</h3>
            {modalLoading && <p className="text-gray-300">載入內容中...</p>}
            {!modalLoading && !currentDayContent && cards.find((c: any) => c.day === modalDay)?.locked && (
              <div className="text-center py-8">
                <HiOutlineLockClosed className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-semibold mb-2">此日尚未解鎖</p>
                <p className="text-sm text-gray-400 mb-4">請掃描對應的 QR Code 來解鎖此日內容</p>
                <button
                  type="button"
                  onClick={() => {
                    setModalDay(null);
                    setShowQrScanner(true);
                  }}
                  className="px-4 py-2 bg-christmas-red/90 hover:bg-christmas-red rounded-lg text-white text-sm font-semibold transition-colors"
                >
                  掃描 QR Code
                </button>
              </div>
            )}
            {!modalLoading && currentDayContent && currentDayContent.type === 'qr' && currentDayContent.qrReward ? (
              <QrCardPreview
                day={modalDay}
                qrReward={currentDayContent.qrReward}
                variant="modal"
              />
            ) : null}
            {!modalLoading && currentDayContent && currentDayContent.type === 'qr' && !currentDayContent.qrReward && (
              <p className="text-sm text-gray-300">此日尚未設定 QR 禮物內容。</p>
            )}
            {!modalLoading && currentDayContent && currentDayContent.type === 'story' ? (
              currentDayContent.cgScript ? (
                <CgPlayer key={`receiver-player-${modalDay}`} script={currentDayContent.cgScript} />
              ) : (
                <p className="text-sm text-gray-300">此日尚未設定 CG 劇情。</p>
              )
            ) : null}
            {!modalLoading && !currentDayContent && (
              <p className="text-sm text-gray-300">此日尚未設定內容。</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ReceiverExperience;

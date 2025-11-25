import { useState } from 'react';
import { HiOutlineQrCode } from 'react-icons/hi2';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/client';
import { useToast } from './ToastProvider';

interface DayQrCodeGeneratorProps {
  activeDay: number;
  countdownId: string;
}

function DayQrCodeGenerator({ activeDay, countdownId }: DayQrCodeGeneratorProps) {
  const [qrData, setQrData] = useState<{ qrToken: string; qrUrl: string } | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const { showToast } = useToast();

  const handleGenerateQr = async () => {
    if (!countdownId) return;
    setGeneratingQr(true);
    try {
      const { data } = await api.post(`/countdowns/${countdownId}/generate-qr`, { day: activeDay });
      setQrData({ qrToken: data.qrToken, qrUrl: data.qrUrl });
      showToast('QR Code 生成成功', 'success');
    } catch (error: any) {
      console.error('Failed to generate QR:', error);
      showToast('生成 QR Code 失敗：' + (error?.response?.data?.message || '未知錯誤'), 'error');
    } finally {
      setGeneratingQr(false);
    }
  };

  return (
    <div className="glass-panel p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-300 mb-1">每日解鎖 QR Code</h3>
        <p className="text-xs text-gray-400">
          生成此日的 QR Code，接收者掃描後即可解鎖當天內容。每天都有唯一的編碼。
        </p>
      </div>
      
      {!qrData ? (
        <button
          type="button"
          onClick={handleGenerateQr}
          disabled={generatingQr || !countdownId}
          className="w-full py-3 rounded-xl bg-christmas-red/90 hover:bg-christmas-red text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <HiOutlineQrCode className="w-5 h-5" />
          {generatingQr ? '生成中...' : '生成 Day ' + activeDay + ' QR Code'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center">
            <p className="text-xs text-gray-400 mb-2">掃描此 QR Code 解鎖 Day {activeDay}</p>
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG value={qrData.qrUrl} size={200} />
            </div>
            <p className="text-xs text-gray-500 mt-3 break-all text-center max-w-full">
              Token: {qrData.qrToken}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setQrData(null)}
            className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            重新生成
          </button>
        </div>
      )}
    </div>
  );
}

export default DayQrCodeGenerator;


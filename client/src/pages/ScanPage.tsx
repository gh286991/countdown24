import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2';
import { unlockDayWithQr, fetchReceiverInbox } from '../store/receiverSlice';
import type { RootState, AppDispatch } from '../store';

function ScanPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { inbox } = useSelector((state: RootState) => state.receiver);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('正在處理...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('無效的禮品卡');
      return;
    }

    // 解析 token 中的 day
    const dayMatch = token.match(/^day(\d+)-/);
    if (!dayMatch) {
      setStatus('error');
      setMessage('禮品卡格式錯誤');
      return;
    }

    const handleUnlock = async () => {
      try {
        // 先獲取收件箱以找到對應的 assignment
        await dispatch(fetchReceiverInbox());
        
        // 找到包含該 token 對應天數的 assignment
        // 這裡需要根據實際情況調整邏輯
        // 暫時假設用戶只有一個 assignment，實際應該根據 token 找到對應的 countdown
        
        // 由於我們需要 assignmentId，但 token 中沒有，我們需要從 inbox 中找到
        // 這是一個簡化版本，實際應該改進
        if (inbox.length > 0) {
          const assignmentId = inbox[0].id;
          await dispatch(unlockDayWithQr({ assignmentId, qrToken: token })).unwrap();
          setStatus('success');
          setMessage('解鎖成功！');
          
          // 3 秒後跳轉到體驗頁面
          setTimeout(() => {
            navigate(`/receiver/experience/${assignmentId}`);
          }, 2000);
        } else {
          setStatus('error');
          setMessage('找不到對應的專案，請先登入並確認您有收到禮物');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error?.message || '解鎖失敗，請確認禮品卡代碼是否正確');
      }
    };

    handleUnlock();
  }, [token, dispatch, navigate, inbox]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel p-8 max-w-md w-full text-center space-y-6">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-christmas-red border-t-transparent mx-auto"></div>
            <p className="text-lg font-semibold">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <HiOutlineCheckCircle className="w-16 h-16 text-christmas-green mx-auto" />
            <p className="text-lg font-semibold text-christmas-green">{message}</p>
            <p className="text-sm text-gray-400">即將跳轉到禮物頁面...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <HiOutlineXCircle className="w-16 h-16 text-christmas-red mx-auto" />
            <p className="text-lg font-semibold text-christmas-red">{message}</p>
            <button
              type="button"
              onClick={() => navigate('/receiver')}
              className="mt-4 px-6 py-2 bg-christmas-red/90 hover:bg-christmas-red rounded-lg text-white font-semibold transition-colors"
            >
              返回禮物盒
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ScanPage;

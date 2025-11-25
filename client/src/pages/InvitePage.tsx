import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkInvitation, acceptInvitation } from '../store/countdownSlice';
import type { AppDispatch, RootState } from '../store';

function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [inviteStatus, setInviteStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [countdown, setCountdown] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    // 檢查邀請有效性
    dispatch(checkInvitation(token))
      .unwrap()
      .then((data) => {
        if (data.valid) {
          setInviteStatus('valid');
          setCountdown(data.countdown);
        } else {
          setInviteStatus('invalid');
        }
      })
      .catch(() => {
        setInviteStatus('invalid');
      });
  }, [token, dispatch, navigate]);

  const handleAccept = async () => {
    if (!token) return;

    // 如果未登入，導向註冊頁面並帶上 invite token
    if (!user) {
      navigate(`/auth?invite=${token}&mode=register`);
      return;
    }

    // 已登入，直接接受邀請
    setAccepting(true);
    try {
      await dispatch(acceptInvitation(token)).unwrap();
      alert('成功加入倒數專案！');
      navigate('/receiver');
    } catch (error: any) {
      alert(error || '接受邀請失敗');
    } finally {
      setAccepting(false);
    }
  };

  if (inviteStatus === 'checking') {
    return (
      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="glass-panel p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-aurora border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-gray-300">檢查邀請中...</p>
        </div>
      </section>
    );
  }

  if (inviteStatus === 'invalid') {
    return (
      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="glass-panel p-8 text-center space-y-4">
          <div className="text-6xl">❌</div>
          <h2 className="text-2xl font-bold">邀請無效</h2>
          <p className="text-gray-400">此邀請連結已失效或不存在。</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            返回首頁
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-2xl mx-auto px-6 py-16">
      <div className="glass-panel p-8 space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="text-3xl font-bold mb-2">你收到一個倒數專案邀請</h2>
          {countdown && (
            <div className="mt-6 p-4 bg-white/5 rounded-2xl">
              {countdown.coverImage && (
                <img
                  src={countdown.coverImage}
                  alt={countdown.title}
                  className="w-full h-48 object-cover rounded-xl mb-4"
                />
              )}
              <h3 className="text-2xl font-semibold mb-2">{countdown.title}</h3>
              <p className="text-sm text-gray-400">
                點擊下方按鈕接受邀請，即可查看這個倒數專案的內容。
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-3 bg-gradient-to-r from-aurora to-blush rounded-xl text-slate-900 font-semibold text-lg disabled:opacity-50 transition-all hover:scale-105"
          >
            {accepting ? '處理中...' : user ? '✅ 接受邀請' : '📝 註冊並接受邀請'}
          </button>

          {!user && (
            <p className="text-xs text-center text-gray-400">
              點擊後會先導向註冊頁面，註冊完成後自動加入此倒數專案
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            返回首頁
          </button>
        </div>
      </div>
    </section>
  );
}

export default InvitePage;


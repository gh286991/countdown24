import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HiOutlineGift } from 'react-icons/hi2';
import { useToast } from '../components/ToastProvider';
import { googleLogin, loginAccount } from '../store/authSlice';
import { acceptInvitation } from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';

declare global {
  interface Window {
    google?: any;
  }
}

const DEV_UI_ENABLED = import.meta.env.DEV;

function AuthPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { status, user, error } = useSelector((state: RootState) => state.auth);
  const [preferredRole, setPreferredRole] = useState<'creator' | 'receiver'>(inviteToken ? 'receiver' : 'creator');
  const buttonRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devError, setDevError] = useState<string | null>(null);
  const [devSubmitting, setDevSubmitting] = useState(false);

  useEffect(() => {
    if (user && !inviteToken) {
      navigate(user.role === 'creator' ? '/creator' : '/receiver');
    }
  }, [user, navigate, inviteToken]);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    try {
      const result = await dispatch(
        googleLogin({
          credential,
          role: inviteToken ? 'receiver' : preferredRole,
        }),
      ).unwrap();

      if (inviteToken) {
        try {
          await dispatch(acceptInvitation(inviteToken)).unwrap();
          showToast('登入成功並已加入倒數專案！', 'success');
          navigate('/receiver');
        } catch (inviteError: any) {
          showToast(inviteError || '接受邀請失敗', 'warning');
          navigate(result.user.role === 'creator' ? '/creator' : '/receiver');
        }
      } else {
        showToast('成功使用 Google 登入', 'success');
        navigate(result.user.role === 'creator' ? '/creator' : '/receiver');
      }
    } catch (loginError: any) {
      const message = typeof loginError === 'string' ? loginError : 'Google 登入失敗，請稍後再試';
      showToast(message, 'error');
    }
  }, [dispatch, inviteToken, preferredRole, navigate, showToast]);

  const initializeGoogle = useCallback(() => {
    if (!googleClientId) return;
    if (!window.google || !buttonRef.current) return;
    buttonRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response: { credential?: string }) => {
        if (!response.credential) {
          showToast('Google 登入未完成，請再試一次', 'warning');
          return;
        }
        handleGoogleCredential(response.credential);
      },
      ux_mode: 'popup',
      auto_select: false,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_blue',
      width: '100%',
      shape: 'pill',
      text: 'continue_with',
      locale: 'zh-TW',
    });
    setGoogleReady(true);
    setGoogleError(null);
  }, [googleClientId, handleGoogleCredential, showToast]);

  useEffect(() => {
    let cancelled = false;
    async function loadGoogleConfig() {
      try {
        setConfigLoading(true);
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to load config');
        }
        const data = await response.json();
        if (cancelled) return;
        if (!data.googleClientId) {
          setGoogleClientId(null);
          setGoogleError('伺服器尚未設定 GOOGLE_CLIENT_ID，請聯絡系統管理員');
        } else {
          setGoogleClientId(data.googleClientId as string);
          setGoogleReady(false);
          setGoogleError(null);
        }
      } catch (configError) {
        if (cancelled) return;
        console.error('Load Google config failed', configError);
        setGoogleClientId(null);
        setGoogleError('無法載入 Google 登入設定，請稍後再試');
      } finally {
        if (!cancelled) {
          setConfigLoading(false);
        }
      }
    }
    loadGoogleConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDevLogin = useCallback(async () => {
    if (!DEV_UI_ENABLED || devSubmitting) return;
    if (!devEmail.trim() || !devPassword.trim()) {
      setDevError('請輸入帳號與密碼');
      return;
    }
    setDevSubmitting(true);
    setDevError(null);
    try {
      const result = await dispatch(
        loginAccount({ email: devEmail.trim(), password: devPassword.trim() }),
      ).unwrap();
      showToast('開發者登入成功', 'success');
      if (inviteToken) {
        try {
          await dispatch(acceptInvitation(inviteToken)).unwrap();
          navigate('/receiver');
        } catch (devInviteError: any) {
          showToast(devInviteError || '接受邀請失敗', 'warning');
          navigate(result.user.role === 'creator' ? '/creator' : '/receiver');
        }
      } else {
        navigate(result.user.role === 'creator' ? '/creator' : '/receiver');
      }
    } catch (devLoginError: any) {
      if (typeof devLoginError === 'string') {
        setDevError(devLoginError);
      } else if (devLoginError?.message) {
        setDevError(devLoginError.message);
      } else {
        setDevError('開發者登入失敗');
      }
    } finally {
      setDevSubmitting(false);
    }
  }, [dispatch, devEmail, devPassword, inviteToken, navigate, preferredRole, showToast, acceptInvitation, devSubmitting]);

  useEffect(() => {
    if (!googleClientId || googleError) {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-client="true"]');
    if (window.google) {
      initializeGoogle();
      return;
    }

    const script = existingScript || document.createElement('script');
    if (!existingScript) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleClient = 'true';
      document.body.appendChild(script);
    }
    const handleLoad = () => initializeGoogle();
    const handleError = () => setGoogleError('無法載入 Google 登入服務，請稍後再試');
    script.onload = handleLoad;
    script.onerror = handleError;

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, googleError, initializeGoogle]);

  return (
    <section className="max-w-3xl mx-auto pt-16 px-6 relative z-10">
      <div className="glass-panel space-y-8">
        {inviteToken && (
          <div className="p-4 bg-gradient-to-r from-christmas-red/20 to-christmas-green/20 rounded-2xl border border-christmas-red/30">
            <p className="text-sm text-center flex items-center justify-center gap-2 flex-col">
              <span className="flex items-center gap-2">
                <HiOutlineGift className="w-4 h-4" />
                你正在接受倒數專案邀請
              </span>
              <span className="text-xs text-gray-400">使用 Google 登入後將自動加入專案</span>
            </p>
          </div>
        )}

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">使用 Google 帳號登入 / 建立帳號</h1>
          <p className="text-sm text-gray-400">
            我們會使用你的 Google Email 建立 Countdown24 帳號，並在第一次登入時建立對應角色。
          </p>
        </div>

        {!inviteToken && (
          <div>
            <label className="text-sm text-gray-400">想要扮演的角色</label>
            <div className="flex gap-4 mt-2">
              <label className={`flex-1 border rounded-xl px-4 py-3 cursor-pointer transition ${preferredRole === 'creator' ? 'border-christmas-red text-christmas-red bg-christmas-red/10' : 'border-white/10 bg-white/5'}`}>
                <input
                  type="radio"
                  name="role"
                  value="creator"
                  className="hidden"
                  checked={preferredRole === 'creator'}
                  onChange={() => setPreferredRole('creator')}
                />
                我是編輯者
              </label>
              <label className={`flex-1 border rounded-xl px-4 py-3 cursor-pointer transition ${preferredRole === 'receiver' ? 'border-christmas-green text-christmas-green bg-christmas-green/10' : 'border-white/10 bg-white/5'}`}>
                <input
                  type="radio"
                  name="role"
                  value="receiver"
                  className="hidden"
                  checked={preferredRole === 'receiver'}
                  onChange={() => setPreferredRole('receiver')}
                />
                我是接收者
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">第一次使用 Google 登入時，我們會依照這個角色建立帳號。</p>
          </div>
        )}

        <div>
          <label className="text-sm text-gray-400">Google 登入</label>
          <div className="mt-4 space-y-3">
            <div className="w-full flex justify-center">
              <div ref={buttonRef} className="w-full flex justify-center min-h-[48px]" />
            </div>
            {configLoading && (
              <p className="text-sm text-center text-gray-400">正在讀取 Google 登入設定...</p>
            )}
            {!configLoading && googleError && (
              <p className="text-sm text-center text-rose-400">{googleError}</p>
            )}
            {!googleError && !configLoading && !googleReady && (
              <p className="text-sm text-center text-gray-400">正在載入 Google 登入...</p>
            )}
            {status === 'loading' && (
              <p className="text-xs text-center text-gray-400">處理中，請稍候...</p>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          點擊「使用 Google 登入」即表示你同意我們存取 Google 提供的公開檔案資訊，以協助建立倒數體驗。
        </p>

        {error && <p className="text-sm text-center text-rose-400">{error}</p>}

        {DEV_UI_ENABLED && (
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-amber-200">開發者測試登入</p>
              <p className="text-xs text-amber-100/70">
                只在本機 / develop 環境顯示，可直接輸入帳號密碼測試，正式環境不會出現。
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="email"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-aurora focus:outline-none"
                placeholder="dev@example.com"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
              />
              <input
                type="password"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-aurora focus:outline-none"
                placeholder="開發密碼"
                value={devPassword}
                onChange={(e) => setDevPassword(e.target.value)}
              />
            </div>
            {devError && <p className="text-xs text-rose-300">{devError}</p>}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDevLogin}
                className="px-4 py-2 rounded-xl bg-amber-500/80 text-slate-900 text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-50"
                disabled={devSubmitting}
              >
                使用開發帳號登入
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default AuthPage;

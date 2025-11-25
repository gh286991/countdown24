import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginAccount, registerAccount } from '../store/authSlice';
import { acceptInvitation } from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';

interface FormData {
  name: string;
  email: string;
  password: string;
  role: 'creator' | 'receiver';
}

const initialForm: FormData = {
  name: '',
  email: '',
  password: '',
  role: 'creator',
};

function AuthPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const urlMode = searchParams.get('mode') as 'login' | 'register' | null;
  
  const [mode, setMode] = useState<'login' | 'register'>(urlMode || 'login');
  const [form, setForm] = useState<FormData>({
    ...initialForm,
    // 如果有邀請 token，預設角色為 receiver
    role: inviteToken ? 'receiver' : 'creator',
  });
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { status, user, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user && !inviteToken) {
      navigate(user.role === 'creator' ? '/creator' : '/receiver');
    }
  }, [user, navigate, inviteToken]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (mode === 'register') {
        const result = await dispatch(registerAccount(form)).unwrap();
        
        // 如果有邀請 token，註冊後自動接受邀請
        if (inviteToken) {
          try {
            await dispatch(acceptInvitation(inviteToken)).unwrap();
            alert('註冊成功並已加入倒數專案！');
            navigate('/receiver');
          } catch (inviteError: any) {
            alert(inviteError || '接受邀請失敗，但帳號已註冊成功');
            navigate('/receiver');
          }
        } else {
          navigate(result.user.role === 'creator' ? '/creator' : '/receiver');
        }
      } else {
        const result = await dispatch(loginAccount({ email: form.email, password: form.password })).unwrap();
        
        // 如果有邀請 token，登入後自動接受邀請
        if (inviteToken) {
          try {
            await dispatch(acceptInvitation(inviteToken)).unwrap();
            alert('登入成功並已加入倒數專案！');
            navigate('/receiver');
          } catch (inviteError: any) {
            alert(inviteError || '接受邀請失敗');
            navigate(result.user.role === 'creator' ? '/creator' : '/receiver');
          }
        } else {
          navigate(result.user.role === 'creator' ? '/creator' : '/receiver');
        }
      }
    } catch (submitError) {
      console.error('Auth error', submitError);
    }
  };

  return (
    <section className="max-w-3xl mx-auto pt-16 px-6">
      <div className="glass-panel">
        {inviteToken && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30">
            <p className="text-sm text-center">
              🎁 你正在接受倒數專案邀請
              <br />
              <span className="text-xs text-gray-400">
                {mode === 'register' ? '註冊後將自動加入專案（你將收到禮物）' : '登入後將自動加入專案'}
              </span>
            </p>
          </div>
        )}
        
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-3 rounded-full ${mode === 'login' ? 'bg-aurora/80 text-slate-900 font-semibold' : 'bg-white/5'}`}
          >
            登入
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-3 rounded-full ${mode === 'register' ? 'bg-aurora/80 text-slate-900 font-semibold' : 'bg-white/5'}`}
          >
            建立帳號
          </button>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div>
              <label className="text-sm text-gray-400">顯示名稱</label>
              <input
                type="text"
                value={form.name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: event.target.value })}
                className="w-full mt-1 bg-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-aurora"
                placeholder="像是 Aurora"
                required
              />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: event.target.value })}
              className="w-full mt-1 bg-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-aurora"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">密碼</label>
            <input
              type="password"
              value={form.password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: event.target.value })}
              className="w-full mt-1 bg-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-aurora"
              placeholder="至少 8 碼"
              required
            />
          </div>

          {mode === 'register' && !inviteToken && (
            <div>
              <label className="text-sm text-gray-400">角色</label>
              <div className="flex gap-4 mt-1">
                <label className={`flex-1 border rounded-xl px-4 py-3 cursor-pointer ${form.role === 'creator' ? 'border-aurora text-aurora' : 'border-white/10'}`}>
                  <input
                    type="radio"
                    name="role"
                    value="creator"
                    className="hidden"
                    checked={form.role === 'creator'}
                    onChange={() => setForm({ ...form, role: 'creator' })}
                  />
                  我是編輯者
                </label>
                <label className={`flex-1 border rounded-xl px-4 py-3 cursor-pointer ${form.role === 'receiver' ? 'border-aurora text-aurora' : 'border-white/10'}`}>
                  <input
                    type="radio"
                    name="role"
                    value="receiver"
                    className="hidden"
                    checked={form.role === 'receiver'}
                    onChange={() => setForm({ ...form, role: 'receiver' })}
                  />
                  我是接收者
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3 rounded-full bg-gradient-to-r from-aurora to-blush text-slate-900 font-semibold disabled:opacity-70"
          >
            {status === 'loading' ? '處理中...' : mode === 'login' ? '登入' : '立即建立'}
          </button>

          {error && <p className="text-sm text-rose-400 text-center">{error}</p>}
        </form>
      </div>
    </section>
  );
}

export default AuthPage;


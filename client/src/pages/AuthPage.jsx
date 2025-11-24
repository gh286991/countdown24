import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginAccount, registerAccount } from '../store/authSlice';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'creator',
};

function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, user, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user) {
      navigate(user.role === 'creator' ? '/creator' : '/receiver');
    }
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (mode === 'register') {
        const result = await dispatch(registerAccount(form)).unwrap();
        navigate(result.user.role === 'creator' ? '/creator' : '/receiver');
      } else {
        const result = await dispatch(loginAccount({ email: form.email, password: form.password })).unwrap();
        navigate(result.user.role === 'creator' ? '/creator' : '/receiver');
      }
    } catch (submitError) {
      console.error('Auth error', submitError);
    }
  };

  return (
    <section className="max-w-3xl mx-auto pt-16 px-6">
      <div className="glass-panel">
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
                onChange={(event) => setForm({ ...form, name: event.target.value })}
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
              onChange={(event) => setForm({ ...form, email: event.target.value })}
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
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="w-full mt-1 bg-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-aurora"
              placeholder="至少 8 碼"
              required
            />
          </div>

          {mode === 'register' && (
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

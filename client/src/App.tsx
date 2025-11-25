import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Route, Routes } from 'react-router-dom';
import { HiOutlineGift } from 'react-icons/hi2';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import CreatorDashboard from './pages/CreatorDashboard';
import CreatorEditor from './pages/CreatorEditor';
import InvitePage from './pages/InvitePage';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/ProfilePage';
import ReceiverExperience from './pages/ReceiverExperience';
import ReceiverInbox from './pages/ReceiverInbox';
import { bootstrapSession, logout } from './store/authSlice';
import type { RootState } from './store';

function App() {
  const dispatch = useDispatch();
  const { user, status } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // 只在尚未載入且沒有用戶資料時才發起請求
    if (status === 'idle' && !user) {
      dispatch(bootstrapSession());
    }
  }, [dispatch, status, user]);

  return (
    <div className="min-h-screen relative">
      {/* 額外的雪花層 - 多層不同速度 */}
      <div className="snow-layer"></div>
      <div className="snow-layer snow-layer-fast"></div>
      <div className="snow-layer" style={{ animation: 'snowfall4 22s linear infinite', animationDelay: '-8s', opacity: 0.35 }}></div>
      
      <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 py-6 px-6 relative z-10">
        <Link to="/" className="text-2xl font-semibold tracking-[0.4em] uppercase text-white flex items-center gap-2">
          <HiOutlineGift className="w-6 h-6" />
          倒數禮物盒
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user?.role === 'creator' && (
            <Link to="/creator" className="text-gray-300 hover:text-white">
              我的專案
            </Link>
          )}
          {user && (
            <Link to="/receiver" className="text-gray-300 hover:text-white flex items-center gap-2">
              <HiOutlineGift className="w-4 h-4" />
              我的禮物盒
            </Link>
          )}
          {!user ? (
            <Link to="/auth" className="px-4 py-2 rounded-full bg-gradient-to-r from-christmas-red/80 to-christmas-red-dark/80 hover:from-christmas-red hover:to-christmas-red-dark text-white font-semibold transition-all duration-300 flex items-center gap-2">
              <HiOutlineGift className="w-4 h-4" />
              登入 / 註冊
            </Link>
          ) : (
            <>
              <Link to="/profile" className="text-gray-300 hover:text-christmas-red transition-colors">
                個人資料
              </Link>
              <button
                type="button"
                onClick={() => dispatch(logout())}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-christmas-red/20 transition-colors"
              >
                登出 {user.name}
              </button>
            </>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allow={['creator', 'receiver']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator"
          element={
            <ProtectedRoute allow={['creator']}>
              <CreatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator/countdowns/:id"
          element={
            <ProtectedRoute allow={['creator']}>
              <CreatorEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receiver"
          element={
            <ProtectedRoute allow={['creator', 'receiver']}>
              <ReceiverInbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receiver/experience/:assignmentId"
          element={
            <ProtectedRoute allow={['creator', 'receiver']}>
              <ReceiverExperience />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </div>
  );
}

export default App;


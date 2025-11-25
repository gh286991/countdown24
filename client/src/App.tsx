import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Route, Routes } from 'react-router-dom';
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
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 py-6 px-6">
        <Link to="/" className="text-2xl font-semibold tracking-[0.4em] uppercase">
          24·Token
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user?.role === 'creator' && (
            <Link to="/creator" className="text-gray-300 hover:text-white">
              我的專案
            </Link>
          )}
          {user && (
            <Link to="/receiver" className="text-gray-300 hover:text-white">
              🎁 我的禮物盒
            </Link>
          )}
          {!user ? (
            <Link to="/auth" className="px-4 py-2 rounded-full bg-white/10">
              登入 / 註冊
            </Link>
          ) : (
            <>
              <Link to="/profile" className="text-gray-300 hover:text-white">
                個人資料
              </Link>
              <button
                type="button"
                onClick={() => dispatch(logout())}
                className="px-4 py-2 rounded-full bg-white/10"
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


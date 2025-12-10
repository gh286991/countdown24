import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

interface ProtectedRouteProps {
  children: ReactNode;
  allow?: ('creator' | 'receiver')[];
}

const ProtectedRoute = ({ children, allow }: ProtectedRouteProps) => {
  const { user, status } = useSelector((state: RootState) => state.auth);

  // 當 status 是 idle 或 loading 時，都應該等待 bootstrap 完成
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-aurora">
        正在載入使用者資訊...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allow && !allow.includes(user.role)) {
    const fallback = user.role === 'creator' ? '/creator' : '/receiver';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;


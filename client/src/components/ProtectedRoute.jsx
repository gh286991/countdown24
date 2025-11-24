import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, allow }) => {
  const { user, status } = useSelector((state) => state.auth);

  if (status === 'loading') {
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

  return children;
};

export default ProtectedRoute;

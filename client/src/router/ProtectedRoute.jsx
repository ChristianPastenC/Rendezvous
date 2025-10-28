// client/src/router/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to='/auth' />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
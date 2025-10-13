import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { currentUser } = useAuth();
  console.log("🚀 ~ ProtectedRoute ~ currentUser:", currentUser)

  if (!currentUser) {
    return <Navigate to='/auth' />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
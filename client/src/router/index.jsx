// client/src/router/index.jsx
import { Routes, Route } from 'react-router';
import HomePage from '../pages/HomePage';
import AuthenticationPage from '../pages/AuthenticationPage';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<AuthenticationPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Route>
    </Routes>
  );
};
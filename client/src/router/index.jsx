import { Routes, Route } from 'react-router';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import MainLayout from '../components/layout/MainLayout';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
      </Route>
    </Routes>
  );
};
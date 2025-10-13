import { Routes, Route } from 'react-router';
import HomePage from '../pages/HomePage';
import AuthenticationPage from '../pages/AuthenticationPage';
import MainLayout from '../components/layout/MainLayout';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path='/login' element={<AuthenticationPage />} />
      <Route path='/' element={<MainLayout />}>
        <Route index element={<HomePage />} />
      </Route>
    </Routes>
  );
};
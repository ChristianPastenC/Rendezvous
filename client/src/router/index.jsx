// src/router/index.jsx
import { Routes, Route, Navigate } from 'react-router';
import { SocketProvider } from '../context/SocketContext';
import { ConversationsProvider } from '../context/ConversationsContext';
import HomePage from '../pages/HomePage';
import AuthenticationPage from '../pages/AuthenticationPage';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import ChatView from '../pages/ChatView';
import GroupView from '../pages/GroupView';
import ProfilePage from '../pages/ProfilePage';


const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<AuthenticationPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <SocketProvider>
            <ConversationsProvider>
              <MainLayout />
            </ConversationsProvider>
          </SocketProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="chat/:userId" element={<ChatView />} />
        <Route path="group/:groupId" element={<GroupView />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
};

export default AppRoutes;
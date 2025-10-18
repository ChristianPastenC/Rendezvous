// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ConversationsProvider } from './context/ConversationsContext';
import AuthenticationPage from './pages/AuthenticationPage';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import ChatView from './pages/ChatView';
import GroupView from './pages/GroupView';
import ProfilePage from './pages/ProfilePage';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <p className="text-gray-400 text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
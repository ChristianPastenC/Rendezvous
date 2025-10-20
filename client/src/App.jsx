// src/App.jsx
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './router';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
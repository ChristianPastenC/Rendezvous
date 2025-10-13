import React from 'react';
import { Outlet, useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

const MainLayout = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("Usuario cerró sesión exitosamente.");
      navigate("/auth");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-800 text-white">
      <aside className="w-64 bg-gray-900 p-4 flex flex-col justify-between">
        <div />
        {currentUser && (
          <div className="p-2 bg-gray-800 rounded-lg">
            <p className="text-sm font-semibold truncate" title={currentUser.email}>
              {currentUser.displayName || currentUser.email}
            </p>
            <button
              onClick={handleSignOut}
              className="w-full mt-2 text-left text-sm text-red-400 hover:bg-red-500 hover:text-white rounded p-1 transition-colors font-semibold"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
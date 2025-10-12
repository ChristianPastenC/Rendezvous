import React from 'react';
import { Outlet } from 'react-router';

const MainLayout = () => {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h2 className="font-bold text-xl">Servers</h2>
      </aside>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
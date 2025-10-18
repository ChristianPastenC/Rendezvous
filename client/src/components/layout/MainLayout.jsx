// src/layouts/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router';

const MainLayout = () => {
  return (
    <div className="h-screen bg-gray-900 text-white">
      <Outlet />
    </div>
  );
};

export default MainLayout;
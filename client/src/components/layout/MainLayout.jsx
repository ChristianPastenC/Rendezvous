// src/layouts/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router';

const MainLayout = () => {
  return (
    <div className="h-screen">
      <Outlet />
    </div>
  );
};

export default MainLayout;
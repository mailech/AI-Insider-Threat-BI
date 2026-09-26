import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export const Layout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#060913]">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 bg-[#060913] cyber-grid">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

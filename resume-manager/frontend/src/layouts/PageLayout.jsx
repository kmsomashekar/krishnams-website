import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import MobileNav from '../components/MobileNav.jsx';

export default function PageLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      
      {/* Desktop Navigation Tray Layout Zone */}
      <Sidebar />

      {/* Primary Interface Frame Segment */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-16 lg:pb-0">
        
        {/* State Dynamic Control Top Bar */}
        <Header />

        {/* Global Router Outlet View Canvas Workspace */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

      </div>

      {/* Mobile Sticky Action Bar Element */}
      <MobileNav />

    </div>
  );
}
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { navigationItems } from './Sidebar.jsx';

export default function Header() {
  const { userId } = useAuth();
  const location = useLocation();

  // Dynamically resolve route names, accounting for detail dynamic match tokens
  const currentNav = navigationItems.find(item => location.pathname.startsWith(item.path));
  const pageTitle = currentNav ? currentNav.name : 'Workspace';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-8 shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">
        {location.pathname.includes('/opportunities/') && currentNav?.name === 'Opportunities'
          ? 'Opportunity Detail Workspace'
          : pageTitle}
      </h1>
      <div className="flex items-center space-x-4">
        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Context Mode</span>
          <span className="text-sm font-medium text-gray-700">{userId}</span>
        </div>
      </div>
    </header>
  );
}
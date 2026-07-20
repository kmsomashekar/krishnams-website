import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { navigationItems } from './Sidebar.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const currentNav = navigationItems.find(item => location.pathname.startsWith(item.path));
  const pageTitle = currentNav ? currentNav.name : 'Workspace';

  const handleLogout = async () => {
    setLogoutError('');
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setLogoutError(err.message || 'Logout failed');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-8 shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">
        {location.pathname.includes('/opportunities/') && currentNav?.name === 'Opportunities'
          ? 'Opportunity Detail Workspace'
          : pageTitle}
      </h1>

      <div className="flex items-center space-x-6">
        {logoutError && (
          <span className="text-xs text-red-600 font-medium">{logoutError}</span>
        )}

        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {user?.role || 'User'}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {user?.email || user?.id || 'User'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </header>
  );
}

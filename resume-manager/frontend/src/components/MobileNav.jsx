import React from 'react';
import { NavLink } from 'react-router-dom';
import { navigationItems } from './Sidebar.jsx';

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 pb-safe z-50">
      {navigationItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <span className="truncate max-w-[72px]">
            {item.name === 'Opportunities' ? 'Jobs' : item.name}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
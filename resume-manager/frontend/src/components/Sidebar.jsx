import React from 'react';
import { NavLink } from 'react-router-dom';

export const navigationItems = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'JD Analyzer', path: '/jd-analyzer' },
  { name: 'Opportunities', path: '/opportunities' },
  { name: 'Outreach', path: '/outreach' },
  { name: 'Resumes', path: '/resumes' },
  { name: 'Interviews', path: '/interviews' },
  { name: 'Cover Letters', path: '/cover-letters' },
  { name: 'Settings', path: '/settings/admin/users' },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-100 flex-col justify-between p-5 border-r border-slate-800 shrink-0">
      <div>
        <div className="text-lg font-semibold tracking-tight text-white px-3 py-4 mb-6 border-b border-slate-800">
          Resume Manager
        </div>
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="text-xs text-slate-500 border-t border-slate-800 pt-4 px-3">
        Phase 1 Development
      </div>
    </aside>
  );
}
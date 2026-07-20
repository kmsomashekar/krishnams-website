// frontend/src/pages/Settings.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      
      <div className="space-y-6">
        {/* User Management Section (Visible to ADMIN only) */}
        {user && user.role === 'ADMIN' && (
          <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Administration</h2>
            <p className="text-sm text-gray-600 mb-4">Manage application users, roles, and administrative controls.</p>
            <Link
              to="/settings/admin/users"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              User Management
            </Link>
          </div>
        )}

        {/* Existing Settings options */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Account Security</h2>
          <p className="text-sm text-gray-600 mb-4">Configure Multi-Factor Authentication and security preferences.</p>
          <Link
            to="/auth/totp/setup"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Manage TOTP / MFA
          </Link>
        </div>
      </div>
    </div>
  );
}
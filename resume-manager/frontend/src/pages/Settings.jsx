// frontend/src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({
    display_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    location: ''
  });

  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

    const handleChangePassword = async (e) => {
    e.preventDefault();

    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.new_password.length < 12) {
      setPasswordError('New password must be at least 12 characters long.');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setIsChangingPassword(true);

      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      });

      const body = await res.json();

      if (!res.ok || !body?.success) {
        throw new Error(
          body?.error?.message || 'Failed to change password.'
        );
      }

      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });

      setPasswordSuccess('Password changed successfully.');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

    const loadProfile = async () => {
      try {
        const res = await fetch('/api/v1/profile', {
        credentials: 'include'
        });

        const body = await res.json();

        if (!res.ok || !body?.success) {
          throw new Error(
          body?.error?.message || 'Failed to load profile.'
          );
        }

      const profile = body.data.profile;

      setProfileForm({
        display_name: profile.display_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        linkedin_url: profile.linkedin_url || '',
        location: profile.location || ''
      });

    } catch (err) {
      setProfileError(err.message);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    setProfileError('');
    setProfileSuccess('');

    try {
      setIsSavingProfile(true);

      const res = await fetch('/api/v1/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          display_name: profileForm.display_name,
          phone: profileForm.phone,
          linkedin_url: profileForm.linkedin_url,
          location: profileForm.location
        })
    });

    const body = await res.json();

    if (!res.ok || !body?.success) {
      throw new Error(
        body?.error?.message || 'Failed to save profile.'
      );
    }

    setProfileSuccess('Profile updated successfully.');

    } catch (err) {
      setProfileError(err.message);
  } finally {
    setIsSavingProfile(false);
  }
};
  useEffect(() => {
    loadProfile();
  }, []);
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

{/* Candidate Profile */}
<div className="bg-white shadow rounded-lg p-6 border border-gray-200">
  <h2 className="text-lg font-medium text-gray-900 mb-2">
    Candidate Profile
  </h2>

  <p className="text-sm text-gray-600 mb-4">
    Manage your profile information used for resumes, cover letters, and applications.
  </p>

  <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Name
      </label>
      <input
        type="text"
        value={profileForm.display_name}
        onChange={(e) =>
          setProfileForm({
            ...profileForm,
            display_name: e.target.value
          })
        }
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Email
      </label>
      <input
        type="email"
        value={profileForm.email}
        disabled
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Phone
      </label>
      <input
        type="text"
        value={profileForm.phone}
        onChange={(e) =>
          setProfileForm({
            ...profileForm,
            phone: e.target.value
          })
        }
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        LinkedIn URL
      </label>
      <input
        type="text"
        value={profileForm.linkedin_url}
        onChange={(e) =>
          setProfileForm({
            ...profileForm,
            linkedin_url: e.target.value
          })
        }
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Location
      </label>
      <input
        type="text"
        value={profileForm.location}
        onChange={(e) =>
          setProfileForm({
            ...profileForm,
            location: e.target.value
          })
        }
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>

    {profileError && (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {profileError}
      </div>
    )}

    {profileSuccess && (
      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
        {profileSuccess}
      </div>
    )}

    <button
      type="submit"
      disabled={isSavingProfile}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
    >
      {isSavingProfile ? 'Saving Profile...' : 'Save Profile'}
    </button>

  </form>
</div>
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
            <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-base font-medium text-gray-900 mb-2">
              Change Password
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Update your account password. Your new password must be at least 12 characters long.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      current_password: e.target.value
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      new_password: e.target.value
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirm_password: e.target.value
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              {passwordError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {passwordSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              >
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
        </div>
      </div>
      );
}
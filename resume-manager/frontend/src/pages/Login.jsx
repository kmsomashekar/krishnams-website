import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result && result.mfa_required) {
        setMfaChallenge(result.challenge);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyMfa(mfaChallenge, totpCode);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid verification code.');
      // If challenge is expired/invalid/exhausted, allow resetting state back to password login if appropriate
      if (err.message && (err.message.toLowerCase().includes('expired') || err.message.toLowerCase().includes('invalid') || err.message.toLowerCase().includes('exceeded'))) {
        // Keep error visible but let user restart or retry
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetToLogin = () => {
    setMfaChallenge(null);
    setTotpCode('');
    setError('');
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Resume Manager</h2>
          <p className="text-sm text-slate-500 mt-1">
            {mfaChallenge ? 'Two-Factor Authentication Required' : 'Sign in to your account to continue'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!mfaChallenge ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="space-y-5">
            <div className="text-sm text-slate-600 mb-2">
              Enter the 6-digit code from your authenticator app.
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3.5 py-2.5 text-center tracking-widest text-lg bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-mono"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || totpCode.length !== 6}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={handleResetToLogin}
              className="w-full py-2 px-4 bg-transparent hover:bg-gray-50 text-slate-600 font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
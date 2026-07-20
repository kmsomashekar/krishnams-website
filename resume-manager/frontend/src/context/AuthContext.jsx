import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch('/api/v1/auth/session', {
          credentials: 'include'
        });
        const json = await response.json();
        if (json.success && json.data && json.data.authenticated && json.data.user) {
          setUser(json.data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = async (email, password) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error?.message || 'Login failed');
    }
    
    // Check if MFA challenge is required
    if (json.data && json.data.mfa_required) {
      return json.data;
    }

    if (json.data && json.data.user) {
      setUser(json.data.user);
    }
    return json.data;
  };

  const verifyMfa = async (challenge, code) => {
    const response = await fetch('/api/v1/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ challenge, code })
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error?.message || 'MFA verification failed');
    }
    if (json.data && json.data.user) {
      setUser(json.data.user);
    }
    return json.data;
  };

  const logout = async () => {
    const response = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error?.message || 'Logout failed on server');
    }
    setUser(null);
  };

  const value = {
    user,
    userId: user ? user.id : null,
    isAuthenticated: !!user,
    loading,
    login,
    verifyMfa,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
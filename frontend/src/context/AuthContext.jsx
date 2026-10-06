import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on mount or when token changes
  const restoreSession = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get('/auth/me');
      if (res && res.success && res.data?.user) {
        setUser(res.data.user);
        setToken(storedToken);
      } else {
        throw new Error('Invalid user payload');
      }
    } catch (err) {
      console.warn('[AuthContext] Session restore failed, clearing token:', err.message);
      localStorage.removeItem('token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    // Listen for unauthorized 401 events dispatched by apiClient
    const handleUnauthorized = () => {
      localStorage.removeItem('token');
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [restoreSession]);

  /**
   * Log in user with email & password
   */
  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    if (response && response.success && response.data) {
      const { token: receivedToken, user: receivedUser } = response.data;
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    }

    throw new Error(response.message || 'Login failed');
  };

  /**
   * Log out user and clear stored tokens
   */
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (_) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setToken(null);
    }
  };

  /**
   * Change user password
   */
  const changePassword = async (currentPassword, newPassword) => {
    const response = await apiClient.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response;
  };

  /**
   * Refresh current user profile data
   */
  const refreshUser = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res && res.success && res.data?.user) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  /**
   * Helper to determine appropriate role-based dashboard path
   */
  const getDashboardPath = (role = user?.role) => {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'faculty':
        return '/faculty/dashboard';
      case 'student':
        return '/student/dashboard';
      default:
        return '/login';
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout,
    changePassword,
    refreshUser,
    getDashboardPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

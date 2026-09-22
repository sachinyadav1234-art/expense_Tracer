import { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext();

// Helper to safely get stored token
const getStoredToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

// Helper to safely get stored user
const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

// Helper to clear stored auth data
const clearStoredAuth = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (e) {
    console.error('Failed to clear stored auth:', e);
  }
};

// Fast client-side JWT expiration check
const isTokenExpired = (token) => {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    // 5-second clock skew buffer
    if (decoded && decoded.exp && typeof decoded.exp === 'number') {
      return Date.now() >= (decoded.exp * 1000 - 5000);
    }
    return false;
  } catch {
    return true;
  }
};

// Singleton promise to prevent duplicate concurrent in-flight auth requests
let inFlightAuthPromise = null;

export const AuthProvider = ({ children }) => {
  // Synchronously initialize user and loading states from localStorage
  const [user, setUser] = useState(() => {
    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      clearStoredAuth();
      return null;
    }
    return getStoredUser();
  });

  const [loading, setLoading] = useState(() => {
    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      clearStoredAuth();
      return false; // Immediately show login without blocking or spinner
    }
    const cachedUser = getStoredUser();
    // If we already have the cached user and a valid token, don't block the UI
    return !cachedUser;
  });

  // Sync token to Capacitor native preference for background receiver
  const syncCredentialsToNative = (token) => {
    const isNative = !!window.Capacitor?.isNative;
    if (isNative) {
      try {
        const apiUrl = localStorage.getItem('server_url') || 'http://10.0.2.2:5000/api';
        window.Capacitor.Plugins.AutoFetchPlugin.saveCredentials({ 
          token: token || '', 
          apiUrl 
        })
        .then(() => console.log('Successfully synced credentials to native'))
        .catch(err => console.error('Failed to sync credentials to native:', err));
      } catch (e) {
        console.error('Capacitor native sync exception:', e);
      }
    }
  };

  // Check and verify token on load without redundant requests
  useEffect(() => {
    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      clearStoredAuth();
      setUser(null);
      setLoading(false);
      return;
    }

    const verifyAuth = async () => {
      try {
        if (!inFlightAuthPromise) {
          inFlightAuthPromise = authService.getMe();
        }
        const data = await inFlightAuthPromise;
        if (data && data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          syncCredentialsToNative(token);
        } else {
          clearStoredAuth();
          setUser(null);
        }
      } catch (error) {
        console.warn('Auth verification request failed or skipped:', error?.message || error);
        // If server explicitly tells us the token is unauthorized, clear it
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          clearStoredAuth();
          setUser(null);
        }
      } finally {
        inFlightAuthPromise = null;
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  // Register function
  const register = async (name, email, password) => {
    try {
      const data = await authService.register(name, email, password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setLoading(false);
        syncCredentialsToNative(data.token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Registration failed' };
    } catch (error) {
      console.error('Registration API error:', error);
      let errMsg = 'Registration failed';
      if (error.response) {
        if (error.response.data && typeof error.response.data === 'object' && error.response.data.message) {
          errMsg = error.response.data.message;
        } else if (error.response.data && typeof error.response.data === 'string') {
          if (error.response.data.includes('<title>')) {
            const titleMatch = error.response.data.match(/<title>([\s\S]*?)<\/title>/i);
            errMsg = titleMatch ? `Server Error: ${titleMatch[1]}` : `Server returned HTML error (${error.response.status})`;
          } else {
            errMsg = error.response.data.substring(0, 100);
          }
        } else {
          errMsg = `Server Error (${error.response.status})`;
        }
      } else if (error.message === 'Network Error') {
        errMsg = 'Server unreachable (Network Error)';
      } else if (error.message) {
        errMsg = error.message;
      }
      return { success: false, message: errMsg };
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setLoading(false);
        syncCredentialsToNative(data.token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid email or password' };
    } catch (error) {
      console.error('Login API error:', error);
      let errMsg = 'Invalid email or password';
      if (error.response) {
        if (error.response.data && typeof error.response.data === 'object' && error.response.data.message) {
          errMsg = error.response.data.message;
        } else if (error.response.data && typeof error.response.data === 'string') {
          if (error.response.data.includes('<title>')) {
            const titleMatch = error.response.data.match(/<title>([\s\S]*?)<\/title>/i);
            errMsg = titleMatch ? `Server Error: ${titleMatch[1]}` : `Server returned HTML error (${error.response.status})`;
          } else {
            errMsg = error.response.data.substring(0, 100);
          }
        } else {
          errMsg = `Server Error (${error.response.status})`;
        }
      } else if (error.message === 'Network Error') {
        errMsg = 'Server unreachable (Network Error)';
      } else if (error.message) {
        errMsg = error.message;
      }
      return { success: false, message: errMsg };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      clearStoredAuth();
      setUser(null);
      setLoading(false);
      syncCredentialsToNative('');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

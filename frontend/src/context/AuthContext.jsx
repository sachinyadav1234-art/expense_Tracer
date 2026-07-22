import { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Jab app load hoga tab check karenge ki token stored hai ya nahi
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // backend se user details fetch karenge
          const data = await authService.getMe();
          if (data.success) {
            setUser(data.user);
            syncCredentialsToNative(token);
          } else {
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Auth verification failed', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // Register function
  const register = async (name, email, password) => {
    try {
      const data = await authService.register(name, email, password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        syncCredentialsToNative(data.token);
        return { success: true };
      }
    } catch (error) {
      console.error('Registration API error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 
                 (error.message === 'Network Error' || !error.response 
                   ? 'Server unreachable (Network Error)' 
                   : 'Registration failed')
      };
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        syncCredentialsToNative(data.token);
        return { success: true };
      }
    } catch (error) {
      console.error('Login API error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 
                 (error.message === 'Network Error' || !error.response 
                   ? 'Server unreachable (Network Error)' 
                   : 'Invalid email or password')
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error', error);
    }
    localStorage.removeItem('token');
    setUser(null);
    syncCredentialsToNative('');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

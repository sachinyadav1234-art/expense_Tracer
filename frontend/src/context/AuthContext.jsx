import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

// AuthContext banate hain jisse logged in user ka data poore app me access ho sake
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync token to Capacitor native preference for background receiver
  const syncCredentialsToNative = (token) => {
    const isNative = window.Capacitor?.isNative || (window.Capacitor && window.Capacitor.Plugins);
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
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
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
      const res = await api.post('/auth/register', { name, email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        syncCredentialsToNative(res.data.token);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        syncCredentialsToNative(res.data.token);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid email or password'
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
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

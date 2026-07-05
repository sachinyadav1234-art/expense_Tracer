import axios from 'axios';

// Dynamically determine the base URL
const getBaseURL = () => {
  const savedURL = localStorage.getItem('server_url');
  if (savedURL) return savedURL;
  
  // Default to emulator IP if running inside Capacitor on native, otherwise production backend URL
  const isNative = window.Capacitor?.isNative || (window.Capacitor && window.Capacitor.Plugins);
  if (isNative) {
    return 'http://10.0.2.2:5000/api';
  }
  return import.meta.env.VITE_API_URL || 'https://expense-tracer-8i63.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Sync token and dynamically update baseURL for every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Update base URL dynamically if it was updated in settings
  const currentBase = localStorage.getItem('server_url') || (
    (window.Capacitor?.isNative || (window.Capacitor && window.Capacitor.Plugins)) 
      ? 'http://10.0.2.2:5000/api' 
      : (import.meta.env.VITE_API_URL || 'https://expense-tracer-8i63.onrender.com/api')
  );
  config.baseURL = currentBase;
  
  return config;
});

export default api;
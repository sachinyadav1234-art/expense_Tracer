import axios from 'axios';

const checkIsLocal = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === '[::1]' || 
         hostname === '::1' ||
         hostname.endsWith('.local') ||
         /^192\.168\./.test(hostname) ||
         /^10\./.test(hostname) ||
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
};

// Dynamically determine the base URL
const getBaseURL = () => {
  let savedURL = localStorage.getItem('server_url');
  const isLocal = checkIsLocal();
  
  if (isLocal && savedURL && savedURL.includes('onrender.com')) {
    localStorage.removeItem('server_url');
    savedURL = null;
  }
  
  if (savedURL) return savedURL;
  
  // Default to emulator IP if running inside Capacitor on native, otherwise production backend URL
  const isNative = !!window.Capacitor?.isNative;
  if (isNative) {
    return 'http://10.0.2.2:5000/api';
  }
  if (isLocal) {
    return `http://${window.location.hostname || 'localhost'}:5000/api`;
  }
  return import.meta.env.VITE_API_URL || 'https://expense-tracer-8i63.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  
  let savedURL = localStorage.getItem('server_url');
  const isLocal = checkIsLocal();
  if (isLocal && savedURL && savedURL.includes('onrender.com')) {
    localStorage.removeItem('server_url');
    savedURL = null;
  }
  
  const isNative = !!window.Capacitor?.isNative;
  const currentBase = savedURL || (
    isNative 
      ? 'http://10.0.2.2:5000/api' 
      : isLocal
        ? `http://${window.location.hostname || 'localhost'}:5000/api`
        : (import.meta.env.VITE_API_URL || 'https://expense-tracer-8i63.onrender.com/api')
  );
  config.baseURL = currentBase;
  console.log('[API] Request to:', config.url, 'with baseURL:', config.baseURL);
  
  return config;
});

export default api;
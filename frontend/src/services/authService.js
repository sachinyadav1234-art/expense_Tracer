import api from './api';

export const authService = {
  register: async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    return res.data;
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  }
};

export default authService;

import api from './api';

export const transactionService = {
  getTransactions: async (params) => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },

  getSummary: async () => {
    const res = await api.get('/transactions/summary');
    return res.data;
  },

  createTransaction: async (data) => {
    const res = await api.post('/transactions', data);
    return res.data;
  },

  updateTransaction: async (id, data) => {
    const res = await api.put(`/transactions/${id}`, data);
    return res.data;
  },

  deleteTransaction: async (id) => {
    const res = await api.delete(`/transactions/${id}`);
    return res.data;
  },

  autoDetectTransaction: async (text) => {
    const res = await api.post('/transactions/auto-detect', { text });
    return res.data;
  }
};

export default transactionService;

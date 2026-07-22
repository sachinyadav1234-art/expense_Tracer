import api from './api';

export const groupService = {
  getGroups: async () => {
    const res = await api.get('/groups');
    return res.data;
  },

  getGroupById: async (id) => {
    const res = await api.get(`/groups/${id}`);
    return res.data;
  },

  createGroup: async (data) => {
    const res = await api.post('/groups', data);
    return res.data;
  },

  addGroupExpense: async (groupId, data) => {
    const res = await api.post(`/groups/${groupId}/expenses`, data);
    return res.data;
  },

  deleteGroupExpense: async (groupId, expenseId) => {
    const res = await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
    return res.data;
  }
};

export default groupService;

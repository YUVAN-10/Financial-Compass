import api from './api';

export const getRecurringTransactions = async () => {
  const response = await api.get('/api/recurring-transactions');
  return response.data;
};

export const addRecurringTransaction = async (data) => {
  const response = await api.post('/api/recurring-transactions', data);
  return response.data;
};

export const updateRecurringTransaction = async (id, data) => {
  const res = await api.put(`/api/recurring-transactions/${id}`, data);
  return res.data;
};

export const deleteRecurringTransaction = async (id) => {
  const response = await api.delete(`/api/recurring-transactions/${id}`);
  return response.data;
};

export const payRecurringTransaction = async (id) => {
  const response = await api.post(`/api/recurring-transactions/${id}/pay`);
  return response.data;
};
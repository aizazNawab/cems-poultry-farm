import axios from 'axios';

const API_URL = 'https://qaiser-farm-api.onrender.com/api';

// Customer APIs
export const getCustomers = () => {
  return axios.get(`${API_URL}/customers`);
};

export const findCustomer = (truckNumber) => {
  return axios.get(`${API_URL}/customers/find`, {
    params: { truckNumber }
  });
};

export const createCustomer = (data) => {
  return axios.post(`${API_URL}/customers`, data);
};

export const updateCustomer = (id, data) => {
  return axios.put(`${API_URL}/customers/${id}`, data);
};

// Entry APIs
export const getPendingEntries = () => {
  return axios.get(`${API_URL}/entries/pending`);
};

export const findEntry = (truckNumber) => {
  return axios.get(`${API_URL}/entries/find`, {
    params: { truckNumber }
  });
};

export const verifyPin = (pin) =>
  axios.post(`${API_URL}/verify-pin`, { pin });

export const createEntry = (data) => {
  return axios.post(`${API_URL}/entries`, data);
};

export const deleteEntry = (id) => {
  return axios.delete(`${API_URL}/entries/${id}`);
};

// Transaction APIs
export const getTransactions = (params) => {
  return axios.get(`${API_URL}/transactions`, { params });
};

export const createTransaction = (data) => {
  return axios.post(`${API_URL}/transactions`, data);
};

export const updateTransaction = (id, data) => {
  return axios.put(`${API_URL}/transactions/${id}`, data);
};

export const deleteTransaction = (id) => {
  return axios.delete(`${API_URL}/transactions/${id}`);
};
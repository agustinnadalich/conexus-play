import axios from 'axios';
import { API_BASE } from '@/api/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const uploadFile = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData);
};

export const getEvents = () => api.get('/events');

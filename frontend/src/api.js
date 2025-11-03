// frontend/src/api.js
import axios from 'axios';
import { session } from '@/store/userStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(config => {
  const token = session.value?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;
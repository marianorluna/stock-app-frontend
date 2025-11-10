import axios from 'axios';

const apiBaseUrl =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim().length > 0
    ? import.meta.env.VITE_API_URL
    : '/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockcontrol_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
  }
  return config;
});

export default apiClient;


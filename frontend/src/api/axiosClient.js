import axios from 'axios';
import { useAuthStore } from '../context/authStore.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const originalRequest = error.config;

    const isAuthRequest = ['/auth/login', '/auth/register', '/auth/verify-email', '/auth/resend-code', '/auth/refresh'].some((path) =>
      originalRequest?.url?.includes(path)
    );

    if (error.response?.status === 401 && !isAuthRequest && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw new Error('Missing refresh token');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return axiosClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;

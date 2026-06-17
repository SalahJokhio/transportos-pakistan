import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401: try once, then logout
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const newAccessToken = (res.data as any).accessToken;
          const newRefreshToken = (res.data as any).refreshToken;

          localStorage.setItem('accessToken', newAccessToken);
          if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

          // Update Zustand store without importing it (avoids circular deps)
          const event = new CustomEvent('auth:token-refreshed', { detail: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
          window.dispatchEvent(event);

          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return api(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          // Clear tokens and force re-login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(new Error('Session expired. Please login again.'));
        } finally {
          isRefreshing = false;
        }
      }
    }

    const message = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  },
);

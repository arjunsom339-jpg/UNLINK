import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: Attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('unilink_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Auto-refresh on 401 ────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
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

      const refreshToken = localStorage.getItem('unilink_refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        // Clear auth state and redirect to login
        localStorage.removeItem('unilink_access_token');
        localStorage.removeItem('unilink_refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/refresh`,
          { refreshToken }
        );

        localStorage.setItem('unilink_access_token', data.data.accessToken);
        localStorage.setItem('unilink_refresh_token', data.data.refreshToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;

        processQueue(null, data.data.accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('unilink_access_token');
        localStorage.removeItem('unilink_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Account state redirection handling
    if (error.response?.status === 403) {
      const code = error.response.data?.code;
      if (code === 'ACCOUNT_PENDING_VERIFICATION' && window.location.pathname !== '/pending-verification') {
        window.location.href = '/pending-verification';
      } else if (code === 'ACCOUNT_SUSPENDED' && window.location.pathname !== '/suspended') {
        window.location.href = '/suspended';
      } else if (code === 'ACCOUNT_BANNED' && window.location.pathname !== '/banned') {
        window.location.href = '/banned';
      } else if (code === 'ROLE_FORBIDDEN' && window.location.pathname !== '/unauthorized') {
        window.location.href = '/unauthorized';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

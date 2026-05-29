import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';

// Create axios instance with credentials support for HTTP-only cookies
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required to send/receive HTTP-only cookies
});

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // /auth/me is a session probe used by AuthProvider on every page (including
      // public ones like the landing). Letting it redirect would kick anonymous
      // visitors off public pages — let AuthProvider handle the null-user state.
      const isAuthProbe = (error.config?.url ?? '').includes('/auth/me');

      if (typeof window !== 'undefined' && !isAuthProbe) {
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;



import axios from 'axios';

/**
 * Centralized Axios API client instance
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token if present in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: standard unwrap & safe 401 handling
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // If 401 Unauthorized occurs on protected routes (not during login attempt),
    // trigger a custom event so the application auth context can sync safely without loops.
    if (status === 401 && !url.includes('/auth/login')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    const customError = {
      message:
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred',
      statusCode: status || 500,
      errors: error.response?.data?.errors || null,
      data: error.response?.data || null,
    };

    return Promise.reject(customError);
  }
);

export default apiClient;

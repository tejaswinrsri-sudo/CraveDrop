import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentAuthToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  currentAuthToken = token;
}

api.interceptors.request.use(async (config) => {
  if (currentAuthToken) {
    config.headers.Authorization = `Bearer ${currentAuthToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standard error formatting
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

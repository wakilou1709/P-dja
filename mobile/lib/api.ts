import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        await clearTokens();
        router.replace('/login');
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        await SecureStore.setItemAsync('accessToken', data.accessToken);
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        await clearTokens();
        router.replace('/login');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync('accessToken', accessToken);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

export async function getAccessToken() {
  return SecureStore.getItemAsync('accessToken');
}

export const authApi = {
  register: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data as { accessToken: string; refreshToken: string; user: any };
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    return response.data as { accessToken: string; refreshToken: string; user: any };
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    await api.post('/auth/logout').catch(() => {});
  },
};

export const examsApi = {
  getAll: async (filters?: Record<string, unknown>) => {
    const response = await api.get('/exams/list', { params: filters });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/exams/${id}`);
    return response.data;
  },
  getSubjects: async () => {
    const response = await api.get('/exams/subjects');
    return response.data;
  },
};

export const quizApi = {
  getQuestions: async (params: Record<string, unknown>) => {
    const response = await api.get('/quiz/questions', { params });
    return response.data;
  },
  startAttempt: async (data: Record<string, unknown>) => {
    const response = await api.post('/quiz/attempts', data);
    return response.data;
  },
  submitAttempt: async (attemptId: string, data: Record<string, unknown>) => {
    const response = await api.post(`/quiz/attempts/${attemptId}/submit`, data);
    return response.data;
  },
  getMyAttempts: async () => {
    const response = await api.get('/quiz/attempts/my');
    return response.data;
  },
  getMyProgress: async () => {
    const response = await api.get('/quiz/progress');
    return response.data;
  },
};

export const subscriptionApi = {
  getMySubscription: async () => {
    const response = await api.get('/subscriptions/me');
    return response.data;
  },
  checkAccess: async () => {
    const response = await api.get('/subscriptions/check');
    return response.data;
  },
  initiatePayment: async (data: { plan: string; provider: string; phoneNumber: string; promoCode?: string }) => {
    const response = await api.post('/subscriptions/initiate', data);
    return response.data;
  },
  verifyOtp: async (data: { transactionId: string; otpCode: string }) => {
    const response = await api.post('/subscriptions/verify', data);
    return response.data;
  },
};

export const usersApi = {
  getStats: async () => {
    const response = await api.get('/users/me/stats');
    return response.data;
  },
};

export default api;

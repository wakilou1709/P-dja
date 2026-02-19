import axios from 'axios';
import { API_URL, ROUTES } from './constants';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
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

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      if (!refreshToken) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = ROUTES.LOGIN;
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = ROUTES.LOGIN;
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  login: async (data: any) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const examsApi = {
  getAll: async (filters?: any) => {
    const response = await api.get('/exams/list', { params: filters });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/exams/${id}`);
    return response.data;
  },
  getHierarchy: async () => {
    const response = await api.get('/exams/hierarchy');
    return response.data;
  },
  getUniversities: async () => {
    const response = await api.get('/exams/universities');
    return response.data;
  },
  getFaculties: async (university?: string) => {
    const response = await api.get('/exams/faculties', { params: { university } });
    return response.data;
  },
  getSubjects: async () => {
    const response = await api.get('/exams/subjects');
    return response.data;
  },
  getYears: async () => {
    const response = await api.get('/exams/years');
    return response.data;
  },
};

export const adminApi = {
  // Users
  getUsers: async (filters?: any) => {
    const response = await api.get('/admin/users', { params: filters });
    return response.data;
  },
  getUserStats: async () => {
    const response = await api.get('/admin/users/stats');
    return response.data;
  },
  getUserDetails: async (id: string) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  updateUserRole: async (id: string, role: string) => {
    const response = await api.patch(`/admin/users/${id}/role`, { role });
    return response.data;
  },
  updateUserStatus: async (id: string, status: string, reason?: string) => {
    const response = await api.patch(`/admin/users/${id}/status`, { status, reason });
    return response.data;
  },
  getUserActivity: async (id: string) => {
    const response = await api.get(`/admin/users/${id}/activity`);
    return response.data;
  },

  // Exams
  createExam: async (data: any) => {
    const response = await api.post('/admin/exams', data);
    return response.data;
  },
  updateExam: async (id: string, data: any) => {
    const response = await api.patch(`/admin/exams/${id}`, data);
    return response.data;
  },
  deleteExam: async (id: string) => {
    const response = await api.delete(`/admin/exams/${id}`);
    return response.data;
  },
  addQuestions: async (examId: string, questions: any[]) => {
    const response = await api.post(`/admin/exams/${examId}/questions`, { questions });
    return response.data;
  },
  getExamStats: async () => {
    const response = await api.get('/admin/exams/stats');
    return response.data;
  },
  getPopularExams: async (limit?: number) => {
    const response = await api.get('/admin/exams/popular', { params: { limit } });
    return response.data;
  },

  // Finance
  getSubscriptions: async (filters?: any) => {
    const response = await api.get('/admin/finance/subscriptions', { params: filters });
    return response.data;
  },
  getTransactions: async (filters?: any) => {
    const response = await api.get('/admin/finance/transactions', { params: filters });
    return response.data;
  },
  getFinanceStats: async () => {
    const response = await api.get('/admin/finance/stats');
    return response.data;
  },
  getRevenueChart: async (period?: string) => {
    const response = await api.get('/admin/finance/revenue', { params: { period } });
    return response.data;
  },

  validateTransaction: async (id: string) => {
    const response = await api.patch(`/admin/finance/transactions/${id}/validate`);
    return response.data;
  },

  // Promo codes
  getPromoCodes: async () => {
    const response = await api.get('/admin/promo/codes');
    return response.data;
  },
  createPromoCode: async (data: { userId: string; code?: string }) => {
    const response = await api.post('/admin/promo/codes', data);
    return response.data;
  },
  togglePromoCode: async (id: string) => {
    const response = await api.patch(`/admin/promo/codes/${id}/toggle`);
    return response.data;
  },

  // Questions
  questions: {
    getAll: async (params?: any) => {
      const response = await api.get('/admin/questions', { params });
      return response.data;
    },
    create: async (data: any) => {
      const response = await api.post('/admin/questions', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await api.patch(`/admin/questions/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/admin/questions/${id}`);
      return response.data;
    },
    generate: async (data: any) => {
      const response = await api.post('/admin/questions/generate', data);
      return response.data;
    },
    bulkCreate: async (data: any) => {
      const response = await api.post('/admin/questions/bulk', data);
      return response.data;
    },
  },

  // Analytics
  getDashboardStats: async () => {
    const response = await api.get('/admin/analytics/dashboard');
    return response.data;
  },
  getUserGrowth: async (period?: string) => {
    const response = await api.get('/admin/analytics/user-growth', { params: { period } });
    return response.data;
  },
  getRevenueChartData: async (period?: string) => {
    const response = await api.get('/admin/analytics/revenue-chart', { params: { period } });
    return response.data;
  },
  getPopularExamsAnalytics: async (limit?: number) => {
    const response = await api.get('/admin/analytics/popular-exams', { params: { limit } });
    return response.data;
  },
};

export const examConfigApi = {
  getAll: async (): Promise<Record<string, any[]>> => {
    const response = await api.get('/admin/exam-config');
    return response.data;
  },
  seed: async () => {
    const response = await api.post('/admin/exam-config/seed');
    return response.data;
  },
  create: async (data: { category: string; value: string; label: string; description?: string; extra?: any }) => {
    const response = await api.post('/admin/exam-config', data);
    return response.data;
  },
  update: async (id: string, data: { label?: string; description?: string; value?: string; extra?: any }) => {
    const response = await api.patch(`/admin/exam-config/${id}`, data);
    return response.data;
  },
  remove: async (id: string) => {
    const response = await api.delete(`/admin/exam-config/${id}`);
    return response.data;
  },
};

export const quizApi = {
  getQuestions: async (params: any) => {
    const response = await api.get('/quiz/questions', { params });
    return response.data;
  },
  startAttempt: async (data: any) => {
    const response = await api.post('/quiz/attempts', data);
    return response.data;
  },
  submitAttempt: async (attemptId: string, data: any) => {
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

export const promoApi = {
  validateCode: async (code: string) => {
    const response = await api.get(`/promo/validate/${code}`);
    return response.data;
  },
  getMyCode: async () => {
    const response = await api.get('/promo/my-code');
    return response.data;
  },
  getMyDashboard: async () => {
    const response = await api.get('/promo/dashboard');
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

export default api;

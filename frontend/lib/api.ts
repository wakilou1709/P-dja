import axios from 'axios';
import { API_URL, ROUTES } from './constants';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Promise partagée pour éviter les refresh simultanés (race condition)
// Si plusieurs requêtes reçoivent un 401 en même temps, une seule appelle /refresh
let refreshingPromise: Promise<string> | null = null;

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  // Garder les données non-auth (pays sélectionné, etc.) — ne pas tout effacer
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = ROUTES.LOGIN;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        // Si un refresh est déjà en cours, attendre son résultat
        if (!refreshingPromise) {
          refreshingPromise = axios
            .post(`${API_URL}/api/auth/refresh`, { refreshToken })
            .then(({ data }) => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
              }
              return data.accessToken;
            })
            .finally(() => { refreshingPromise = null; });
        }

        const newToken = await refreshingPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export type AnnouncementType = 'EXAM_DATE' | 'REGISTRATION' | 'INFO' | 'ALERT';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  countries: string[];
  color: string;
  link: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const announcementsApi = {
  getPublic: async (country?: string) => {
    const response = await api.get('/announcements', { params: country ? { country } : {} });
    return response.data as Announcement[];
  },
  // admin
  getAll: async () => {
    const response = await api.get('/admin/announcements');
    return response.data as Announcement[];
  },
  create: async (data: Partial<Announcement>) => {
    const response = await api.post('/admin/announcements', data);
    return response.data as Announcement;
  },
  update: async (id: string, data: Partial<Announcement>) => {
    const response = await api.patch(`/admin/announcements/${id}`, data);
    return response.data as Announcement;
  },
  delete: async (id: string) => {
    await api.delete(`/admin/announcements/${id}`);
  },
};

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
  sync: async (since?: string) => {
    const response = await api.get('/exams/sync', { params: since ? { since } : {} });
    return response.data as { exams: any[]; total: number; syncedAt: string };
  },
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
  getPrepClasses: async () => {
    const response = await api.get('/exams/prep-classes');
    return response.data;
  },
  getPrepClassExams: async (id: string, prepYear?: number) => {
    const response = await api.get(`/exams/prep-classes/${id}/exams`, { params: { prepYear } });
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
  uploadExamPdf: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/exams/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as { pdfUrl: string; content: any; correction: any; rawTextLength: number; isScanned: boolean };
  },
  uploadAndCreateExam: async (file: File, country = 'BF') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('country', country);
    const response = await api.post('/admin/exams/upload-complete', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });
    return response.data as { exam: any; hasCorrection: boolean };
  },
  generateCorrection: async (examId: string) => {
    const response = await api.post(`/admin/exams/${examId}/generate-correction`);
    return response.data as { fullCorrection: string; sections: any[]; generatedAt: string; model: string };
  },
  analyzeBatch: async (files: File[], onProgress?: (loaded: number, total: number) => void) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const response = await api.post('/admin/exams/analyze-batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
      onUploadProgress: onProgress ? (e) => onProgress(e.loaded, e.total ?? 1) : undefined,
    });
    return response.data as Array<{
      fileName: string;
      status: 'new' | 'duplicate' | 'similar' | 'metadata_match' | 'error';
      duplicateOf: { id: string; title: string; type: string; year: number; university: string } | null;
      metadata: { title: string; type: string; subject: string; year: number; series: string | null; university: string; faculty: string | null; niveau: string | null; duration: number | null };
      content: any;
      contentHash: string | null;
      isScanned: boolean;
      error?: string;
    }>;
  },
  importBatch: async (items: any[], batchStats?: {
    totalAnalyzed: number; newCount: number; similarCount: number;
    duplicateCount: number; errorCount: number; rejectedCount: number;
  }, country = 'BF') => {
    const response = await api.post('/admin/exams/import-batch', { items, batchStats, country }, { timeout: 600000 });
    return response.data as Array<{ exam: any; hasCorrection: boolean }>;
  },
  fixUniversity: async () => {
    const response = await api.post('/admin/exams/fix-university');
    return response.data as { checked: number; fixed: number };
  },
  fixFaculties: async () => {
    const response = await api.post('/admin/exams/fix-faculties');
    return response.data as { groupsMerged: number; duplicatesRemoved: number; examsUpdated: number };
  },
  getImportBatches: async () => {
    const response = await api.get('/admin/exams/import-batches');
    return response.data as {
      batches: Array<{
        id: string; createdAt: string;
        totalAnalyzed: number; newCount: number; similarCount: number;
        duplicateCount: number; errorCount: number; rejectedCount: number;
        importedCount: number; withCorrection: number;
      }>;
      totals: {
        totalAnalyzed: number; newCount: number; similarCount: number;
        duplicateCount: number; errorCount: number; rejectedCount: number;
        importedCount: number; withCorrection: number;
      };
    };
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

  // Videos
  videos: {
    getAll: async (params?: any) => {
      const response = await api.get('/admin/videos', { params });
      return response.data;
    },
    getStats: async () => {
      const response = await api.get('/admin/videos/stats');
      return response.data;
    },
    create: async (data: any) => {
      const response = await api.post('/admin/videos', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await api.patch(`/admin/videos/${id}`, data);
      return response.data;
    },
    remove: async (id: string) => {
      const response = await api.delete(`/admin/videos/${id}`);
      return response.data;
    },
    getCategories: async () => {
      const response = await api.get('/admin/videos/categories');
      return response.data;
    },
    createCategory: async (data: any) => {
      const response = await api.post('/admin/videos/categories', data);
      return response.data;
    },
    updateCategory: async (id: string, data: any) => {
      const response = await api.patch(`/admin/videos/categories/${id}`, data);
      return response.data;
    },
    removeCategory: async (id: string) => {
      const response = await api.delete(`/admin/videos/categories/${id}`);
      return response.data;
    },
    uploadFile: async (file: File, onProgress?: (pct: number) => void) => {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post('/admin/videos/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      return response.data as { url: string; filename: string; size: number };
    },
  },

  // Classes Prépa
  prepClasses: {
    getAll: async () => {
      const response = await api.get('/admin/prep-classes');
      return response.data;
    },
    getById: async (id: string) => {
      const response = await api.get(`/admin/prep-classes/${id}`);
      return response.data;
    },
    create: async (data: { name: string; city: string; region?: string; description?: string }) => {
      const response = await api.post('/admin/prep-classes', data);
      return response.data;
    },
    update: async (id: string, data: { name?: string; city?: string; region?: string; description?: string }) => {
      const response = await api.patch(`/admin/prep-classes/${id}`, data);
      return response.data;
    },
    remove: async (id: string) => {
      const response = await api.delete(`/admin/prep-classes/${id}`);
      return response.data;
    },
    createExam: async (prepClassId: string, data: any) => {
      const response = await api.post(`/admin/prep-classes/${prepClassId}/exams`, data);
      return response.data;
    },
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

export const videosApi = {
  getCategories: async () => {
    const response = await api.get('/videos/categories');
    return response.data;
  },
  getVideos: async (params?: { categoryId?: string; search?: string; featured?: boolean }) => {
    const response = await api.get('/videos', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/videos/${id}`);
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

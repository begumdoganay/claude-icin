import axios from 'axios';
import { API_URL } from '@/constants';
import type { 
  User, 
  Wallet, 
  Receipt, 
  UserLevel, 
  Achievement, 
  UserAchievement,
  Challenge,
  Referral,
  AuthResponse,
  ApiResponse 
} from '@/types';

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  getProfile: () =>
    api.get<ApiResponse<User>>('/auth/profile'),
};

// Wallet API
export const walletApi = {
  getWallet: () =>
    api.get<ApiResponse<Wallet>>('/wallet'),
  
  getTransactions: (limit = 50, offset = 0) =>
    api.get<ApiResponse<any>>('/wallet/transactions', { params: { limit, offset } }),
};

// Receipt API
export const receiptApi = {
  uploadReceipt: (formData: FormData) =>
    api.post<ApiResponse<Receipt>>('/receipts/my-receipt/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getMyReceipts: (status?: string, limit = 50, offset = 0) =>
    api.get<ApiResponse<{ receipts: Receipt[]; total: number }>>('/receipts/my-receipts', {
      params: { status, limit, offset },
    }),
  
  getReceiptById: (id: string) =>
    api.get<ApiResponse<Receipt>>(`/receipts/${id}`),
};

// Gamification API
export const gamificationApi = {
  getLevel: () =>
    api.get<ApiResponse<{ userLevel: UserLevel }>>('/gamification/level'),
  
  getAchievements: () =>
    api.get<ApiResponse<{ unlocked: UserAchievement[]; locked: Achievement[]; stats: any }>>('/gamification/achievements'),
  
  getChallenges: () =>
    api.get<ApiResponse<{ active: Challenge[]; user: any[] }>>('/gamification/challenges'),
  
  createReferral: () =>
    api.post<ApiResponse<{ referral: Referral }>>('/gamification/referral'),
  
  getReferrals: () =>
    api.get<ApiResponse<{ referrals: Referral[]; stats: any }>>('/gamification/referrals'),
  
  checkReferralCode: (code: string) =>
    api.get<ApiResponse<any>>(`/gamification/referral/${code}`),
  
  getLeaderboard: (period = 'all-time', limit = 100) =>
    api.get<ApiResponse<any>>('/gamification/leaderboard', { params: { period, limit } }),
};

// Market API
export const marketApi = {
  getPrice: () =>
    api.get<ApiResponse<any>>('/market/price'),
  
  getStats: () =>
    api.get<ApiResponse<any>>('/market/stats'),
};

export default api;
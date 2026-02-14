export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  WALLET: '/wallet',
  RECEIPTS: '/receipts',
  ACHIEVEMENTS: '/achievements',
  CHALLENGES: '/challenges',
  LEADERBOARD: '/leaderboard',
  PROFILE: '/profile',
};

export const LEVEL_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
  diamond: 10000,
};

export const LEVEL_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};
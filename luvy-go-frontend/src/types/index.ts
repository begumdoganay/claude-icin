export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  lockedBalance: number;
  totalBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  userId: string;
  merchantId: string;
  totalAmount: number;
  luvyEarned: number;
  receiptDate: string;
  status: 'pending' | 'approved' | 'rejected';
  isPfand: boolean;
  imageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserLevel {
  id: string;
  userId: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  currentXP: number;
  totalLuvyEarned: number;
  receiptsSubmitted: number;
  consecutiveDays: number;
  lastActiveDate: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'receipt' | 'spending' | 'streak' | 'referral' | 'special';
  icon?: string;
  requirement: any;
  reward: any;
  isActive: boolean;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  progress: number;
  Achievement?: Achievement;
}

export interface Challenge {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  category: 'receipt' | 'spending' | 'merchant' | 'social';
  requirement: any;
  reward: any;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId?: string;
  referralCode: string;
  status: 'pending' | 'completed' | 'expired';
  referrerReward: number;
  referredReward: number;
  completedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
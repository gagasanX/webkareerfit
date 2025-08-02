// /src/types/index.ts
// 🚀 COMPLETE TYPE DEFINITIONS

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string | null;
  isAdmin: boolean;
  isAffiliate: boolean;
  affiliateCode?: string | null;
  referredBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  assessments?: Assessment[];
  affiliateStats?: AffiliateStats;
}

export interface Assessment {
  id: string;
  type: string;
  status: string;
  tier: string;
  createdAt: Date;
  updatedAt?: Date;
  data?: any;
  price?: number;
  payment?: Payment | null;
  currentStep?: number;
  totalSteps?: number;
  userId: string;
  manualProcessing?: boolean;
}

export interface Payment {
  id: string;
  status: string;
  method: string;
  amount: number;
  gatewayPaymentId?: string;
  assessmentId: string;
  userId: string;
  couponId?: string;
  coupon?: Coupon;
  idempotencyKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  maxDiscount?: number | null;
  currentUses: number;
  maxUses: number;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AffiliateStats {
  id: string;
  userId: string;
  totalReferrals: number;
  totalEarnings: number;
  totalPaid: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Referral {
  id: string;
  affiliateId: string;
  userName: string;
  email: string;
  assessmentId: string;
  assessmentType: string;
  paymentId: string;
  status: string;
  commission: number;
  paidOut: boolean;
  createdAt?: Date;
}

// Assessment types definitions with labels and descriptions
export const assessmentTypes = [
  {
    id: 'fjrl',
    label: 'First Job Readiness Level',
    description: 'Ideal for fresh graduates and those entering the workforce',
    icon: '🚀',
    color: '#38b6ff'
  },
  {
    id: 'ijrl',
    label: 'Ideal Job Readiness Level',
    description: 'Find the perfect career match for your skills and personality',
    icon: '✨',
    color: '#7e43f1'
  },
  {
    id: 'cdrl',
    label: 'Career Development Readiness Level',
    description: 'Plan your growth path in your current career',
    icon: '📈',
    color: '#fcb3b3'
  },
  {
    id: 'ccrl',
    label: 'Career Comeback Readiness Level',
    description: 'Returning to work after a break? This assessment is for you',
    icon: '🔄',
    color: '#38b6ff'
  },
  {
    id: 'ctrl',
    label: 'Career Transition Readiness Level',
    description: 'Changing careers? Evaluate your transition readiness',
    icon: '🔀',
    color: '#7e43f1'
  },
  {
    id: 'rrl',
    label: 'Retirement Readiness Level',
    description: 'Plan your retirement transition effectively',
    icon: '🌴',
    color: '#fcb3b3'
  },
  {
    id: 'irl',
    label: 'Internship Readiness Level',
    description: 'Prepare for successful internship experiences',
    icon: '🎓',
    color: '#38b6ff'
  }
];

// Tier pricing constants
export const TIER_PRICES = {
  basic: 50,
  standard: 100,
  premium: 250,
} as const;

export type TierType = keyof typeof TIER_PRICES;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PricingResponse {
  originalPrice: number;
  finalPrice: number;
  discount: number;
  appliedCoupon?: {
    code: string;
    discount: number;
  };
  assessmentTier: string;
  paymentStatus: string;
}

export interface PaymentResponse {
  paymentId: string;
  status: string;
  paymentUrl?: string;
  gatewayId?: string;
  amount?: number;
}

// Form Types
export interface CouponApplicationData {
  assessmentId: string;
  couponCode: string;
}

export interface PaymentProcessData {
  assessmentId: string;
  paymentMethod: string;
  idempotencyKey: string;
}

// Utility Types
export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PaymentMethod = 'card' | 'fpx' | 'coupon' | 'pending';
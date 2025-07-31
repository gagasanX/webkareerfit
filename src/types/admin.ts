// /src/types/admin.ts
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  isClerk: boolean;
  isAffiliate: boolean;
  createdAt: string;
}

export interface AdminAuthResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

// ===== DASHBOARD TYPES =====
export interface DashboardStats {
  userCount: number;
  assessmentCount: number;
  paymentAmount: number;
  couponCount: number;
  recentAssessments: FormattedAssessment[];
  recentPayments: FormattedPayment[];
  dailyStats: DailyStats[];
}

export interface FormattedAssessment {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  userName: string;
}

export interface FormattedPayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  userName: string;
  assessmentType: string;
}

export interface DailyStats {
  date: string;
  users: number;
  assessments: number;
  revenue: number;
}

// ===== EMAIL TEMPLATE TYPES =====
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateInput {
  name: string;
  subject: string;
  htmlContent: string;
  active?: boolean;
}

export interface EmailTemplateUpdate {
  name?: string;
  subject?: string;
  htmlContent?: string;
  active?: boolean;
}

export interface EmailTemplatesResponse {
  templates: EmailTemplate[];
  pagination: PaginationInfo;
}

// ===== PAGINATION TYPES =====
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'asc' | 'desc';
  sortBy?: string;
}

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface ApiError {
  error: string;
  details?: any;
  code?: string;
}

// ===== AUDIT LOG TYPES =====
export interface AuditLogEntry {
  id: string;
  eventType: string;
  userId: string | null;
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ===== USER MANAGEMENT TYPES =====
export interface UserWithStats {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isAdmin: boolean;
  isClerk: boolean;
  isAffiliate: boolean;
  createdAt: string;
  _count: {
    assessments: number;
    payments: number;
  };
}

export interface UserUpdateData {
  name?: string;
  phone?: string;
  bio?: string;
  skills?: string;
  education?: string;
  experience?: string;
  isAdmin?: boolean;
  isClerk?: boolean;
  isAffiliate?: boolean;
}

// ===== ASSESSMENT TYPES =====
export interface AssessmentWithUser {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  tier: string;
  price: number;
  manualProcessing: boolean;
  assignedClerkId: string | null;
  assignedClerk: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  userId: string;
  userName: string;
  userEmail: string;
}

export interface AssessmentUpdateData {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  tier?: 'basic' | 'standard' | 'premium';
  assignedClerkId?: string | null;
  reviewNotes?: string;
  manualProcessing?: boolean;
}

// ===== PAYMENT TYPES =====
export interface PaymentWithDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
  referenceId: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string;
  assessmentId: string;
  assessmentTitle: string;
}

export interface RevenueStats {
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageTransactionValue: number;
  currency: string;
}

export interface PaymentMethodBreakdown {
  gateway: string;
  count: number;
  totalAmount: number;
}

// ===== COUPON TYPES =====
export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  maxDiscount: number | null;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    payments: number;
  };
}

export interface CouponInput {
  code: string;
  discountPercentage: number;
  maxDiscount?: number;
  expiresAt: string;
  maxUses?: number;
}

// ===== AFFILIATE TYPES =====
export interface AffiliatePerformance {
  id: string;
  userId: string;
  userName: string;
  email: string;
  affiliateCode: string;
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  pendingPayout: number;
  lastActive: string;
}

export interface AffiliateApplication {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  website: string | null;
  socialMedia: string | null;
  howPromote: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

// ===== VALIDATION ERROR TYPES =====
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationErrorResponse {
  error: string;
  details: ValidationError[];
}

// ===== RATE LIMITING TYPES =====
export interface RateLimitInfo {
  identifier: string;
  count: number;
  resetTime: number;
  limit: number;
  remaining: number;
}

// ===== SETTINGS TYPES =====
export interface SystemSetting {
  key: string;
  value: string;
  isJson: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingsUpdate {
  [key: string]: string | number | boolean | object;
}

// ===== CLERK TYPES =====
export interface ClerkWithStats {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  isClerk: boolean;
  role: string;
  _count: {
    assignedAssessments: number;
  };
}

// ===== ANALYTICS TYPES =====
export interface AnalyticsData {
  userMetrics: UserMetrics;
  assessmentMetrics: AssessmentMetrics;
  revenueMetrics: RevenueMetrics;
  conversionMetrics: ConversionMetrics;
}

export interface UserMetrics {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByDate: Array<{ date: string; count: number }>;
  usersByType: Array<{ type: string; count: number }>;
}

export interface AssessmentMetrics {
  totalAssessments: number;
  assessmentsToday: number;
  assessmentsThisWeek: number;
  assessmentsThisMonth: number;
  completionRate: number;
  assessmentsByDate: Array<{ date: string; count: number }>;
  assessmentsByType: Array<{ type: string; count: number }>;
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  averageOrderValue: number;
  revenueByDate: Array<{ date: string; amount: number }>;
  revenueByAssessmentType: Array<{ type: string; amount: number }>;
}

export interface ConversionMetrics {
  globalConversionRate: number;
  conversionBySource: Array<{ source: string; rate: number; count: number }>;
  conversionFunnel: Array<{ stage: string; count: number; rate: number }>;
  abandonmentRate: number;
}
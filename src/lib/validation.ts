import { z } from 'zod';

// ===== AUTHENTICATION SCHEMAS =====
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ===== USER MANAGEMENT SCHEMAS =====
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  isAdmin: z.boolean().default(false),
  isClerk: z.boolean().default(false),
  isAffiliate: z.boolean().default(false),
  phone: z.string().optional(),
  affiliateCode: z.string().min(3, 'Affiliate code must be at least 3 characters').optional(),
  affiliateType: z.enum(['individual', 'company']).default('individual'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  skills: z.string().max(1000, 'Skills must be less than 1000 characters').optional(),
  education: z.string().max(1000, 'Education must be less than 1000 characters').optional(),
  experience: z.string().max(2000, 'Experience must be less than 2000 characters').optional(),
  phone: z.string().optional(),
  affiliateCode: z.string().min(3, 'Affiliate code must be at least 3 characters').optional(),
  affiliateType: z.enum(['individual', 'company']).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['isAdmin', 'isClerk', 'isAffiliate']),
  value: z.boolean(),
});

// ===== PAGINATION SCHEMAS =====
export const paginationSchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ===== ADMIN DASHBOARD SCHEMAS =====
export const dashboardQuerySchema = z.object({
  range: z.enum(['today', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear', 'custom']).default('last30days'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeStats: z.enum(['true', 'false']).default('false'),
}).refine((data) => {
  if (data.range === 'custom') {
    return data.startDate && data.endDate;
  }
  return true;
}, {
  message: "Start date and end date are required for custom range",
  path: ["startDate"],
});

// ===== ANALYTICS SCHEMAS =====
export const analyticsQuerySchema = z.object({
  range: z.enum(['today', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear', 'custom']).default('last30days'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.enum(['all', 'users', 'assessments', 'revenue']).default('all'),
}).refine((data) => {
  if (data.range === 'custom') {
    return data.startDate && data.endDate;
  }
  return true;
}, {
  message: "Start date and end date are required for custom range",
  path: ["startDate"],
});

// ===== ASSESSMENT SCHEMAS =====
export const assessmentFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['all', 'pending', 'in_progress', 'completed', 'cancelled']).default('all'),
  type: z.enum(['all', 'ccrl', 'cdrl', 'ctrl', 'fjrl', 'ijrl', 'irl', 'rrl']).default('all'),
  tier: z.enum(['all', 'basic', 'standard', 'premium']).default('all'),
  assignedClerk: z.string().default('all'), // Can be 'all', 'unassigned', or clerk ID
  manualProcessing: z.enum(['all', 'true', 'false']).default('all'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'type', 'tier', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeStats: z.enum(['true', 'false']).default('false'),
});

export const updateAssessmentSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  tier: z.enum(['basic', 'standard', 'premium']).optional(),
  assignedClerkId: z.string().min(1).or(z.literal('unassign')).optional(),
  reviewNotes: z.string().max(2000, 'Review notes must be less than 2000 characters').optional(),
  manualProcessing: z.boolean().optional(),
  price: z.number().min(0, 'Price cannot be negative').max(10000, 'Price cannot exceed 10000').optional(),
});

export const bulkUpdateAssessmentSchema = z.object({
  assessmentIds: z.array(z.string().min(1)).min(1, 'At least one assessment ID is required').max(100, 'Cannot update more than 100 assessments at once'),
  action: z.enum(['assign_clerk', 'update_status', 'bulk_process']),
  clerkId: z.string().min(1).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
}).refine((data) => {
  if (data.action === 'assign_clerk') {
    return data.clerkId;
  }
  if (data.action === 'update_status') {
    return data.status;
  }
  return true;
}, {
  message: "Missing required field for the specified action",
});

// ===== PAYMENT SCHEMAS =====
export const paymentFilterSchema = z.object({
  page: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['all', 'successful', 'pending', 'failed', 'refunded']).default('all'),
  gateway: z.enum(['all', 'stripe', 'paypal', 'bank_transfer', 'billplz', 'toyyibpay']).default('all'),
});

export const paymentExportSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['all', 'successful', 'pending', 'failed', 'refunded']).default('all'),
  gateway: z.enum(['all', 'stripe', 'paypal', 'bank_transfer', 'billplz', 'toyyibpay']).default('all'),
});

// ===== COUPON SCHEMAS =====
export const createCouponSchema = z.object({
  code: z.string().min(3, 'Coupon code must be at least 3 characters').max(20, 'Coupon code must be less than 20 characters').regex(/^[A-Z0-9]+$/, 'Coupon code must contain only uppercase letters and numbers'),
  discountPercentage: z.number().min(1, 'Discount must be at least 1%').max(100, 'Discount cannot exceed 100%'),
  maxDiscount: z.number().min(0, 'Max discount cannot be negative').optional(),
  expiresAt: z.string().datetime('Invalid expiration date'),
  maxUses: z.number().min(1, 'Max uses must be at least 1').max(10000, 'Max uses cannot exceed 10000').default(100),
});

export const updateCouponSchema = z.object({
  code: z.string().min(3, 'Coupon code must be at least 3 characters').max(20, 'Coupon code must be less than 20 characters').regex(/^[A-Z0-9]+$/, 'Coupon code must contain only uppercase letters and numbers').optional(),
  discountPercentage: z.number().min(1, 'Discount must be at least 1%').max(100, 'Discount cannot exceed 100%').optional(),
  maxDiscount: z.number().min(0, 'Max discount cannot be negative').optional(),
  expiresAt: z.string().datetime('Invalid expiration date').optional(),
  maxUses: z.number().min(1, 'Max uses must be at least 1').max(10000, 'Max uses cannot exceed 10000').optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  assessmentPrice: z.number().min(0, 'Assessment price cannot be negative'),
});

// ===== EMAIL TEMPLATE SCHEMAS =====
export const createEmailTemplateSchema = z.object({
  name: z.string().min(3, 'Template name must be at least 3 characters').max(100, 'Template name must be less than 100 characters'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject must be less than 200 characters'),
  htmlContent: z.string().min(10, 'HTML content must be at least 10 characters').max(50000, 'HTML content is too long'),
  active: z.boolean().default(true),
});

export const updateEmailTemplateSchema = z.object({
  name: z.string().min(3, 'Template name must be at least 3 characters').max(100, 'Template name must be less than 100 characters').optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject must be less than 200 characters').optional(),
  htmlContent: z.string().min(10, 'HTML content must be at least 10 characters').max(50000, 'HTML content is too long').optional(),
  active: z.boolean().optional(),
});

export const testEmailSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  email: z.string().email('Invalid email address'),
  testData: z.record(z.any()).optional(), // Optional test data to populate template variables
});

// ===== AFFILIATE SCHEMAS =====
export const affiliateApplicationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters').max(20, 'Phone number must be less than 20 characters'),
  website: z.string().url('Invalid website URL').optional(),
  socialMedia: z.string().max(500, 'Social media info must be less than 500 characters').optional(),
  howPromote: z.string().min(50, 'Please provide at least 50 characters describing how you plan to promote').max(2000, 'Description must be less than 2000 characters'),
});

export const updateAffiliateApplicationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export const affiliateStatsSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  affiliateId: z.string().optional(),
});

// ===== COMMON VALIDATION HELPERS =====
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: "Start date must be before or equal to end date",
  path: ["endDate"],
});

// ===== ASSESSMENT CREATION SCHEMAS =====
export const createAssessmentSchema = z.object({
  type: z.enum(['ccrl', 'cdrl', 'ctrl', 'fjrl', 'ijrl', 'irl', 'rrl']),
  tier: z.enum(['basic', 'standard', 'premium']).default('basic'),
  price: z.number().min(0, 'Price cannot be negative').max(10000, 'Price cannot exceed 10000'),
  data: z.record(z.any()).optional(), // Assessment form data
  manualProcessing: z.boolean().default(false),
});

// ===== FILE UPLOAD SCHEMAS =====
export const fileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File size must be greater than 0').max(10 * 1024 * 1024, 'File size cannot exceed 10MB'), // 10MB limit
  fileType: z.string().min(1, 'File type is required'),
  allowedTypes: z.array(z.string()).default(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']),
}).refine((data) => {
  return data.allowedTypes.includes(data.fileType);
}, {
  message: "File type not allowed",
  path: ["fileType"],
});

// ===== SEARCH SCHEMAS =====
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query is too long'),
  type: z.enum(['users', 'assessments', 'payments', 'all']).default('all'),
  limit: z.coerce.number().min(1).max(50).default(10),
});

// ===== SYSTEM SETTINGS SCHEMAS =====
export const systemSettingSchema = z.object({
  key: z.string().min(1, 'Setting key is required').max(100, 'Setting key is too long'),
  value: z.string().min(1, 'Setting value is required').max(10000, 'Setting value is too long'),
  isJson: z.boolean().default(false),
});

// ===== RATE LIMITING SCHEMAS =====
export const rateLimitSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  maxRequests: z.number().min(1, 'Max requests must be at least 1').max(1000, 'Max requests cannot exceed 1000').default(60),
  windowMs: z.number().min(1000, 'Window must be at least 1 second').max(3600000, 'Window cannot exceed 1 hour').default(60000), // 1 minute default
});

// ===== EXPORT SCHEMAS =====
export const exportSchema = z.object({
  type: z.enum(['csv', 'excel', 'pdf']).default('csv'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  filters: z.record(z.any()).optional(),
  includeHeaders: z.boolean().default(true),
});

// Type exports for use in components
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type AssessmentFilter = z.infer<typeof assessmentFilterSchema>;
export type UpdateAssessmentData = z.infer<typeof updateAssessmentSchema>;
export type BulkUpdateAssessmentData = z.infer<typeof bulkUpdateAssessmentSchema>;
export type PaymentFilter = z.infer<typeof paymentFilterSchema>;
export type CreateCouponData = z.infer<typeof createCouponSchema>;
export type UpdateCouponData = z.infer<typeof updateCouponSchema>;
export type CreateEmailTemplateData = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateData = z.infer<typeof updateEmailTemplateSchema>;
export type TestEmailData = z.infer<typeof testEmailSchema>;
export type AffiliateApplicationData = z.infer<typeof affiliateApplicationSchema>;
export type CreateAssessmentData = z.infer<typeof createAssessmentSchema>;
export type SystemSettingData = z.infer<typeof systemSettingSchema>;
export type ExportData = z.infer<typeof exportSchema>;
// /src/lib/validation.ts
import { z } from 'zod';

// ===== EMAIL TEMPLATE VALIDATION =====
export const emailTemplateSchema = z.object({
  name: z.string()
    .min(1, "Template name is required")
    .max(100, "Template name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Template name can only contain letters, numbers, hyphens, and underscores"),
  
  subject: z.string()
    .min(1, "Email subject is required")
    .max(255, "Email subject must be less than 255 characters"),
  
  htmlContent: z.string()
    .min(1, "HTML content is required")
    .max(50000, "HTML content must be less than 50,000 characters"),
  
  active: z.boolean().default(true)
});

export const emailTemplateUpdateSchema = emailTemplateSchema.partial();

// ===== ADMIN DASHBOARD VALIDATION =====
export const dashboardQuerySchema = z.object({
  range: z.enum(['today', 'week', 'month', 'year']).default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// ===== USER VALIDATION =====
export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^(\+?6?01[0-46-9]-*[0-9]{7,8})$/).optional(),
  bio: z.string().max(1000).optional(),
  skills: z.string().max(500).optional(),
  education: z.string().max(500).optional(),
  experience: z.string().max(1000).optional(),
  isAdmin: z.boolean().optional(),
  isClerk: z.boolean().optional(),
  isAffiliate: z.boolean().optional()
});

// ===== PAGINATION VALIDATION =====
export const paginationSchema = z.object({
  page: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().max(255).optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
  sortBy: z.string().max(50).default('createdAt')
});

// ===== COUPON VALIDATION =====
export const couponSchema = z.object({
  code: z.string()
    .min(3, "Coupon code must be at least 3 characters")
    .max(20, "Coupon code must be less than 20 characters")
    .regex(/^[A-Z0-9]+$/, "Coupon code can only contain uppercase letters and numbers"),
  
  discountPercentage: z.number()
    .min(1, "Discount must be at least 1%")
    .max(100, "Discount cannot exceed 100%"),
  
  maxDiscount: z.number()
    .min(0, "Max discount cannot be negative")
    .max(10000, "Max discount is too high")
    .optional(),
  
  expiresAt: z.string().datetime("Invalid expiry date"),
  
  maxUses: z.number()
    .min(1, "Max uses must be at least 1")
    .max(100000, "Max uses is too high")
    .default(100)
});

// ===== ASSESSMENT VALIDATION =====
export const assessmentUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  tier: z.enum(['basic', 'standard', 'premium']).optional(),
  assignedClerkId: z.string().cuid().nullable().optional(),
  reviewNotes: z.string().max(2000).optional(),
  manualProcessing: z.boolean().optional()
});

// ===== SECURITY VALIDATION =====
export const idempotencyKeySchema = z.string()
  .min(10, "Idempotency key too short")
  .max(255, "Idempotency key too long")
  .regex(/^[a-zA-Z0-9-_]+$/, "Invalid idempotency key format");

// ===== EXPORT TYPES =====
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
export type EmailTemplateUpdate = z.infer<typeof emailTemplateUpdateSchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type AssessmentUpdate = z.infer<typeof assessmentUpdateSchema>;
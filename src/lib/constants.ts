// /src/lib/constants.ts
// CRITICAL: Removed conflicting ASSESSMENT_PRICES - use TIER_PRICES only

export const ASSESSMENT_TYPES = {
  FJRL: 'fjrl',
  IJRL: 'ijrl',
  CDRL: 'cdrl',
  CCRL: 'ccrl',
  CTRL: 'ctrl',
  RRL: 'rrl',
  IRL: 'irl',
} as const;

export const ASSESSMENT_TITLES = {
  [ASSESSMENT_TYPES.FJRL]: 'First Job Readiness Level',
  [ASSESSMENT_TYPES.IJRL]: 'Ideal Job Readiness Level',
  [ASSESSMENT_TYPES.CDRL]: 'Career Development Readiness Level',
  [ASSESSMENT_TYPES.CCRL]: 'Career Comeback Readiness Level',
  [ASSESSMENT_TYPES.CTRL]: 'Career Transition Readiness Level',
  [ASSESSMENT_TYPES.RRL]: 'Retirement Readiness Level',
  [ASSESSMENT_TYPES.IRL]: 'Internship Readiness Level',
} as const;

export const ASSESSMENT_DESCRIPTIONS = {
  [ASSESSMENT_TYPES.FJRL]: "The First Job Readiness Level (FJRL) evaluates a fresh graduate's preparedness for their first job. It assesses key competencies, self-awareness, and readiness for professional environments.",
  [ASSESSMENT_TYPES.IJRL]: "The Ideal Job Readiness Level (IJRL) evaluates a job seeker's preparedness to secure and succeed in their desired role. It helps individuals with minimal or some experience understand their current level of readiness.",
  [ASSESSMENT_TYPES.CDRL]: "The Career Development Readiness Level (CDRL) assesses an individual's preparedness for career advancement or growth within their current field.",
  [ASSESSMENT_TYPES.CCRL]: "The Career Comeback Readiness Level (CCRL) evaluates an individual's preparedness to return to the workforce or transition into a new role after a hiatus.",
  [ASSESSMENT_TYPES.CTRL]: "The Career Transition Readiness Level (CTRL) evaluates an individual's preparedness to make a significant career change, whether to a new industry, role, or work environment.",
  [ASSESSMENT_TYPES.RRL]: "The Retirement Readiness Level (RRL) assesses an individual's preparedness for retirement, focusing on their financial stability, emotional and mental readiness, future planning, and overall well-being.",
  [ASSESSMENT_TYPES.IRL]: "The Internship Readiness Level (IRL) assesses an individual's preparedness for entering the professional world through internships, focusing on their skills, adaptability, work ethic, and alignment with career goals.",
} as const;

// REMOVED: ASSESSMENT_PRICES - use TIER_PRICES from priceCalculation.ts instead

// Tier-related constants
export const TIER_NAMES = {
  basic: 'Basic Package',
  standard: 'Standard Package',
  premium: 'Premium Package',
} as const;

export const TIER_PROCESSING = {
  basic: 'ai',
  standard: 'manual',
  premium: 'manual',
} as const;

// Assessment status constants
export const ASSESSMENT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PENDING_REVIEW: 'pending_review',
  IN_REVIEW: 'in_review',
  CANCELLED: 'cancelled',
} as const;

// Payment status constants
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
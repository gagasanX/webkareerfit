// /src/lib/utils/priceCalculation.ts
// CRITICAL: Replace entire file with this - removes pricing conflicts

/**
 * TIER PRICING - SINGLE SOURCE OF TRUTH
 * This is the ONLY pricing system used throughout the application
 */
export const TIER_PRICES = {
  basic: 50,      // AI processing
  standard: 100,  // Manual processing
  premium: 250,   // Manual processing
} as const;

export type TierType = keyof typeof TIER_PRICES;

export interface DiscountCalculation {
  originalPrice: number;
  discountPercentage: number;
  discountAmount: number;
  finalPrice: number;
  savings: number;
}

/**
 * Get tier price - ONLY function needed for pricing
 */
export function getTierPrice(tier: string): number {
  const normalizedTier = tier.toLowerCase() as TierType;
  
  if (normalizedTier in TIER_PRICES) {
    return TIER_PRICES[normalizedTier];
  }
  
  console.warn(`Invalid tier '${tier}', defaulting to basic`);
  return TIER_PRICES.basic;
}

/**
 * Determine if tier requires manual processing
 */
export function isManualProcessingTier(tier: string): boolean {
  const normalizedTier = tier.toLowerCase();
  return normalizedTier === 'standard' || normalizedTier === 'premium';
}

/**
 * Calculate discount with proper floating point handling
 */
export function calculateDiscount(
  basePrice: number,
  discountPercentage: number,
  maxDiscount?: number | null
): DiscountCalculation {
  const price = Number(basePrice);
  const percentage = Number(discountPercentage);
  const maxDiscountNum = maxDiscount ? Number(maxDiscount) : null;
  
  if (isNaN(price) || isNaN(percentage) || price < 0 || percentage < 0 || percentage > 100) {
    throw new Error('Invalid price or discount percentage');
  }
  
  let discountAmount = Math.round((price * percentage) / 100 * 100) / 100;
  
  if (maxDiscountNum && discountAmount > maxDiscountNum) {
    discountAmount = maxDiscountNum;
  }
  
  let finalPrice = price - discountAmount;
  finalPrice = Math.max(0, Math.round(finalPrice * 100) / 100);
  discountAmount = Math.round(discountAmount * 100) / 100;
  
  return {
    originalPrice: Math.round(price * 100) / 100,
    discountPercentage: percentage,
    discountAmount,
    finalPrice,
    savings: discountAmount,
  };
}

/**
 * Format currency for display (Malaysian Ringgit)
 */
export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

/**
 * Validate coupon and return discount calculation
 */
export interface CouponValidation {
  isValid: boolean;
  message: string;
  discountCalculation?: DiscountCalculation;
}

export function validateCoupon(
  coupon: {
    discountPercentage: number;
    maxDiscount?: number | null;
    currentUses: number;
    maxUses: number;
    expiresAt: Date;
  },
  basePrice: number
): CouponValidation {
  // Check usage limit (FIXED: use correct schema properties)
  if (coupon.currentUses >= coupon.maxUses) {
    return {
      isValid: false,
      message: 'This coupon has reached its usage limit'
    };
  }
  
  if (new Date() > coupon.expiresAt) {
    return {
      isValid: false,
      message: 'This coupon has expired'
    };
  }
  
  try {
    const discountCalculation = calculateDiscount(
      basePrice,
      coupon.discountPercentage,
      coupon.maxDiscount
    );
    
    return {
      isValid: true,
      message: 'Coupon is valid',
      discountCalculation
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Invalid coupon configuration'
    };
  }
}

/**
 * Get assessment price based on tier (simplified)
 */
export function getAssessmentPrice(tier: string): number {
  return getTierPrice(tier);
}

/**
 * Determine processing type based on tier
 */
export function getProcessingType(tier: string): 'ai' | 'manual' {
  return isManualProcessingTier(tier) ? 'manual' : 'ai';
}
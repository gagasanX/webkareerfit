// /src/lib/utils/priceCalculation.ts - COMPLETE VERSION
export const TIER_PRICES = {
  basic: 50,
  standard: 100,
  premium: 250,
} as const;

export type TierType = keyof typeof TIER_PRICES;

export interface DiscountCalculation {
  originalPrice: number;
  discountPercentage: number;
  discountAmount: number;
  finalPrice: number;
  savings: number;
}

// EXISTING FUNCTIONS (keep as is)
export function getTierPrice(tier: string): number {
  const normalizedTier = tier.toLowerCase() as TierType;
  if (normalizedTier in TIER_PRICES) {
    return TIER_PRICES[normalizedTier];
  }
  console.warn(`Invalid tier '${tier}', defaulting to basic`);
  return TIER_PRICES.basic;
}

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

export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

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

// ADD MISSING FUNCTIONS that your code calls
export function getAssessmentBasePrice(assessmentType: string): number {
  // Default to basic tier pricing for assessment types
  return TIER_PRICES.basic;
}

export function getAssessmentPrice(tier: string): number {
  return getTierPrice(tier);
}

export function isManualProcessingTier(tier: string): boolean {
  const normalizedTier = tier.toLowerCase();
  return normalizedTier === 'standard' || normalizedTier === 'premium';
}

export function getProcessingType(tier: string): 'ai' | 'manual' {
  return isManualProcessingTier(tier) ? 'manual' : 'ai';
}
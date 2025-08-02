// /src/lib/utils/priceCalculation.ts - WITH DEBUG LOGS
// 🚀 COMPLETE PRICE CALCULATION UTILITIES

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

export interface CouponValidation {
  isValid: boolean;
  message: string;
  discountCalculation?: DiscountCalculation;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  maxDiscount?: number | null;
  currentUses: number;
  maxUses: number;
  expiresAt: Date;
}

/**
 * Get tier price - main pricing function
 */
export function getTierPrice(tier: string): number {
  console.log('💰 Getting tier price for:', tier);
  const normalizedTier = tier.toLowerCase() as TierType;
  
  if (normalizedTier in TIER_PRICES) {
    const price = TIER_PRICES[normalizedTier];
    console.log('💰 Tier price found:', price);
    return price;
  }
  
  console.warn(`⚠️ Invalid tier '${tier}', defaulting to basic`);
  return TIER_PRICES.basic;
}

/**
 * Calculate discount with proper rounding
 */
export function calculateDiscount(
  basePrice: number,
  discountPercentage: number,
  maxDiscount?: number | null
): DiscountCalculation {
  console.log('🧮 Calculating discount...');
  console.log('🧮 Input parameters:', {
    basePrice,
    discountPercentage,
    maxDiscount
  });
  
  const price = Number(basePrice);
  const percentage = Number(discountPercentage);
  const maxDiscountNum = maxDiscount ? Number(maxDiscount) : null;
  
  console.log('🧮 Parsed parameters:', {
    price,
    percentage,
    maxDiscountNum
  });
  
  if (isNaN(price) || isNaN(percentage) || price < 0 || percentage < 0 || percentage > 100) {
    console.error('❌ Invalid parameters for discount calculation');
    throw new Error('Invalid price or discount percentage');
  }
  
  // Calculate discount amount
  let discountAmount = Math.round((price * percentage) / 100 * 100) / 100;
  console.log('🧮 Raw discount amount:', discountAmount);
  
  // Apply max discount limit
  if (maxDiscountNum && discountAmount > maxDiscountNum) {
    console.log('🧮 Applying max discount limit:', maxDiscountNum);
    discountAmount = maxDiscountNum;
  }
  
  // Calculate final price
  let finalPrice = price - discountAmount;
  finalPrice = Math.max(0, Math.round(finalPrice * 100) / 100);
  discountAmount = Math.round(discountAmount * 100) / 100;
  
  const result = {
    originalPrice: Math.round(price * 100) / 100,
    discountPercentage: percentage,
    discountAmount,
    finalPrice,
    savings: discountAmount,
  };
  
  console.log('🧮 Discount calculation result:', result);
  return result;
}

/**
 * Validate coupon and calculate discount
 */
export function validateCoupon(
  coupon: Coupon,
  basePrice: number
): CouponValidation {
  console.log('🎫 Validating coupon...');
  console.log('🎫 Coupon details:', {
    code: coupon.code,
    discountPercentage: coupon.discountPercentage,
    maxDiscount: coupon.maxDiscount,
    currentUses: coupon.currentUses,
    maxUses: coupon.maxUses,
    expiresAt: coupon.expiresAt
  });
  console.log('🎫 Base price:', basePrice);
  
  // Check usage limit
  if (coupon.currentUses >= coupon.maxUses) {
    console.log('❌ Coupon usage limit reached');
    return {
      isValid: false,
      message: 'This coupon has reached its usage limit'
    };
  }
  
  // Check expiry date
  const now = new Date();
  const expiryDate = new Date(coupon.expiresAt);
  console.log('🎫 Date check:', {
    now: now.toISOString(),
    expiryDate: expiryDate.toISOString(),
    isExpired: now > expiryDate
  });
  
  if (now > expiryDate) {
    console.log('❌ Coupon has expired');
    return {
      isValid: false,
      message: 'This coupon has expired'
    };
  }
  
  // Calculate discount
  try {
    console.log('🧮 Calculating discount for coupon...');
    const discountCalculation = calculateDiscount(
      basePrice,
      coupon.discountPercentage,
      coupon.maxDiscount
    );
    
    console.log('✅ Coupon validation successful');
    return {
      isValid: true,
      message: 'Coupon is valid',
      discountCalculation
    };
  } catch (error) {
    console.error('❌ Error calculating discount:', error);
    return {
      isValid: false,
      message: 'Invalid coupon configuration'
    };
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

/**
 * Check if tier requires manual processing
 */
export function isManualProcessingTier(tier: string): boolean {
  const normalizedTier = tier.toLowerCase();
  return normalizedTier === 'standard' || normalizedTier === 'premium';
}

/**
 * Get assessment price (alias for getTierPrice)
 */
export function getAssessmentPrice(tier: string): number {
  return getTierPrice(tier);
}

/**
 * Calculate final price after discount
 */
export function calculateFinalPrice(
  basePrice: number,
  discountPercentage: number,
  maxDiscount?: number | null
): number {
  const calculation = calculateDiscount(basePrice, discountPercentage, maxDiscount);
  return calculation.finalPrice;
}

/**
 * Get tier label for display
 */
export function getTierLabel(tier: string): string {
  const labels = {
    basic: 'Basic Analysis',
    standard: 'Basic Report',
    premium: 'Full Report + Interview'
  };
  
  const normalizedTier = tier.toLowerCase() as keyof typeof labels;
  return labels[normalizedTier] || 'Custom Package';
}

/**
 * Validate tier value
 */
export function isValidTier(tier: string): boolean {
  const normalizedTier = tier.toLowerCase() as TierType;
  return normalizedTier in TIER_PRICES;
}

/**
 * Get all available tiers
 */
export function getAvailableTiers(): Array<{ value: TierType; label: string; price: number }> {
  return [
    { value: 'basic', label: getTierLabel('basic'), price: TIER_PRICES.basic },
    { value: 'standard', label: getTierLabel('standard'), price: TIER_PRICES.standard },
    { value: 'premium', label: getTierLabel('premium'), price: TIER_PRICES.premium },
  ];
}
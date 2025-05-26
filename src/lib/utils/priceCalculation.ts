// lib/utils/priceCalculation.ts
export interface PriceConfig {
    fjrl: number;  // First Job Readiness Level
    ijrl: number;  // Ideal Job Readiness Level
    cdrl: number;  // Career Development Readiness Level
    ccrl: number;  // Career Comeback Readiness Level
    ctrl: number;  // Career Transition Readiness Level
    rrl: number;   // Retirement Readiness Level
    irl: number;   // Internship Readiness Level
  }
  
  export interface TierPricing {
    basic: number;
    standard: number;
    premium: number;
  }
  
  // Centralized price configuration
  export const ASSESSMENT_BASE_PRICES: PriceConfig = {
    fjrl: 50,  // First Job Readiness Level
    ijrl: 60,  // Ideal Job Readiness Level
    cdrl: 75,  // Career Development Readiness Level
    ccrl: 80,  // Career Comeback Readiness Level
    ctrl: 100, // Career Transition Readiness Level
    rrl: 120,  // Retirement Readiness Level
    irl: 40,   // Internship Readiness Level
  };
  
  export const TIER_PRICES: TierPricing = {
    basic: 50,
    standard: 100,
    premium: 250,
  };
  
  export interface DiscountCalculation {
    originalPrice: number;
    discountPercentage: number;
    discountAmount: number;
    finalPrice: number;
    savings: number;
  }
  
  /**
   * Get base price for assessment type
   */
  export function getAssessmentBasePrice(assessmentType: string): number {
    const normalizedType = assessmentType.toLowerCase();
    
    if (normalizedType in ASSESSMENT_BASE_PRICES) {
      return ASSESSMENT_BASE_PRICES[normalizedType as keyof PriceConfig];
    }
    
    // Fallback to basic tier pricing
    return TIER_PRICES.basic;
  }
  
  /**
   * Get tier price
   */
  export function getTierPrice(tier: string): number {
    const normalizedTier = tier.toLowerCase();
    
    if (normalizedTier in TIER_PRICES) {
      return TIER_PRICES[normalizedTier as keyof TierPricing];
    }
    
    return TIER_PRICES.basic;
  }
  
  /**
   * Calculate discount with proper floating point handling
   */
  export function calculateDiscount(
    basePrice: number,
    discountPercentage: number,
    maxDiscount?: number | null
  ): DiscountCalculation {
    // Ensure we're working with numbers
    const price = Number(basePrice);
    const percentage = Number(discountPercentage);
    const maxDiscountNum = maxDiscount ? Number(maxDiscount) : null;
    
    // Validate inputs
    if (isNaN(price) || isNaN(percentage) || price < 0 || percentage < 0 || percentage > 100) {
      throw new Error('Invalid price or discount percentage');
    }
    
    // Calculate discount amount with proper precision
    let discountAmount = Math.round((price * percentage) / 100 * 100) / 100;
    
    // Apply maximum discount limit if specified
    if (maxDiscountNum && discountAmount > maxDiscountNum) {
      discountAmount = maxDiscountNum;
    }
    
    // Calculate final price
    let finalPrice = price - discountAmount;
    
    // Ensure price is not negative and round to 2 decimal places
    finalPrice = Math.max(0, Math.round(finalPrice * 100) / 100);
    
    // Round discount amount to 2 decimal places
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
    // Check usage limit
    if (coupon.currentUses >= coupon.maxUses) {
      return {
        isValid: false,
        message: 'This coupon has reached its usage limit'
      };
    }
    
    // Check expiry
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
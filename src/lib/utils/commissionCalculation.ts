// lib/utils/commissionCalculation.ts

// Fixed commission structure based on package prices
export const COMMISSION_STRUCTURE = {
    50: 10,   // RM50 package -> RM10 commission (20%)
    100: 30,  // RM100 package -> RM30 commission (30%)  
    250: 50,  // RM250 package -> RM50 commission (20%)
  } as const;
  
  export interface CommissionCalculation {
    originalPrice: number;
    commissionAmount: number;
    commissionRate: number; // Calculated percentage for display
  }
  
  /**
   * Calculate commission based on package price
   */
  export function calculateCommission(price: number): CommissionCalculation {
    const roundedPrice = Math.round(price);
    
    // Get commission amount from structure
    const commissionAmount = COMMISSION_STRUCTURE[roundedPrice as keyof typeof COMMISSION_STRUCTURE] || 0;
    
    // Calculate rate for display purposes
    const commissionRate = price > 0 ? Math.round((commissionAmount / price) * 100 * 100) / 100 : 0;
    
    return {
      originalPrice: roundedPrice,
      commissionAmount,
      commissionRate
    };
  }
  
  /**
   * Get all available commission tiers
   */
  export function getCommissionTiers(): Array<{
    price: number;
    commission: number;
    rate: number;
  }> {
    return Object.entries(COMMISSION_STRUCTURE).map(([price, commission]) => {
      const priceNum = parseInt(price);
      const rate = Math.round((commission / priceNum) * 100 * 100) / 100;
      
      return {
        price: priceNum,
        commission,
        rate
      };
    });
  }
  
  /**
   * Check if price is eligible for commission
   */
  export function isEligibleForCommission(price: number): boolean {
    const roundedPrice = Math.round(price);
    return roundedPrice in COMMISSION_STRUCTURE;
  }
  
  /**
   * Format commission display
   */
  export function formatCommissionDisplay(price: number): string {
    const calc = calculateCommission(price);
    
    if (calc.commissionAmount === 0) {
      return 'No commission';
    }
    
    return `RM${calc.commissionAmount.toFixed(2)} (${calc.commissionRate}%)`;
  }
  
  /**
   * Get commission tier info for admin display
   */
  export function getCommissionTierInfo() {
    return [
      {
        tier: 'Basic',
        price: 50,
        commission: 10,
        rate: 20,
        description: 'Basic assessment package'
      },
      {
        tier: 'Standard', 
        price: 100,
        commission: 30,
        rate: 30,
        description: 'Standard assessment package'
      },
      {
        tier: 'Premium',
        price: 250,
        commission: 50,
        rate: 20,
        description: 'Premium assessment package'
      }
    ];
  }
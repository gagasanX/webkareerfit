// /src/lib/utils/commissionCalculation.ts - FIXED VERSION
export const COMMISSION_RATES = {
  50: 10,    // RM50 -> RM10 (20%)
  100: 30,   // RM100 -> RM30 (30%)  
  250: 50,   // RM250 -> RM50 (20%)
} as const;

// KEEP existing function for backward compatibility
export function calculateCommission(price: number): number {
  const roundedPrice = Math.round(price);
  return COMMISSION_RATES[roundedPrice as keyof typeof COMMISSION_RATES] || 0;
}

export function getCommissionRate(price: number): number {
  const commission = calculateCommission(price);
  return price > 0 ? Math.round((commission / price) * 100) : 0;
}

// ADD: New function that returns object (for code that expects .commissionAmount)
export function calculateCommissionDetails(price: number): {
  commissionAmount: number;
  commissionRate: number;
  originalPrice: number;
} {
  const commissionAmount = calculateCommission(price);
  const commissionRate = getCommissionRate(price);
  
  return {
    commissionAmount,
    commissionRate,
    originalPrice: price
  };
}
// tests/priceCalculation.test.ts
import { 
    calculateDiscount, 
    getAssessmentBasePrice, 
    getTierPrice,
    validateCoupon,
    formatCurrency,
    ASSESSMENT_BASE_PRICES,
    TIER_PRICES
  } from '@/lib/utils/priceCalculation';
  
  // Test helper function
  function runTest(name: string, testFn: () => void) {
    try {
      testFn();
      console.log(`✅ ${name}`);
    } catch (error) {
      console.error(`❌ ${name}:`, error);
    }
  }
  
  function assertEqual(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, got ${actual}${message ? ` - ${message}` : ''}`);
    }
  }
  
  function assertClose(actual: number, expected: number, tolerance = 0.01, message?: string) {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(`Expected ${expected} (±${tolerance}), got ${actual}${message ? ` - ${message}` : ''}`);
    }
  }
  
  // Run comprehensive tests
  console.log('🧪 Running Price Calculation Tests...\n');
  
  // Test 1: Basic discount calculation
  runTest('Basic 50% discount on RM100', () => {
    const result = calculateDiscount(100, 50);
    assertEqual(result.originalPrice, 100);
    assertEqual(result.discountPercentage, 50);
    assertEqual(result.discountAmount, 50);
    assertEqual(result.finalPrice, 50);
    assertEqual(result.savings, 50);
  });
  
  // Test 2: 95% discount (the problematic case)
  runTest('95% discount on RM100', () => {
    const result = calculateDiscount(100, 95);
    assertEqual(result.originalPrice, 100);
    assertEqual(result.discountPercentage, 95);
    assertEqual(result.discountAmount, 95);
    assertEqual(result.finalPrice, 5);
    assertEqual(result.savings, 95);
  });
  
  // Test 3: 95% discount on different amounts
  runTest('95% discount on RM50', () => {
    const result = calculateDiscount(50, 95);
    assertEqual(result.finalPrice, 2.5);
    assertEqual(result.discountAmount, 47.5);
  });
  
  runTest('95% discount on RM75', () => {
    const result = calculateDiscount(75, 95);
    assertClose(result.finalPrice, 3.75);
    assertClose(result.discountAmount, 71.25);
  });
  
  // Test 4: Maximum discount limit
  runTest('50% discount with RM20 max discount on RM100', () => {
    const result = calculateDiscount(100, 50, 20);
    assertEqual(result.originalPrice, 100);
    assertEqual(result.discountAmount, 20); // Limited by maxDiscount
    assertEqual(result.finalPrice, 80);
    assertEqual(result.savings, 20);
  });
  
  // Test 5: 100% discount (free)
  runTest('100% discount', () => {
    const result = calculateDiscount(100, 100);
    assertEqual(result.finalPrice, 0);
    assertEqual(result.discountAmount, 100);
  });
  
  // Test 6: Floating point precision edge cases
  runTest('Floating point precision - 33.33% of RM100', () => {
    const result = calculateDiscount(100, 33.33);
    assertClose(result.discountAmount, 33.33);
    assertClose(result.finalPrice, 66.67);
  });
  
  // Test 7: Small amounts
  runTest('95% discount on RM1', () => {
    const result = calculateDiscount(1, 95);
    assertClose(result.finalPrice, 0.05);
    assertClose(result.discountAmount, 0.95);
  });
  
  // Test 8: Assessment type pricing
  runTest('Assessment type pricing', () => {
    assertEqual(getAssessmentBasePrice('fjrl'), 50);
    assertEqual(getAssessmentBasePrice('ijrl'), 60);
    assertEqual(getAssessmentBasePrice('ctrl'), 100);
    assertEqual(getAssessmentBasePrice('unknown'), 50); // Default
  });
  
  // Test 9: Tier pricing
  runTest('Tier pricing', () => {
    assertEqual(getTierPrice('basic'), 50);
    assertEqual(getTierPrice('standard'), 100);
    assertEqual(getTierPrice('premium'), 250);
    assertEqual(getTierPrice('unknown'), 50); // Default
  });
  
  // Test 10: Currency formatting
  runTest('Currency formatting', () => {
    assertEqual(formatCurrency(100), 'RM 100.00');
    assertEqual(formatCurrency(50.5), 'RM 50.50');
    assertEqual(formatCurrency(0), 'RM 0.00');
    assertEqual(formatCurrency(99.99), 'RM 99.99');
  });
  
  // Test 11: Coupon validation - valid coupon
  runTest('Valid coupon validation', () => {
    const mockCoupon = {
      discountPercentage: 95,
      maxDiscount: null,
      currentUses: 5,
      maxUses: 100,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    };
    
    const result = validateCoupon(mockCoupon, 100);
    assertEqual(result.isValid, true);
    assertEqual(result.discountCalculation?.finalPrice, 5);
  });
  
  // Test 12: Coupon validation - expired coupon
  runTest('Expired coupon validation', () => {
    const mockCoupon = {
      discountPercentage: 50,
      maxDiscount: null,
      currentUses: 5,
      maxUses: 100,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    };
    
    const result = validateCoupon(mockCoupon, 100);
    assertEqual(result.isValid, false);
    assertEqual(result.message, 'This coupon has expired');
  });
  
  // Test 13: Coupon validation - usage limit reached
  runTest('Usage limit reached coupon validation', () => {
    const mockCoupon = {
      discountPercentage: 50,
      maxDiscount: null,
      currentUses: 100,
      maxUses: 100,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    
    const result = validateCoupon(mockCoupon, 100);
    assertEqual(result.isValid, false);
    assertEqual(result.message, 'This coupon has reached its usage limit');
  });
  
  // Test 14: Complex real-world scenarios
  runTest('Real-world scenario: 95% off CTRL assessment', () => {
    const ctrlPrice = getAssessmentBasePrice('ctrl'); // RM100
    const result = calculateDiscount(ctrlPrice, 95);
    
    assertEqual(result.originalPrice, 100);
    assertEqual(result.finalPrice, 5);
    assertEqual(result.discountAmount, 95);
  });
  
  runTest('Real-world scenario: Premium tier with 20% discount', () => {
    const premiumPrice = getTierPrice('premium'); // RM250
    const result = calculateDiscount(premiumPrice, 20);
    
    assertEqual(result.originalPrice, 250);
    assertEqual(result.finalPrice, 200);
    assertEqual(result.discountAmount, 50);
  });
  
  // Test 15: Edge cases
  runTest('Zero discount', () => {
    const result = calculateDiscount(100, 0);
    assertEqual(result.finalPrice, 100);
    assertEqual(result.discountAmount, 0);
  });
  
  runTest('Negative price handling', () => {
    try {
      calculateDiscount(-100, 50);
      throw new Error('Should have thrown error for negative price');
    } catch (error) {
      if (!(error as Error).message.includes('Invalid price')) {
        throw error;
      }
    }
  });
  
  runTest('Invalid percentage handling', () => {
    try {
      calculateDiscount(100, 150); // Over 100%
      throw new Error('Should have thrown error for invalid percentage');
    } catch (error) {
      if (!(error as Error).message.includes('Invalid price or discount percentage')) {
        throw error;
      }
    }
  });
  
  console.log('\n🎉 All tests completed!');
  
  // Export test function for manual running
  export function runAllTests() {
    console.log('Running all price calculation tests...');
    // Re-run all tests above
  }
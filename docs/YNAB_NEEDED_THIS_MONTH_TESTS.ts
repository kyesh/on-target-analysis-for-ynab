/**
 * Comprehensive Test Suite for YNAB "Needed This Month" Calculations
 * 
 * This test suite validates all goal types, cadences, and edge cases
 * documented in the Developer Guide.
 * 
 * @version 2.0
 * @date December 2024
 */

import { extractNeededThisMonth, calculateSafeVariancePercentage } from './YNAB_NEEDED_THIS_MONTH_IMPLEMENTATION';

// Mock category factory for testing
function createMockCategory(overrides: Partial<YNABCategory> = {}): YNABCategory {
  return {
    id: 'test-category',
    name: 'Test Category',
    goal_type: null,
    goal_target: null,
    goal_target_month: null,
    goal_under_funded: null,
    goal_overall_funded: null,
    goal_overall_left: null,
    goal_cadence: null,
    goal_cadence_frequency: null,
    goal_needs_whole_amount: null,
    goal_months_to_budget: null,
    ...overrides,
  };
}

describe('YNAB Needed This Month Calculations', () => {
  
  describe('No Goal Type', () => {
    test('should return null for categories without goal_type', () => {
      const category = createMockCategory();
      expect(extractNeededThisMonth(category)).toBeNull();
    });
  });

  describe('Monthly Funding (MF) Goals', () => {
    test('should use goal_target for monthly funding amount', () => {
      const category = createMockCategory({
        goal_type: 'MF',
        goal_target: 150000, // $150
      });
      expect(extractNeededThisMonth(category)).toBe(150000);
    });

    test('should return null for MF goals without goal_target', () => {
      const category = createMockCategory({
        goal_type: 'MF',
        goal_target: null,
      });
      expect(extractNeededThisMonth(category)).toBeNull();
    });

    test('should ignore goal_under_funded for MF goals', () => {
      const category = createMockCategory({
        goal_type: 'MF',
        goal_target: 150000,
        goal_under_funded: 75000, // Should be ignored
      });
      expect(extractNeededThisMonth(category)).toBe(150000);
    });
  });

  describe('Target Category Balance (TB) Goals', () => {
    test('should prioritize goal_under_funded when available', () => {
      const category = createMockCategory({
        goal_type: 'TB',
        goal_target: 100000,
        goal_under_funded: 25000,
      });
      expect(extractNeededThisMonth(category)).toBe(25000);
    });

    test('should fallback to goal_target when goal_under_funded is null', () => {
      const category = createMockCategory({
        goal_type: 'TB',
        goal_target: 100000,
        goal_under_funded: null,
      });
      expect(extractNeededThisMonth(category)).toBe(100000);
    });

    test('should handle goal_under_funded of 0 (fully funded)', () => {
      const category = createMockCategory({
        goal_type: 'TB',
        goal_target: 100000,
        goal_under_funded: 0,
      });
      expect(extractNeededThisMonth(category)).toBe(0);
    });
  });

  describe('Target Category Balance by Date (TBD) Goals', () => {
    test('should prioritize goal_under_funded for monthly progress', () => {
      const category = createMockCategory({
        goal_type: 'TBD',
        goal_target: 120000,
        goal_under_funded: 20000,
        goal_target_month: '2025-06-01',
      });
      expect(extractNeededThisMonth(category)).toBe(20000);
    });

    test('should fallback to goal_target when goal_under_funded is null', () => {
      const category = createMockCategory({
        goal_type: 'TBD',
        goal_target: 120000,
        goal_under_funded: null,
        goal_target_month: '2025-06-01',
      });
      expect(extractNeededThisMonth(category)).toBe(120000);
    });
  });

  describe('Debt Payoff (DEBT) Goals', () => {
    test('should prioritize goal_under_funded for monthly payment', () => {
      const category = createMockCategory({
        goal_type: 'DEBT',
        goal_target: 500000,
        goal_under_funded: 50000,
      });
      expect(extractNeededThisMonth(category)).toBe(50000);
    });

    test('should fallback to goal_target when goal_under_funded is null', () => {
      const category = createMockCategory({
        goal_type: 'DEBT',
        goal_target: 500000,
        goal_under_funded: null,
      });
      expect(extractNeededThisMonth(category)).toBe(500000);
    });
  });

  describe('Plan Your Spending (NEED) Goals', () => {
    test('should prioritize goal_under_funded when available', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 80000,
        goal_under_funded: 20000,
      });
      expect(extractNeededThisMonth(category)).toBe(20000);
    });

    test('should fallback to goal_target when goal_under_funded is null', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 80000,
        goal_under_funded: null,
      });
      expect(extractNeededThisMonth(category)).toBe(80000);
    });

    describe('Future-Dated NEED Goals', () => {
      test('should calculate monthly amount for future-dated goals', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 600000, // $600
          goal_target_month: '2024-06-01',
          goal_under_funded: null,
          goal_overall_funded: 0,
        });
        const currentMonth = '2024-03-01'; // 3 months before target
        
        const result = extractNeededThisMonth(category, currentMonth);
        expect(result).toBe(200000); // $600 / 3 months = $200/month
      });

      test('should handle already funded future goals', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 600000, // $600
          goal_target_month: '2024-06-01',
          goal_under_funded: null,
          goal_overall_funded: 300000, // $300 already funded
        });
        const currentMonth = '2024-03-01'; // 3 months before target
        
        const result = extractNeededThisMonth(category, currentMonth);
        expect(result).toBe(100000); // ($600 - $300) / 3 months = $100/month
      });

      test('should return 0 for over-funded future goals', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 600000, // $600
          goal_target_month: '2024-06-01',
          goal_under_funded: null,
          goal_overall_funded: 700000, // $700 over-funded
        });
        const currentMonth = '2024-03-01';
        
        const result = extractNeededThisMonth(category, currentMonth);
        expect(result).toBe(0);
      });

      test('should handle single month remaining', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 600000,
          goal_target_month: '2024-04-01',
          goal_under_funded: null,
          goal_overall_funded: 0,
        });
        const currentMonth = '2024-04-01'; // Same month as target
        
        const result = extractNeededThisMonth(category, currentMonth);
        expect(result).toBe(600000); // Full amount in single month
      });

      test('should not calculate for past dates', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 600000,
          goal_target_month: '2024-01-01',
          goal_under_funded: null,
        });
        const currentMonth = '2024-03-01'; // After target date
        
        const result = extractNeededThisMonth(category, currentMonth);
        expect(result).toBe(600000); // Falls back to goal_target
      });

      test('should handle missing currentMonth parameter', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 600000,
          goal_target_month: '2024-06-01',
          goal_under_funded: null,
        });
        
        const result = extractNeededThisMonth(category); // No currentMonth
        expect(result).toBe(600000); // Falls back to goal_target
      });
    });

    describe('Cadence-Based NEED Goals', () => {
      test('should handle weekly goals (cadence = 2)', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 100000, // $100/week
          goal_cadence: 2, // Weekly
          goal_cadence_frequency: 1,
          goal_under_funded: null,
        });
        
        const result = extractNeededThisMonth(category);
        // ($100 × 52 weeks) / 12 months = $433.33/month
        expect(result).toBe(433333);
      });

      test('should handle yearly goals (cadence = 13)', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 1200000, // $1,200/year
          goal_cadence: 13, // Yearly
          goal_cadence_frequency: 1,
          goal_under_funded: null,
        });
        
        const result = extractNeededThisMonth(category);
        // $1,200 / 12 months = $100/month
        expect(result).toBe(100000);
      });

      test('should handle monthly goals with frequency > 1', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 300000, // $300 every 3 months
          goal_cadence: 1, // Monthly
          goal_cadence_frequency: 3,
          goal_under_funded: null,
        });
        
        const result = extractNeededThisMonth(category);
        // $300 / 3 months = $100/month
        expect(result).toBe(100000);
      });

      test('should handle one-time goals (cadence = 0)', () => {
        const category = createMockCategory({
          goal_type: 'NEED',
          goal_target: 500000, // $500 one-time
          goal_cadence: 0, // One-time
          goal_under_funded: null,
        });
        
        const result = extractNeededThisMonth(category);
        expect(result).toBe(500000); // Use target as-is
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle unknown goal types', () => {
      const category = createMockCategory({
        goal_type: 'UNKNOWN' as any,
        goal_target: 100000,
      });
      
      // Should log warning and return null
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = extractNeededThisMonth(category);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Unknown goal type: UNKNOWN');
      consoleSpy.mockRestore();
    });

    test('should handle invalid date formats', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 600000,
        goal_target_month: 'invalid-date',
        goal_under_funded: null,
      });
      
      const result = extractNeededThisMonth(category, '2024-03-01');
      expect(result).toBe(600000); // Falls back to goal_target
    });

    test('should handle NaN and Infinity values', () => {
      const category = createMockCategory({
        goal_type: 'TB',
        goal_target: 100000,
        goal_under_funded: NaN,
      });
      
      const result = extractNeededThisMonth(category);
      expect(result).toBe(100000); // Falls back to goal_target
    });
  });

  describe('Variance Percentage Calculations', () => {
    test('should calculate variance percentage correctly', () => {
      const result = calculateSafeVariancePercentage(25000, 100000);
      expect(result).toBe(25); // 25% variance
    });

    test('should handle division by zero', () => {
      const result = calculateSafeVariancePercentage(25000, 0);
      expect(result).toBeNull();
    });

    test('should handle invalid target values', () => {
      const result = calculateSafeVariancePercentage(25000, NaN);
      expect(result).toBeNull();
    });

    test('should handle negative variances', () => {
      const result = calculateSafeVariancePercentage(-25000, 100000);
      expect(result).toBe(-25); // -25% variance (under target)
    });
  });
});

// Integration tests with real-world scenarios
describe('Real-World Integration Tests', () => {
  test('Summer Camp Goal - Future Dated NEED', () => {
    const summerCamp = createMockCategory({
      goal_type: 'NEED',
      goal_target: 800000, // $800
      goal_target_month: '2025-06-01',
      goal_under_funded: null,
      goal_overall_funded: 0,
    });
    
    const result = extractNeededThisMonth(summerCamp, '2024-12-01');
    expect(result).toBe(133333); // $800 / 6 months = $133.33/month
  });

  test('Camp Michigania Goal - Future Dated NEED', () => {
    const campMichigania = createMockCategory({
      goal_type: 'NEED',
      goal_target: 5240000, // $5,240
      goal_target_month: '2025-04-15',
      goal_under_funded: null,
      goal_overall_funded: 0,
    });
    
    const result = extractNeededThisMonth(campMichigania, '2024-12-01');
    expect(result).toBe(1310000); // $5,240 / 4 months = $1,310/month
  });

  test('Monthly Bills - MF Goal', () => {
    const monthlyBills = createMockCategory({
      goal_type: 'MF',
      goal_target: 250000, // $250/month
    });
    
    const result = extractNeededThisMonth(monthlyBills);
    expect(result).toBe(250000); // $250/month
  });

  test('Emergency Fund - TB Goal', () => {
    const emergencyFund = createMockCategory({
      goal_type: 'TB',
      goal_target: 1000000, // $1,000 target
      goal_under_funded: 100000, // $100 needed this month
    });
    
    const result = extractNeededThisMonth(emergencyFund);
    expect(result).toBe(100000); // $100 needed this month
  });

  test('Grocery Budget - Weekly NEED Goal', () => {
    const groceries = createMockCategory({
      goal_type: 'NEED',
      goal_target: 75000, // $75/week
      goal_cadence: 2, // Weekly
      goal_cadence_frequency: 1,
      goal_under_funded: null,
    });
    
    const result = extractNeededThisMonth(groceries);
    expect(result).toBe(325000); // ($75 × 52) / 12 = $325/month
  });
});

/**
 * Simplified Test Suite for YNAB "Needed This Month" Calculations
 *
 * This test suite validates the four simplified rules for calculating
 * "Needed This Month" values with clear, focused test cases.
 *
 * @version 3.0
 * @date December 2024
 */

import { calculateNeededThisMonth, calculateSafeVariancePercentage } from './YNAB_NEEDED_THIS_MONTH_IMPLEMENTATION';

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

describe('Simplified YNAB Needed This Month Calculations', () => {

  describe('Rule 1: Monthly NEED Goals', () => {
    test('should use goal_target for monthly NEED goals', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 60000, // $60/month
        goal_cadence: 1,
        goal_cadence_frequency: 1,
      });
      expect(calculateNeededThisMonth(category)).toBe(60000);
    });

    test('should return null for categories without goal_type', () => {
      const category = createMockCategory();
      expect(calculateNeededThisMonth(category)).toBeNull();
    });

    test('should return null for categories without goal_target', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: null,
      });
      expect(calculateNeededThisMonth(category)).toBeNull();
    });
  });

  describe('Rule 2: Weekly NEED Goals', () => {
    test('should calculate goal_target × day occurrences for weekly goals', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 100000, // $100 per occurrence
        goal_cadence: 2, // Weekly
        goal_cadence_frequency: 1,
        goal_day: 1, // Monday
      });

      // December 2024 has 5 Mondays (2, 9, 16, 23, 30)
      expect(calculateNeededThisMonth(category, '2024-12-01')).toBe(500000); // $100 × 5 = $500
    });

    test('should fallback to goal_target when no current month provided', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 100000,
        goal_cadence: 2,
        goal_cadence_frequency: 1,
        goal_day: 1,
      });

      expect(calculateNeededThisMonth(category)).toBe(100000); // Fallback
    });

    test('should handle missing goal_day gracefully', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 100000,
        goal_cadence: 2,
        goal_cadence_frequency: 1,
        goal_day: null,
      });

      expect(calculateNeededThisMonth(category, '2024-12-01')).toBe(100000); // Fallback
    });
  });

  describe('Rule 3: Goals with Months to Budget (Priority Rule)', () => {
    test('should use months to budget calculation when available', () => {
      const category = createMockCategory({
        goal_type: 'TBD',
        goal_target: 120000,
        goal_months_to_budget: 4,
        goal_overall_left: 80000,
        budgeted: 20000,
      });

      // (80000 + 20000) / 4 = 25000
      expect(calculateNeededThisMonth(category)).toBe(25000);
    });

    test('should take precedence over cadence calculations', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 100000,
        goal_cadence: 2, // Weekly
        goal_cadence_frequency: 1,
        goal_day: 1,
        goal_months_to_budget: 3, // Should take precedence
        goal_overall_left: 60000,
        budgeted: 30000,
      });

      // (60000 + 30000) / 3 = 30000 (not weekly calculation)
      expect(calculateNeededThisMonth(category, '2024-12-01')).toBe(30000);
    });
  });

  describe('Rule 4: All Other Cases (Fallback)', () => {
    test('should use goal_target for MF goals', () => {
      const category = createMockCategory({
        goal_type: 'MF',
        goal_target: 150000, // $150/month
      });
      expect(calculateNeededThisMonth(category)).toBe(150000);
    });

    test('should use goal_target for TB goals', () => {
      const category = createMockCategory({
        goal_type: 'TB',
        goal_target: 100000, // $100 target
      });
      expect(calculateNeededThisMonth(category)).toBe(100000);
    });

    test('should use goal_target for TBD goals', () => {
      const category = createMockCategory({
        goal_type: 'TBD',
        goal_target: 120000, // $120 target
      });
      expect(calculateNeededThisMonth(category)).toBe(120000);
    });

    test('should use goal_target for DEBT goals', () => {
      const category = createMockCategory({
        goal_type: 'DEBT',
        goal_target: 500000, // $500 target
      });
      expect(calculateNeededThisMonth(category)).toBe(500000);
    });

    test('should use goal_target for other NEED goal variations', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 80000, // $80 target
        goal_cadence: 0, // One-time
      });
      expect(calculateNeededThisMonth(category)).toBe(80000);
    });

  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid date formats for weekly goals', () => {
      const category = createMockCategory({
        goal_type: 'NEED',
        goal_target: 100000,
        goal_cadence: 2,
        goal_cadence_frequency: 1,
        goal_day: 1,
      });

      const result = calculateNeededThisMonth(category, 'invalid-date');
      expect(result).toBe(100000); // Falls back to goal_target
    });

    test('should handle NaN and Infinity values', () => {
      const category = createMockCategory({
        goal_type: 'MF',
        goal_target: NaN,
      });

      const result = calculateNeededThisMonth(category);
      expect(result).toBeNull(); // Returns null for invalid goal_target
    });

    test('should handle zero goal_months_to_budget', () => {
      const category = createMockCategory({
        goal_type: 'TBD',
        goal_target: 120000,
        goal_months_to_budget: 0, // Should not trigger Rule 3
        goal_overall_left: 80000,
        budgeted: 20000,
      });

      const result = calculateNeededThisMonth(category);
      expect(result).toBe(120000); // Falls back to goal_target
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

// Simplified real-world integration tests
describe('Simplified Real-World Examples', () => {
  test('Monthly Subscription - Rule 1', () => {
    const subscription = createMockCategory({
      goal_type: 'NEED',
      goal_target: 60000, // $60/month
      goal_cadence: 1,
      goal_cadence_frequency: 1,
    });

    const result = calculateNeededThisMonth(subscription);
    expect(result).toBe(60000); // $60/month
  });

  test('Weekly Groceries - Rule 2', () => {
    const groceries = createMockCategory({
      goal_type: 'NEED',
      goal_target: 100000, // $100 per Monday
      goal_cadence: 2,
      goal_cadence_frequency: 1,
      goal_day: 1, // Monday
    });

    // December 2024 has 5 Mondays
    const result = calculateNeededThisMonth(groceries, '2024-12-01');
    expect(result).toBe(500000); // $100 × 5 = $500/month
  });

  test('Vacation Fund - Rule 3', () => {
    const vacation = createMockCategory({
      goal_type: 'TBD',
      goal_target: 120000,
      goal_months_to_budget: 6,
      goal_overall_left: 100000,
      budgeted: 20000,
    });

    const result = calculateNeededThisMonth(vacation);
    expect(result).toBe(20000); // (100000 + 20000) / 6 = $20/month
  });

  test('Monthly Bills - Rule 4', () => {
    const bills = createMockCategory({
      goal_type: 'MF',
      goal_target: 250000, // $250/month
    });

    const result = calculateNeededThisMonth(bills);
    expect(result).toBe(250000); // $250/month
  });
});

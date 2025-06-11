/**
 * Unit tests for data processing utilities
 */

import {
  milliunitsToDollars,
  dollarsToMilliunits,
  formatCurrency,
  determineAlignmentStatus,
  calculateTargetPercentage,
  extractTargetAmount,
  calculateNeededThisMonth,
  shouldIncludeCategory,
  processCategory,
  validateMonthFormat,
  getFirstDayOfMonth,
  getPreviousMonth,
  getNextMonth,
} from '../lib/data-processing';
import { YNABCategory } from '../types/ynab';

// Helper functions to create mock YNAB categories
const createEnhancedMockCategory = (
  goalType: string | null,
  goalTarget: number | null,
  goalUnderFunded: number | null = null
): YNABCategory => ({
  id: 'test-id',
  category_group_id: 'group-id',
  name: 'Test Category',
  hidden: false,
  note: null,
  budgeted: 0,
  activity: 0,
  balance: 0,
  goal_type: goalType as any,
  goal_target: goalTarget,
  goal_under_funded: goalUnderFunded,
  goal_target_month: null,
  goal_creation_month: null,
  goal_percentage_complete: null,
  goal_months_to_budget: null,
  goal_overall_funded: null,
  goal_overall_left: null,
  goal_needs_whole_amount: null,
  goal_day: null,
  goal_cadence: null,
  goal_cadence_frequency: null,
  deleted: false,
});

const createMockCategory = (
  goalType: string | null,
  goalTarget: number | null
): YNABCategory => createEnhancedMockCategory(goalType, goalTarget, null);

describe('Data Processing Utilities', () => {
  describe('Currency Conversion', () => {
    test('milliunitsToDollars converts correctly', () => {
      expect(milliunitsToDollars(1000)).toBe(1);
      expect(milliunitsToDollars(2500)).toBe(2.5);
      expect(milliunitsToDollars(-1500)).toBe(-1.5);
      expect(milliunitsToDollars(0)).toBe(0);
    });

    test('dollarsToMilliunits converts correctly', () => {
      expect(dollarsToMilliunits(1)).toBe(1000);
      expect(dollarsToMilliunits(2.5)).toBe(2500);
      expect(dollarsToMilliunits(-1.5)).toBe(-1500);
      expect(dollarsToMilliunits(0)).toBe(0);
    });

    test('formatCurrency formats correctly', () => {
      expect(formatCurrency(1000)).toBe('$1.00');
      expect(formatCurrency(2500)).toBe('$2.50');
      expect(formatCurrency(-1500)).toBe('-$1.50');
      expect(formatCurrency(0)).toBe('$0.00');
    });
  });

  describe('Alignment Status Determination', () => {
    test('determines on-target status correctly', () => {
      expect(determineAlignmentStatus(1000, 1000)).toBe('on-target');
      expect(determineAlignmentStatus(1000, 999)).toBe('on-target'); // Within tolerance
      expect(determineAlignmentStatus(999, 1000)).toBe('on-target'); // Within tolerance
    });

    test('determines over-target status correctly', () => {
      // Default tolerance is 1000 milliunits ($1.00)
      expect(determineAlignmentStatus(2001, 1000, 1000)).toBe('over-target'); // $1.001 over target (outside tolerance)
      expect(determineAlignmentStatus(3000, 1000, 1000)).toBe('over-target'); // $2.00 over target
    });

    test('determines under-target status correctly', () => {
      // Default tolerance is 1000 milliunits ($1.00)
      expect(determineAlignmentStatus(-1, 1000, 1000)).toBe('under-target'); // $1.001 under target (outside tolerance)
      expect(determineAlignmentStatus(-500, 1000, 1000)).toBe('under-target'); // $1.50 under target
    });

    test('determines no-target status correctly', () => {
      expect(determineAlignmentStatus(1000, null)).toBe('no-target');
      expect(determineAlignmentStatus(1000, 0)).toBe('no-target');
    });

    test('respects custom tolerance', () => {
      expect(determineAlignmentStatus(1050, 1000, 100)).toBe('on-target'); // Within $0.10 tolerance
      expect(determineAlignmentStatus(1101, 1000, 100)).toBe('over-target'); // Outside $0.10 tolerance
    });
  });

  describe('Target Percentage Calculation', () => {
    test('calculates percentage correctly', () => {
      expect(calculateTargetPercentage(1000, 1000)).toBe(100);
      expect(calculateTargetPercentage(500, 1000)).toBe(50);
      expect(calculateTargetPercentage(1500, 1000)).toBe(150);
      expect(calculateTargetPercentage(0, 1000)).toBe(0);
    });

    test('returns null for no target', () => {
      expect(calculateTargetPercentage(1000, null)).toBeNull();
      expect(calculateTargetPercentage(1000, 0)).toBeNull();
    });
  });

  describe('Target Amount Extraction', () => {
    const createMockCategory = (goalType: string | null, goalTarget: number | null): YNABCategory => ({
      id: 'test-id',
      category_group_id: 'group-id',
      name: 'Test Category',
      hidden: false,
      note: null,
      budgeted: 0,
      activity: 0,
      balance: 0,
      goal_type: goalType as any,
      goal_target: goalTarget,
      goal_target_month: null,
      goal_creation_month: null,
      goal_percentage_complete: null,
      goal_months_to_budget: null,
      goal_under_funded: null,
      goal_overall_funded: null,
      goal_overall_left: null,
      goal_needs_whole_amount: null,
      goal_day: null,
      goal_cadence: null,
      goal_cadence_frequency: null,
      deleted: false,
    });

    test('extracts target for TB goal type', () => {
      const category = createMockCategory('TB', 50000);
      expect(extractTargetAmount(category)).toBe(50000);
    });

    test('extracts target for TBD goal type', () => {
      const category = createMockCategory('TBD', 30000);
      expect(extractTargetAmount(category)).toBe(30000);
    });

    test('extracts target for MF goal type', () => {
      const category = createMockCategory('MF', 25000);
      expect(extractTargetAmount(category)).toBe(25000);
    });

    test('extracts target for NEED goal type', () => {
      const category = createMockCategory('NEED', 15000);
      expect(extractTargetAmount(category)).toBe(15000);
    });

    test('extracts target for DEBT goal type', () => {
      const category = createMockCategory('DEBT', 20000);
      expect(extractTargetAmount(category)).toBe(20000);
    });

    test('returns null for no goal type', () => {
      const category = createMockCategory(null, 10000);
      expect(extractTargetAmount(category)).toBeNull();
    });

    test('returns goal_target for unknown goal type (fallback)', () => {
      const category = createMockCategory('UNKNOWN', 10000);
      expect(extractTargetAmount(category)).toBe(10000); // Simplified logic uses goal_target as fallback
    });
  });

  describe('Enhanced Target Amount Extraction', () => {

    test('returns null for categories without goal_type', () => {
      const category = createMockCategory(null, null);
      expect(calculateNeededThisMonth(category)).toBeNull();
    });

    test('returns null for categories without goal_target', () => {
      const category = createMockCategory('TB', null);
      expect(calculateNeededThisMonth(category)).toBeNull();
    });

    test('Rule 1: Monthly NEED Goals (cadence=1, frequency=1)', () => {
      const category = {
        ...createEnhancedMockCategory('NEED', 60000, null),
        goal_cadence: 1,
        goal_cadence_frequency: 1,
      };
      expect(calculateNeededThisMonth(category)).toBe(60000);
    });

    test('Rule 2: Weekly NEED Goals (cadence=2, frequency=1)', () => {
      const category = {
        ...createEnhancedMockCategory('NEED', 100000, null), // $100 per occurrence
        goal_cadence: 2,
        goal_cadence_frequency: 1,
        goal_day: 1, // Monday
      };

      // December 2024 has 5 Mondays (2, 9, 16, 23, 30)
      const result = calculateNeededThisMonth(category, '2024-12-01');
      expect(result).toBe(500000); // $100 × 5 = $500
    });

    test('Rule 3: Goals with months to budget take precedence', () => {
      const category = {
        ...createEnhancedMockCategory('TBD', 120000, null),
        goal_months_to_budget: 4,
        goal_overall_left: 80000,
        budgeted: 20000,
      };

      // (80000 + 20000) / 4 = 25000
      expect(calculateNeededThisMonth(category)).toBe(25000);
    });

    test('Rule 4: All other cases fallback to goal_target', () => {
      const category = createEnhancedMockCategory('MF', 150000, null);
      expect(calculateNeededThisMonth(category)).toBe(150000);
    });
  });

  describe('Simplified Calculation Edge Cases', () => {
    test('Weekly goals fallback to goal_target when no current month provided', () => {
      const category = {
        ...createEnhancedMockCategory('NEED', 100000, null),
        goal_cadence: 2,
        goal_cadence_frequency: 1,
        goal_day: 1,
      };

      expect(calculateNeededThisMonth(category)).toBe(100000);
    });

    test('Weekly goals handle missing goal_day gracefully', () => {
      const category = {
        ...createEnhancedMockCategory('NEED', 100000, null),
        goal_cadence: 2,
        goal_cadence_frequency: 1,
        goal_day: null,
      };

      expect(calculateNeededThisMonth(category, '2024-12-01')).toBe(100000);
    });

    test('extractTargetAmount uses simplified calculation', () => {
      const category = createEnhancedMockCategory('MF', 150000, null);
      expect(extractTargetAmount(category)).toBe(150000);
    });
  });



  describe('Category Inclusion Logic', () => {
    const createMockCategory = (overrides: Partial<YNABCategory> = {}): YNABCategory => ({
      id: 'test-id',
      category_group_id: 'group-id',
      name: 'Test Category',
      hidden: false,
      note: null,
      budgeted: 10000,
      activity: 0,
      balance: 0,
      goal_type: null,
      goal_target: null,
      goal_target_month: null,
      goal_creation_month: null,
      goal_percentage_complete: null,
      goal_months_to_budget: null,
      goal_under_funded: null,
      goal_overall_funded: null,
      goal_overall_left: null,
      goal_needs_whole_amount: null,
      goal_day: null,
      goal_cadence: null,
      goal_cadence_frequency: null,
      deleted: false,
      ...overrides,
    });

    test('includes normal categories', () => {
      const category = createMockCategory();
      expect(shouldIncludeCategory(category)).toBe(true);
    });

    test('excludes deleted categories by default', () => {
      const category = createMockCategory({ deleted: true });
      expect(shouldIncludeCategory(category)).toBe(false);
    });

    test('includes deleted categories when configured', () => {
      const category = createMockCategory({ deleted: true });
      const config = { 
        toleranceMilliunits: 1000,
        includeHiddenCategories: false,
        includeDeletedCategories: true,
        minimumAssignmentThreshold: 0,
      };
      expect(shouldIncludeCategory(category, config)).toBe(true);
    });

    test('excludes hidden categories by default', () => {
      const category = createMockCategory({ hidden: true });
      expect(shouldIncludeCategory(category)).toBe(false);
    });

    test('includes hidden categories when configured', () => {
      const category = createMockCategory({ hidden: true });
      const config = { 
        toleranceMilliunits: 1000,
        includeHiddenCategories: true,
        includeDeletedCategories: false,
        minimumAssignmentThreshold: 0,
      };
      expect(shouldIncludeCategory(category, config)).toBe(true);
    });

    test('excludes categories below assignment threshold', () => {
      const category = createMockCategory({ budgeted: 500 });
      const config = { 
        toleranceMilliunits: 1000,
        includeHiddenCategories: false,
        includeDeletedCategories: false,
        minimumAssignmentThreshold: 1000,
      };
      expect(shouldIncludeCategory(category, config)).toBe(false);
    });
  });

  describe('Date Utilities', () => {
    test('validates month format correctly', () => {
      expect(validateMonthFormat('2024-01-01')).toBe(true);
      expect(validateMonthFormat('2024-12-01')).toBe(true);
      expect(validateMonthFormat('2024-1-1')).toBe(false);
      expect(validateMonthFormat('2024-01')).toBe(false);
      expect(validateMonthFormat('invalid')).toBe(false);
      expect(validateMonthFormat('2024-13-01')).toBe(false);
    });

    test('gets first day of month correctly', () => {
      const date = new Date('2024-03-15');
      expect(getFirstDayOfMonth(date)).toBe('2024-03-01');
    });

    test('gets previous month correctly', () => {
      expect(getPreviousMonth('2024-03-01')).toBe('2024-02-01');
      expect(getPreviousMonth('2024-01-01')).toBe('2023-12-01');
    });

    test('gets next month correctly', () => {
      expect(getNextMonth('2024-02-01')).toBe('2024-03-01');
      expect(getNextMonth('2024-12-01')).toBe('2025-01-01');
    });
  });
});

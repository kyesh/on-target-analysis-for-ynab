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
  shouldIncludeCategory,
  processCategory,
  validateMonthFormat,
  getFirstDayOfMonth,
  getPreviousMonth,
  getNextMonth,
} from '../lib/data-processing';
import { YNABCategory } from '../types/ynab';

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

    test('returns null for unknown goal type', () => {
      const category = createMockCategory('UNKNOWN', 10000);
      expect(extractTargetAmount(category)).toBeNull();
    });
  });

  describe('Enhanced Target Amount Extraction', () => {
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

    test('MF goals use goal_target (monthly funding amount)', () => {
      const category = createEnhancedMockCategory('MF', 50000, 0);
      expect(extractTargetAmount(category)).toBe(50000);
    });

    test('TB goals prioritize goal_under_funded when available', () => {
      const category = createEnhancedMockCategory('TB', 100000, 25000);
      expect(extractTargetAmount(category)).toBe(25000);
    });

    test('TB goals fallback to goal_target when goal_under_funded is null', () => {
      const category = createEnhancedMockCategory('TB', 100000, null);
      expect(extractTargetAmount(category)).toBe(100000);
    });

    test('TBD goals prioritize goal_under_funded for monthly progress', () => {
      const category = createEnhancedMockCategory('TBD', 120000, 30000);
      expect(extractTargetAmount(category)).toBe(30000);
    });

    test('NEED goals use goal_target (spending target)', () => {
      const category = createEnhancedMockCategory('NEED', 60000, 10000);
      expect(extractTargetAmount(category)).toBe(60000);
    });

    test('DEBT goals prioritize goal_under_funded for monthly payment', () => {
      const category = createEnhancedMockCategory('DEBT', 500000, 50000);
      expect(extractTargetAmount(category)).toBe(50000);
    });

    test('handles goal_under_funded of 0 correctly', () => {
      const category = createEnhancedMockCategory('TB', 100000, 0);
      expect(extractTargetAmount(category)).toBe(0);
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

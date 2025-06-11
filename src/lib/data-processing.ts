/**
 * Core Data Processing Utilities for YNAB Target Alignment Analysis
 * Handles YNAB data transformation, calculations, and analysis
 */

import { YNABCategory, YNABMonth, GoalType } from '@/types/ynab';
import { 
  ProcessedCategory, 
  AlignmentStatus, 
  MonthlyAnalysis,
  CategoryVariance,
  AnalysisConfig 
} from '@/types/analysis';

/**
 * Default analysis configuration
 */
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  toleranceMilliunits: 1000, // $0.01 tolerance for "on-target"
  includeHiddenCategories: false,
  includeDeletedCategories: false,
  minimumAssignmentThreshold: 0, // Include all assignments
};

/**
 * Convert YNAB milliunits to dollars
 */
export function milliunitsToDollars(milliunits: number): number {
  return milliunits / 1000;
}

/**
 * Convert dollars to YNAB milliunits
 */
export function dollarsToMilliunits(dollars: number): number {
  return Math.round(dollars * 1000);
}

/**
 * Format milliunits as currency string
 */
export function formatCurrency(milliunits: number): string {
  const dollars = milliunitsToDollars(milliunits);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Determine alignment status based on assigned vs target amounts
 */
export function determineAlignmentStatus(
  assigned: number,
  target: number | null,
  tolerance: number = DEFAULT_ANALYSIS_CONFIG.toleranceMilliunits
): AlignmentStatus {
  if (target === null || target === 0) {
    return 'no-target';
  }

  const variance = assigned - target;
  
  if (Math.abs(variance) <= tolerance) {
    return 'on-target';
  }
  
  return variance > 0 ? 'over-target' : 'under-target';
}

/**
 * Calculate percentage of target achieved
 */
export function calculateTargetPercentage(assigned: number, target: number | null): number | null {
  if (target === null || target === 0) {
    return null;
  }
  
  return (assigned / target) * 100;
}

/**
 * Calculate months between two date strings (YYYY-MM-DD format)
 * Returns the number of months from start to end date
 */
function calculateMonthsBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T00:00:00.000Z');

  const yearDiff = end.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = end.getUTCMonth() - start.getUTCMonth();

  return Math.max(1, yearDiff * 12 + monthDiff);
}

/**
 * Calculate monthly needed amount for future-dated goals
 * Used when goal_under_funded is null but goal has a future target date
 */
function calculateMonthlyNeededForFutureGoal(
  category: YNABCategory,
  currentMonth: string
): number | null {
  if (!category.goal_target_month || !category.goal_target) {
    return null;
  }

  // Only calculate for future dates
  if (category.goal_target_month <= currentMonth) {
    return null;
  }

  const monthsRemaining = calculateMonthsBetween(currentMonth, category.goal_target_month);
  if (monthsRemaining <= 0) {
    return null;
  }

  const alreadyFunded = category.goal_overall_funded || 0;
  const remainingNeeded = category.goal_target - alreadyFunded;

  // If already fully funded or over-funded, no monthly amount needed
  if (remainingNeeded <= 0) {
    return 0;
  }

  return Math.round(remainingNeeded / monthsRemaining);
}

/**
 * Extract target amount from YNAB category goal fields for monthly analysis
 * Uses goal_under_funded when available for more accurate monthly calculations
 * Enhanced to handle future-dated goals with manual calculation
 */
export function extractTargetAmount(category: YNABCategory, currentMonth?: string): number | null {
  // If no goal type is set, return null
  if (!category.goal_type) {
    return null;
  }

  // For monthly analysis, prioritize goal_under_funded when available
  // This represents what YNAB calculates as needed THIS MONTH to stay on track
  const monthlyNeeded = category.goal_under_funded;
  const overallTarget = category.goal_target;

  // Handle different goal types with monthly-specific logic
  switch (category.goal_type) {
    case 'MF': // Monthly Funding
      // For monthly funding goals, use the overall target as it represents the monthly amount
      // goal_under_funded might be 0 if already funded, but we want the monthly target
      return overallTarget || null;

    case 'TB': // Target Category Balance
      // For target balance goals, use goal_under_funded if available (amount needed this month)
      // Fall back to goal_target for total target amount
      if (monthlyNeeded !== null && monthlyNeeded !== undefined) {
        return monthlyNeeded;
      }
      return overallTarget || null;

    case 'TBD': // Target Category Balance by Date
      // For date-based targets, use goal_under_funded (monthly progress needed)
      // This gives us what's needed THIS MONTH to stay on track for the target date
      if (monthlyNeeded !== null && monthlyNeeded !== undefined) {
        return monthlyNeeded;
      }
      return overallTarget || null;

    case 'NEED': // Plan Your Spending
      // Enhanced handling for future-dated NEED goals
      if (monthlyNeeded !== null && monthlyNeeded !== undefined) {
        return monthlyNeeded;
      }

      // For future-dated NEED goals where goal_under_funded is null,
      // calculate monthly amount needed to reach target by target date
      if (currentMonth && category.goal_target_month && category.goal_target_month > currentMonth) {
        const calculatedMonthly = calculateMonthlyNeededForFutureGoal(category, currentMonth);
        if (calculatedMonthly !== null) {
          return calculatedMonthly;
        }
      }

      // Fall back to goal_target for non-dated or current month goals
      return overallTarget || null;

    case 'DEBT': // Debt Payoff Goal
      // For debt goals, use goal_under_funded if available (monthly payment needed)
      // Fall back to goal_target
      if (monthlyNeeded !== null && monthlyNeeded !== undefined) {
        return monthlyNeeded;
      }
      return overallTarget || null;

    default:
      return null;
  }
}

/**
 * Extract overall target amount (for reference/comparison purposes)
 * This returns the goal_target field which represents the overall goal amount
 */
export function extractOverallTargetAmount(category: YNABCategory): number | null {
  return category.goal_target || null;
}

/**
 * Extract monthly needed amount (what YNAB calculates as needed this month)
 * This returns the goal_under_funded field which represents monthly progress needed
 */
export function extractMonthlyNeededAmount(category: YNABCategory): number | null {
  return category.goal_under_funded || null;
}

/**
 * Get target type description for display purposes
 */
export function getTargetTypeDescription(goalType: string | null): string {
  const descriptions: Record<string, string> = {
    'TB': 'Target Category Balance',
    'TBD': 'Target Category Balance by Date',
    'MF': 'Monthly Funding',
    'NEED': 'Plan Your Spending',
    'DEBT': 'Debt Payoff Goal'
  };

  return descriptions[goalType || ''] || 'No Target';
}

/**
 * Check if category should be included in analysis
 */
export function shouldIncludeCategory(
  category: YNABCategory, 
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
): boolean {
  // Skip deleted categories unless explicitly included
  if (category.deleted && !config.includeDeletedCategories) {
    return false;
  }
  
  // Skip hidden categories unless explicitly included
  if (category.hidden && !config.includeHiddenCategories) {
    return false;
  }
  
  // Skip categories with assignments below threshold
  if (Math.abs(category.budgeted) < config.minimumAssignmentThreshold) {
    return false;
  }
  
  return true;
}

/**
 * Process a single YNAB category into analysis format
 */
export function processCategory(
  category: YNABCategory,
  categoryGroupName: string = '',
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG,
  currentMonth?: string
): ProcessedCategory {
  const target = extractTargetAmount(category, currentMonth);
  const assigned = category.budgeted;
  const variance = target !== null ? assigned - target : 0;
  const alignmentStatus = determineAlignmentStatus(assigned, target, config.toleranceMilliunits);
  const percentageOfTarget = calculateTargetPercentage(assigned, target);
  
  return {
    id: category.id,
    name: category.name,
    categoryGroupName: categoryGroupName || category.category_group_name || 'Unknown',
    assigned,
    target,
    targetType: category.goal_type,
    variance,
    alignmentStatus,
    percentageOfTarget,
    isHidden: category.hidden,
    hasTarget: target !== null,
    goalPercentageComplete: category.goal_percentage_complete,
    goalUnderFunded: category.goal_under_funded,
    goalOverallLeft: category.goal_overall_left,
  };
}

/**
 * Calculate variance details for a category
 */
export function calculateCategoryVariance(
  category: ProcessedCategory,
  month: string
): CategoryVariance | null {
  if (!category.hasTarget || category.target === null) {
    return null;
  }
  
  const variancePercentage = (category.variance / category.target) * 100;
  
  return {
    categoryId: category.id,
    categoryName: category.name,
    categoryGroupName: category.categoryGroupName,
    assigned: category.assigned,
    target: category.target,
    variance: category.variance,
    variancePercentage,
    targetType: category.targetType,
    month,
  };
}

/**
 * Validate month format (YYYY-MM-DD)
 */
export function validateMonthFormat(month: string): boolean {
  const monthRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!monthRegex.test(month)) {
    return false;
  }
  
  const date = new Date(month);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Get first day of month in YNAB format (YYYY-MM-DD)
 */
export function getFirstDayOfMonth(date: Date = new Date()): string {
  // Use UTC methods to avoid timezone issues
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Get previous month in YNAB format
 */
export function getPreviousMonth(month: string): string {
  // Parse as UTC to avoid timezone issues
  const date = new Date(month + 'T00:00:00.000Z');
  date.setUTCMonth(date.getUTCMonth() - 1);
  return getFirstDayOfMonth(date);
}

/**
 * Get next month in YNAB format
 */
export function getNextMonth(month: string): string {
  // Parse as UTC to avoid timezone issues
  const date = new Date(month + 'T00:00:00.000Z');
  date.setUTCMonth(date.getUTCMonth() + 1);
  return getFirstDayOfMonth(date);
}

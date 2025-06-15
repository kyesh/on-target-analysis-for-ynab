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
 * Type-safe wrapper for counting day occurrences with optional goal_day
 * @param year - Year (e.g., 2024)
 * @param month - Month (1-12)
 * @param goalDay - Optional goal day from YNAB category
 * @returns Number of occurrences or 1 as fallback
 */
function safeCountDayOccurrences(year: number, month: number, goalDay: number | null | undefined): number {
  if (typeof goalDay === 'number') {
    return countDayOccurrencesInMonth(year, month, goalDay);
  }
  return 1; // Fallback to 1 occurrence if goal_day is not valid
}

/**
 * Count occurrences of a specific day of the week in a given month
 * @param year - Year (e.g., 2024)
 * @param month - Month (1-12)
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns Number of occurrences of that day in the month
 */
function countDayOccurrencesInMonth(year: number, month: number, dayOfWeek: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === dayOfWeek) {
      count++;
    }
  }

  return count;
}

/**
 * Calculate "Needed This Month" amount based on simplified YNAB rules
 * This replaces all previous complex calculation logic with definitive rules
 */
export function calculateNeededThisMonth(category: YNABCategory, currentMonth?: string): number | null {
  // Zero-Target Strategy: return 0 for categories without goals
  if (!category.goal_type) {
    return 0;
  }

  // Return null if goal type exists but no target is set
  if (!category.goal_target) {
    return null;
  }

  // Rule 3: Goals with months to budget take precedence
  if (category.goal_months_to_budget && category.goal_months_to_budget > 0) {
    const overallLeft = category.goal_overall_left || 0;
    const budgeted = category.budgeted || 0;
    return Math.round((overallLeft + budgeted) / category.goal_months_to_budget);
  }

  // Rule 1: Monthly NEED Goals (cadence = 1, frequency = 1)
  if (category.goal_cadence === 1 && category.goal_cadence_frequency === 1) {
    return category.goal_target;
  }

  // Rule 2: Weekly NEED Goals (cadence = 2, frequency = 1)
  if (category.goal_cadence === 2 && category.goal_cadence_frequency === 1 &&
      typeof category.goal_day === 'number') {
    if (!currentMonth) {
      // Fallback to goal_target if no current month provided
      return category.goal_target;
    }

    try {
      // Parse month (YYYY-MM-DD format)
      const parts = currentMonth.split('-');
      if (parts.length < 2) {
        return category.goal_target;
      }
      const year = parseInt(parts[0]!, 10);
      const month = parseInt(parts[1]!, 10);
      if (isNaN(year) || isNaN(month)) {
        return category.goal_target;
      }
      const dayCount = safeCountDayOccurrences(year, month, category.goal_day);
      return Math.round(category.goal_target * dayCount);
    } catch (error) {
      console.warn('Error calculating weekly goal for month:', currentMonth, error);
      return category.goal_target;
    }
  }

  // Rule 4: All other cases - fallback to goal_target
  return category.goal_target;
}

/**
 * Calculate "Needed This Month" amount with debug information
 * Returns both the calculated amount and which rule was applied
 */
export function calculateNeededThisMonthWithRule(
  category: YNABCategory,
  currentMonth?: string
): { amount: number | null; rule: string; debugInfo?: any } {
  // Handle categories without goals - Zero Target Strategy
  if (!category.goal_type) {
    return {
      amount: 0,
      rule: "No Goal - Zero Target",
      debugInfo: {
        reason: "Category has no goal_type, using zero target strategy",
        goal_type: category.goal_type,
        goal_target: category.goal_target
      }
    };
  }

  // Return null if goal type exists but no target is set
  if (!category.goal_target) {
    return {
      amount: null,
      rule: "No Goal",
      debugInfo: {
        reason: "Goal type exists but missing goal_target",
        goal_type: category.goal_type,
        goal_target: category.goal_target
      }
    };
  }

  // Rule 6: Goal Creation Month Check - Goals created after current month should not contribute
  if (category.goal_creation_month && currentMonth) {
    try {
      const goalCreationDate = new Date(category.goal_creation_month + 'T00:00:00.000Z');
      const currentMonthDate = new Date(currentMonth + 'T00:00:00.000Z');

      if (goalCreationDate > currentMonthDate) {
        return {
          amount: 0,
          rule: "Rule 6: Future Goal Creation",
          debugInfo: {
            reason: "Goal created after current analysis month",
            goal_creation_month: category.goal_creation_month,
            current_month: currentMonth,
            calculation: `Goal created ${category.goal_creation_month} > analysis month ${currentMonth} → 0`
          }
        };
      }
    } catch (error) {
      // If date parsing fails, continue with normal calculation
      console.warn('Error parsing goal_creation_month:', category.goal_creation_month, error);
    }
  }

  // Rule 1: Monthly NEED Goals (cadence = 1, frequency = 1)
  if (category.goal_cadence === 1 && category.goal_cadence_frequency === 1) {
    return {
      amount: category.goal_target,
      rule: "Rule 1: Monthly NEED",
      debugInfo: {
        calculation: `goal_target = ${category.goal_target}`,
        goal_cadence: category.goal_cadence,
        goal_cadence_frequency: category.goal_cadence_frequency
      }
    };
  }

  // Rule 2: Weekly NEED Goals (cadence = 2, frequency = 1) - Takes precedence over months to budget
  if (category.goal_cadence === 2 && category.goal_cadence_frequency === 1 &&
      typeof category.goal_day === 'number') {
    if (!currentMonth) {
      return {
        amount: category.goal_target,
        rule: "Rule 2: Weekly NEED (fallback)",
        debugInfo: {
          calculation: `goal_target = ${category.goal_target} (no currentMonth provided)`,
          goal_cadence: category.goal_cadence,
          goal_cadence_frequency: category.goal_cadence_frequency,
          goal_day: category.goal_day
        }
      };
    }

    try {
      const parts = currentMonth.split('-');
      if (parts.length < 2) {
        return {
          amount: category.goal_target,
          rule: "Rule 2: Weekly NEED (invalid month format)",
          debugInfo: {
            calculation: `goal_target = ${category.goal_target} (invalid month format)`,
            currentMonth: currentMonth
          }
        };
      }
      const year = parseInt(parts[0]!, 10);
      const month = parseInt(parts[1]!, 10);
      if (isNaN(year) || isNaN(month)) {
        return {
          amount: category.goal_target,
          rule: "Rule 2: Weekly NEED (invalid date)",
          debugInfo: {
            calculation: `goal_target = ${category.goal_target} (invalid date parsing)`,
            currentMonth: currentMonth
          }
        };
      }
      const dayCount = safeCountDayOccurrences(year, month, category.goal_day);
      const amount = Math.round(category.goal_target * dayCount);
      return {
        amount,
        rule: `Rule 2: Weekly NEED (${dayCount} occurrences)`,
        debugInfo: {
          calculation: `${category.goal_target} × ${dayCount} = ${amount}`,
          goal_cadence: category.goal_cadence,
          goal_cadence_frequency: category.goal_cadence_frequency,
          goal_day: category.goal_day,
          currentMonth: currentMonth,
          dayCount: dayCount
        }
      };
    } catch (error) {
      console.warn('Error calculating weekly goal for month:', currentMonth, error);
      return {
        amount: category.goal_target,
        rule: "Rule 2: Weekly NEED (error fallback)",
        debugInfo: {
          calculation: `goal_target = ${category.goal_target} (error in calculation)`,
          error: error instanceof Error ? error.message : 'Unknown error',
          goal_cadence: category.goal_cadence,
          goal_cadence_frequency: category.goal_cadence_frequency,
          goal_day: category.goal_day,
          currentMonth: currentMonth
        }
      };
    }
  }

  // Rule 3: Goals with months to budget (only if no specific cadence rules apply)
  if (category.goal_months_to_budget && category.goal_months_to_budget > 0) {
    const overallLeft = category.goal_overall_left || 0;
    const budgeted = category.budgeted || 0;
    const amount = Math.round((overallLeft + budgeted) / category.goal_months_to_budget);
    return {
      amount,
      rule: "Rule 3: Months to Budget",
      debugInfo: {
        calculation: `(${overallLeft} + ${budgeted}) ÷ ${category.goal_months_to_budget} = ${amount}`,
        goal_overall_left: overallLeft,
        budgeted: budgeted,
        goal_months_to_budget: category.goal_months_to_budget
      }
    };
  }

  // Rule 5: Low months to budget (zero target when <= 0)
  if (typeof category.goal_months_to_budget === 'number' && category.goal_months_to_budget <= 0) {
    return {
      amount: 0,
      rule: "Rule 5: Low Months to Budget",
      debugInfo: {
        calculation: `goal_months_to_budget = ${category.goal_months_to_budget} (≤ 0) → 0`,
        goal_months_to_budget: category.goal_months_to_budget,
        reason: "Months to budget is zero or negative"
      }
    };
  }

  // Rule 4: All other cases - fallback to goal_target
  return {
    amount: category.goal_target,
    rule: "Rule 4: Fallback",
    debugInfo: {
      calculation: `goal_target = ${category.goal_target}`,
      goal_type: category.goal_type,
      goal_cadence: category.goal_cadence,
      goal_cadence_frequency: category.goal_cadence_frequency,
      reason: "No specific rule matched"
    }
  };
}

/**
 * Extract target amount from YNAB category goal fields for monthly analysis
 * Uses the simplified calculateNeededThisMonth logic
 */
export function extractTargetAmount(category: YNABCategory, currentMonth?: string): number | null {
  return calculateNeededThisMonth(category, currentMonth);
}

/**
 * Extract the original monthly target amount for variance calculations
 * @deprecated Use calculateNeededThisMonth instead
 */
export function extractOriginalMonthlyTarget(category: YNABCategory, currentMonth?: string): number | null {
  return calculateNeededThisMonth(category, currentMonth);
}

/**
 * Extract current "needed this month" amount for funding guidance
 * @deprecated Use calculateNeededThisMonth instead
 */
export function extractCurrentNeededAmount(category: YNABCategory, currentMonth?: string): number | null {
  return calculateNeededThisMonth(category, currentMonth);
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
  // Use simplified calculation with debug information
  const calculationResult = calculateNeededThisMonthWithRule(category, currentMonth);
  const neededThisMonth = calculationResult.amount;
  const assigned = category.budgeted;
  const variance = neededThisMonth !== null ? assigned - neededThisMonth : 0;
  const alignmentStatus = determineAlignmentStatus(assigned, neededThisMonth, config.toleranceMilliunits);
  const percentageOfTarget = calculateTargetPercentage(assigned, neededThisMonth);

  // Create debug information for all categories (including those without goals)
  const debugInfo = {
    rawFields: {
      goal_type: category.goal_type ?? null,
      goal_target: category.goal_target ?? null,
      goal_creation_month: category.goal_creation_month ?? null,
      goal_cadence: category.goal_cadence ?? null,
      goal_cadence_frequency: category.goal_cadence_frequency ?? null,
      goal_day: category.goal_day ?? null,
      goal_months_to_budget: category.goal_months_to_budget ?? null,
      goal_overall_left: category.goal_overall_left ?? null,
      budgeted: category.budgeted,
      balance: category.balance,
      activity: category.activity,
    },
    calculationRule: calculationResult.rule,
    calculationDetails: calculationResult.debugInfo,
  };

  return {
    id: category.id,
    name: category.name,
    categoryGroupName: categoryGroupName || category.category_group_name || 'Unknown',
    assigned,
    neededThisMonth,
    target: neededThisMonth, // Alias for backward compatibility
    targetType: category.goal_type || null,
    variance,
    alignmentStatus,
    percentageOfTarget,
    isHidden: category.hidden,
    hasTarget: neededThisMonth !== null,
    goalPercentageComplete: category.goal_percentage_complete,
    goalUnderFunded: category.goal_under_funded,
    goalOverallLeft: category.goal_overall_left,
    debugInfo,
  };
}

/**
 * Calculate variance details for a category
 */
export function calculateCategoryVariance(
  category: ProcessedCategory,
  month: string
): CategoryVariance | null {
  if (!category.hasTarget || category.neededThisMonth === null || category.neededThisMonth === 0) {
    return null;
  }

  const variancePercentage = (category.variance / category.neededThisMonth) * 100;

  // Handle edge cases where percentage calculation results in invalid numbers
  const safeVariancePercentage = (!isNaN(variancePercentage) && isFinite(variancePercentage))
    ? variancePercentage
    : null;

  return {
    categoryId: category.id,
    categoryName: category.name,
    categoryGroupName: category.categoryGroupName,
    assigned: category.assigned,
    target: category.neededThisMonth,
    variance: category.variance,
    variancePercentage: safeVariancePercentage,
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

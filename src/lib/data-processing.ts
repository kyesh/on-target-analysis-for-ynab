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
 * Extract target amount from YNAB category goal fields
 */
export function extractTargetAmount(category: YNABCategory): number | null {
  // Handle different goal types according to YNAB API research
  switch (category.goal_type) {
    case 'TB': // Target Category Balance
    case 'TBD': // Target Category Balance by Date
      return category.goal_target || null;
    
    case 'MF': // Monthly Funding
      return category.goal_target || null;
    
    case 'NEED': // Plan Your Spending
      // For NEED goals, use goal_target if available
      return category.goal_target || null;
    
    case 'DEBT': // Debt Payoff Goal
      // For debt goals, might use monthly payment amount
      return category.goal_target || null;
    
    default:
      return null;
  }
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
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
): ProcessedCategory {
  const target = extractTargetAmount(category);
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

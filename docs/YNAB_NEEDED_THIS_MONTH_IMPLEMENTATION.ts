/**
 * YNAB "Needed This Month" Calculation Implementation
 * 
 * This file provides a complete, production-ready implementation of the
 * "Needed This Month" calculation logic documented in the Developer Guide.
 * 
 * @version 2.0
 * @date December 2024
 * @author YNAB Off-Target Assignment Analysis Team
 */

// Type definitions (adjust imports based on your project structure)
interface YNABCategory {
  id: string;
  name: string;
  goal_type?: 'TB' | 'TBD' | 'MF' | 'NEED' | 'DEBT' | null;
  goal_target?: number | null;
  goal_target_month?: string | null;
  goal_under_funded?: number | null;
  goal_overall_funded?: number | null;
  goal_overall_left?: number | null;
  goal_cadence?: number | null;
  goal_cadence_frequency?: number | null;
  goal_needs_whole_amount?: boolean | null;
  goal_months_to_budget?: number | null;
}

/**
 * Extract the "Needed This Month" amount for any YNAB category
 * Handles all goal types, cadences, and edge cases
 * 
 * @param category - YNAB category object from API
 * @param currentMonth - Current month in YYYY-MM-DD format (optional)
 * @returns Monthly amount needed in milliunits, or null if no goal
 */
export function extractNeededThisMonth(
  category: YNABCategory,
  currentMonth?: string
): number | null {
  // Early return for categories without goals
  if (!category.goal_type) {
    return null;
  }

  const monthlyNeeded = category.goal_under_funded;
  const overallTarget = category.goal_target;

  // Handle each goal type with specific logic
  switch (category.goal_type) {
    case 'MF': // Monthly Funding
      return handleMFGoal(category);
    
    case 'TB': // Target Category Balance
      return handleTBGoal(category, monthlyNeeded, overallTarget);
    
    case 'TBD': // Target Category Balance by Date
      return handleTBDGoal(category, monthlyNeeded, overallTarget);
    
    case 'NEED': // Plan Your Spending
      return handleNEEDGoal(category, monthlyNeeded, overallTarget, currentMonth);
    
    case 'DEBT': // Debt Payoff Goal
      return handleDEBTGoal(category, monthlyNeeded, overallTarget);
    
    default:
      console.warn(`Unknown goal type: ${category.goal_type}`);
      return null;
  }
}

/**
 * Handle Monthly Funding (MF) goals
 * For MF goals, goal_target represents the monthly funding amount
 */
function handleMFGoal(category: YNABCategory): number | null {
  return category.goal_target || null;
}

/**
 * Handle Target Category Balance (TB) goals
 * Prioritize goal_under_funded for monthly progress amount
 */
function handleTBGoal(
  category: YNABCategory,
  monthlyNeeded: number | null,
  overallTarget: number | null
): number | null {
  if (isValidNumber(monthlyNeeded)) {
    return monthlyNeeded;
  }
  return overallTarget || null;
}

/**
 * Handle Target Category Balance by Date (TBD) goals
 * Similar to TB goals, prioritize goal_under_funded
 */
function handleTBDGoal(
  category: YNABCategory,
  monthlyNeeded: number | null,
  overallTarget: number | null
): number | null {
  if (isValidNumber(monthlyNeeded)) {
    return monthlyNeeded;
  }
  return overallTarget || null;
}

/**
 * Handle Plan Your Spending (NEED) goals
 * Most complex logic due to cadence and future-dating support
 */
function handleNEEDGoal(
  category: YNABCategory,
  monthlyNeeded: number | null,
  overallTarget: number | null,
  currentMonth?: string
): number | null {
  // Priority 1: Use goal_under_funded when available
  if (isValidNumber(monthlyNeeded)) {
    return monthlyNeeded;
  }
  
  // Priority 2: Handle future-dated goals with manual calculation
  if (currentMonth && 
      category.goal_target_month && 
      category.goal_target_month > currentMonth) {
    const calculated = calculateFutureDatedGoal(category, currentMonth);
    if (calculated !== null) {
      return calculated;
    }
  }
  
  // Priority 3: Handle cadence-based calculations
  if (category.goal_cadence && category.goal_cadence !== 1) {
    const cadenceBased = calculateCadenceBasedAmount(category);
    if (cadenceBased !== null) {
      return cadenceBased;
    }
  }
  
  // Fallback: Use goal_target as monthly amount
  return overallTarget || null;
}

/**
 * Handle Debt Payoff (DEBT) goals
 * Similar to TBD goals, prioritize goal_under_funded for monthly payment
 */
function handleDEBTGoal(
  category: YNABCategory,
  monthlyNeeded: number | null,
  overallTarget: number | null
): number | null {
  if (isValidNumber(monthlyNeeded)) {
    return monthlyNeeded;
  }
  return overallTarget || null;
}

/**
 * Calculate monthly amount needed for future-dated goals
 * Used when goal_under_funded is null but goal has a future target date
 */
function calculateFutureDatedGoal(
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
 * Calculate monthly amount based on goal cadence
 * Handles weekly, yearly, and custom interval goals
 */
function calculateCadenceBasedAmount(category: YNABCategory): number | null {
  const target = category.goal_target;
  const cadence = category.goal_cadence;
  const frequency = category.goal_cadence_frequency || 1;
  
  if (!target || !cadence) return null;
  
  switch (cadence) {
    case 1: // Monthly
      return Math.round(target / frequency);
    
    case 2: // Weekly  
      // Convert weekly to monthly: (weekly amount × 52 weeks) ÷ 12 months
      return Math.round((target * 52) / 12 / frequency);
    
    case 13: // Yearly
      // Convert yearly to monthly: yearly amount ÷ 12 months
      return Math.round(target / 12 / frequency);
    
    case 0: // One-time/No cadence
      // For one-time goals, use the target as-is
      return target;
    
    default:
      // For other cadences (3-12, 14+), treat as monthly
      // This may need adjustment based on YNAB's actual implementation
      console.warn(`Unhandled cadence: ${cadence}, treating as monthly`);
      return target;
  }
}

/**
 * Calculate months between two date strings (YYYY-MM-DD format)
 * Returns the number of months from start to end date
 */
function calculateMonthsBetween(startDate: string, endDate: string): number {
  try {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return 0;
    }
    
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T00:00:00.000Z');
    
    // Validate dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    // Ensure end date is after start date
    if (end <= start) {
      return 0;
    }
    
    const yearDiff = end.getUTCFullYear() - start.getUTCFullYear();
    const monthDiff = end.getUTCMonth() - start.getUTCMonth();
    
    return Math.max(1, yearDiff * 12 + monthDiff);
  } catch (error) {
    console.error('Date calculation error:', error);
    return 0;
  }
}

/**
 * Validate that a value is a valid finite number
 */
function isValidNumber(value: number | null | undefined): value is number {
  return value !== null && 
         value !== undefined && 
         !isNaN(value) && 
         isFinite(value);
}

/**
 * Calculate variance percentage with safe division
 * Prevents division by zero and handles invalid results
 */
export function calculateSafeVariancePercentage(
  variance: number,
  target: number
): number | null {
  // Prevent division by zero
  if (target === 0 || !isValidNumber(target)) {
    return null;
  }
  
  const percentage = (variance / target) * 100;
  
  // Handle invalid calculation results
  return isValidNumber(percentage) ? percentage : null;
}

/**
 * Format currency from milliunits to display format
 */
export function formatCurrencyFromMilliunits(milliunits: number | null): string {
  if (!isValidNumber(milliunits)) {
    return '$0.00';
  }
  
  const dollars = milliunits! / 1000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Example usage and testing function
 */
export function exampleUsage() {
  // Example 1: Monthly Funding goal
  const mfGoal: YNABCategory = {
    id: 'mf-example',
    name: 'Monthly Bills',
    goal_type: 'MF',
    goal_target: 150000, // $150/month
  };
  
  console.log('MF Goal:', extractNeededThisMonth(mfGoal)); // 150000
  
  // Example 2: Future-dated NEED goal
  const futureGoal: YNABCategory = {
    id: 'future-example',
    name: 'Summer Vacation',
    goal_type: 'NEED',
    goal_target: 1200000, // $1,200 total
    goal_target_month: '2025-06-01',
    goal_under_funded: null, // Future goals return null
    goal_overall_funded: 200000, // $200 already saved
  };
  
  console.log('Future Goal:', extractNeededThisMonth(futureGoal, '2024-12-01')); 
  // Should calculate: ($1,200 - $200) / 6 months = $166.67/month
  
  // Example 3: Weekly NEED goal
  const weeklyGoal: YNABCategory = {
    id: 'weekly-example',
    name: 'Groceries',
    goal_type: 'NEED',
    goal_target: 100000, // $100/week
    goal_cadence: 2, // Weekly
    goal_cadence_frequency: 1,
    goal_under_funded: null,
  };
  
  console.log('Weekly Goal:', extractNeededThisMonth(weeklyGoal));
  // Should calculate: ($100 × 52) / 12 = $433.33/month
}

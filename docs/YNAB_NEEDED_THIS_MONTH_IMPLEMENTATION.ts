/**
 * YNAB "Needed This Month" Simplified Calculation Implementation
 *
 * This file provides a simplified, production-ready implementation using
 * four definitive rules that eliminate complexity while maintaining accuracy.
 *
 * @version 3.0
 * @date December 2024
 * @author YNAB Off-Target Assignment Analysis Team
 */

// Type definitions (adjust imports based on your project structure)
interface YNABCategory {
  id: string;
  name: string;
  goal_type?: 'TB' | 'TBD' | 'MF' | 'NEED' | 'DEBT' | null;
  goal_target?: number | null;
  goal_day?: number | null;
  goal_cadence?: number | null;
  goal_cadence_frequency?: number | null;
  goal_months_to_budget?: number | null;
  goal_overall_left?: number | null;
  budgeted?: number | null;
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
 * Calculate "Needed This Month" amount using simplified YNAB rules
 *
 * @param category - YNAB category object from API
 * @param currentMonth - Current month in YYYY-MM-DD format (optional)
 * @returns Monthly amount needed in milliunits, or null if no goal
 */
export function calculateNeededThisMonth(
  category: YNABCategory,
  currentMonth?: string
): number | null {
  // Return null if no goal type is set
  if (!category.goal_type || !category.goal_target) {
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
      return category.goal_target; // Fallback
    }

    try {
      const [year, month] = currentMonth.split('-').map(Number);
      const dayCount = countDayOccurrencesInMonth(year, month, category.goal_day);
      return Math.round(category.goal_target * dayCount);
    } catch (error) {
      console.warn('Error calculating weekly goal:', error);
      return category.goal_target; // Fallback on error
    }
  }

  // Rule 4: All other cases - fallback to goal_target
  return category.goal_target;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateNeededThisMonth instead
 */
export function extractNeededThisMonth(
  category: YNABCategory,
  currentMonth?: string
): number | null {
  return calculateNeededThisMonth(category, currentMonth);
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
 * Simplified example usage demonstrating the four rules
 */
export function exampleUsage() {
  // Example 1: Monthly NEED Goal (Rule 1)
  const monthlyGoal: YNABCategory = {
    id: 'monthly-example',
    name: 'Monthly Subscription',
    goal_type: 'NEED',
    goal_target: 60000, // $60/month
    goal_cadence: 1,
    goal_cadence_frequency: 1,
  };

  console.log('Monthly Goal:', calculateNeededThisMonth(monthlyGoal)); // 60000

  // Example 2: Weekly NEED Goal (Rule 2)
  const weeklyGoal: YNABCategory = {
    id: 'weekly-example',
    name: 'Groceries',
    goal_type: 'NEED',
    goal_target: 100000, // $100 per occurrence
    goal_cadence: 2, // Weekly
    goal_cadence_frequency: 1,
    goal_day: 1, // Monday
  };

  // December 2024 has 5 Mondays
  console.log('Weekly Goal:', calculateNeededThisMonth(weeklyGoal, '2024-12-01')); // 500000

  // Example 3: Months to Budget Goal (Rule 3)
  const monthsToBudgetGoal: YNABCategory = {
    id: 'months-example',
    name: 'Vacation Fund',
    goal_type: 'TBD',
    goal_target: 120000,
    goal_months_to_budget: 4,
    goal_overall_left: 80000,
    budgeted: 20000,
  };

  console.log('Months to Budget Goal:', calculateNeededThisMonth(monthsToBudgetGoal)); // 25000

  // Example 4: Monthly Funding Goal (Rule 4 - Fallback)
  const mfGoal: YNABCategory = {
    id: 'mf-example',
    name: 'Monthly Bills',
    goal_type: 'MF',
    goal_target: 150000, // $150/month
  };

  console.log('MF Goal:', calculateNeededThisMonth(mfGoal)); // 150000
}

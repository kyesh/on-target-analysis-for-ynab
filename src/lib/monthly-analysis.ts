/**
 * Monthly Analysis Engine for YNAB Target Alignment
 * Processes YNAB month data and generates comprehensive analysis
 */

import { YNABMonth, YNABCategoryGroup } from '@/types/ynab';
import { 
  MonthlyAnalysis, 
  ProcessedCategory, 
  CategoryVariance,
  DashboardSummary,
  BudgetDisciplineRating,
  AnalysisConfig 
} from '@/types/analysis';
import {
  processCategory,
  shouldIncludeCategory,
  calculateCategoryVariance,
  validateMonthFormat,
  DEFAULT_ANALYSIS_CONFIG
} from './data-processing';

/**
 * Process YNAB month data into comprehensive analysis
 */
export function analyzeMonth(
  monthData: YNABMonth,
  budgetId: string,
  budgetName: string,
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
): MonthlyAnalysis {
  if (!validateMonthFormat(monthData.month)) {
    throw new Error(`Invalid month format: ${monthData.month}`);
  }

  // Process all categories
  const processedCategories: ProcessedCategory[] = [];
  
  monthData.categories.forEach(category => {
    if (shouldIncludeCategory(category, config)) {
      const processed = processCategory(category, '', config, monthData.month);
      processedCategories.push(processed);
    }
  });

  // Calculate totals and metrics
  const totalAssigned = processedCategories.reduce((sum, cat) => sum + cat.assigned, 0);
  const categoriesWithTargets = processedCategories.filter(cat => cat.hasTarget);
  const totalTargeted = categoriesWithTargets.reduce((sum, cat) => sum + (cat.target || 0), 0);

  // Calculate alignment amounts
  const onTargetAmount = processedCategories
    .filter(cat => cat.alignmentStatus === 'on-target')
    .reduce((sum, cat) => sum + cat.assigned, 0);

  const overTargetAmount = processedCategories
    .filter(cat => cat.alignmentStatus === 'over-target')
    .reduce((sum, cat) => sum + Math.max(0, cat.variance), 0);

  const underTargetAmount = processedCategories
    .filter(cat => cat.alignmentStatus === 'under-target')
    .reduce((sum, cat) => sum + Math.abs(Math.min(0, cat.variance)), 0);

  const noTargetAmount = processedCategories
    .filter(cat => cat.alignmentStatus === 'no-target')
    .reduce((sum, cat) => sum + cat.assigned, 0);

  // Calculate percentages
  const onTargetPercentage = totalAssigned > 0 ? (onTargetAmount / totalAssigned) * 100 : 0;
  const overTargetPercentage = totalAssigned > 0 ? (overTargetAmount / totalAssigned) * 100 : 0;
  const underTargetPercentage = totalAssigned > 0 ? (underTargetAmount / totalAssigned) * 100 : 0;
  const noTargetPercentage = totalAssigned > 0 ? (noTargetAmount / totalAssigned) * 100 : 0;

  // Count categories by status
  const categoriesOverTarget = processedCategories.filter(cat => cat.alignmentStatus === 'over-target').length;
  const categoriesUnderTarget = processedCategories.filter(cat => cat.alignmentStatus === 'under-target').length;
  const categoriesWithoutTargets = processedCategories.filter(cat => cat.alignmentStatus === 'no-target').length;

  return {
    month: monthData.month,
    budgetId,
    budgetName,
    totalAssigned,
    totalTargeted,
    onTargetAmount,
    overTargetAmount,
    noTargetAmount,
    underTargetAmount,
    onTargetPercentage,
    overTargetPercentage,
    noTargetPercentage,
    underTargetPercentage,
    categoriesAnalyzed: processedCategories.length,
    categoriesWithTargets: categoriesWithTargets.length,
    categoriesOverTarget,
    categoriesUnderTarget,
    categoriesWithoutTargets,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Process category groups data into analysis format
 */
export function analyzeCategoryGroups(
  categoryGroups: YNABCategoryGroup[],
  month: string,
  budgetId: string,
  budgetName: string,
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
): MonthlyAnalysis {
  // Flatten all categories from all groups
  const allCategories = categoryGroups.flatMap(group =>
    group.categories.map(category => ({
      ...category,
      category_group_name: group.name
    }))
  );

  // Create a mock month object for analysis
  const monthData: YNABMonth = {
    month,
    note: '',
    income: 0,
    budgeted: allCategories.reduce((sum, cat) => sum + cat.budgeted, 0),
    activity: allCategories.reduce((sum, cat) => sum + cat.activity, 0),
    to_be_budgeted: 0,
    deleted: false,
    categories: allCategories,
  };

  return analyzeMonth(monthData, budgetId, budgetName, config);
}

/**
 * Get top variance categories (over-target and under-target)
 */
export function getTopVarianceCategories(
  monthData: YNABMonth,
  month: string,
  limit: number = 10,
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
): { overTarget: CategoryVariance[]; underTarget: CategoryVariance[] } {
  const processedCategories = monthData.categories
    .filter(category => shouldIncludeCategory(category, config))
    .map(category => processCategory(category, '', config, month))
    .filter(category => category.hasTarget);

  const variances = processedCategories
    .map(category => calculateCategoryVariance(category, month))
    .filter((variance): variance is CategoryVariance => variance !== null);

  // Sort by absolute variance amount (highest impact first)
  const overTarget = variances
    .filter(v => v.variance > 0)
    .sort((a, b) => b.variance - a.variance)
    .slice(0, limit);

  const underTarget = variances
    .filter(v => v.variance < 0)
    .sort((a, b) => a.variance - b.variance) // Most negative first
    .slice(0, limit);

  return { overTarget, underTarget };
}

/**
 * Calculate budget discipline rating based on target alignment
 */
export function calculateBudgetDisciplineRating(analysis: MonthlyAnalysis): BudgetDisciplineRating {
  const { onTargetPercentage, overTargetPercentage } = analysis;
  
  // Rating based on percentage of assignments that are on-target or reasonably close
  const disciplineScore = onTargetPercentage + (overTargetPercentage * 0.5); // Over-target gets partial credit
  
  if (disciplineScore >= 85) return 'Excellent';
  if (disciplineScore >= 70) return 'Good';
  if (disciplineScore >= 50) return 'Fair';
  return 'Needs Improvement';
}

/**
 * Calculate target alignment score (0-100)
 */
export function calculateTargetAlignmentScore(analysis: MonthlyAnalysis): number {
  const { 
    onTargetPercentage, 
    overTargetPercentage, 
    underTargetPercentage,
    categoriesWithTargets,
    categoriesAnalyzed 
  } = analysis;
  
  // Base score from on-target percentage
  let score = onTargetPercentage;
  
  // Partial credit for over-target (better than under-target)
  score += overTargetPercentage * 0.3;
  
  // Penalty for under-target
  score -= underTargetPercentage * 0.5;
  
  // Bonus for having targets set (encourages target setting)
  const targetCoverage = categoriesAnalyzed > 0 ? (categoriesWithTargets / categoriesAnalyzed) * 100 : 0;
  score += targetCoverage * 0.1;
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate comprehensive dashboard summary
 */
export function generateDashboardSummary(
  monthData: YNABMonth,
  budgetId: string,
  budgetName: string,
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
): DashboardSummary {
  const monthlyAnalysis = analyzeMonth(monthData, budgetId, budgetName, config);
  const { overTarget, underTarget } = getTopVarianceCategories(monthData, monthData.month, 10, config);
  
  // Process all categories with debug information
  const allCategories = monthData.categories
    .filter(category => shouldIncludeCategory(category, config))
    .map(category => processCategory(category, '', config, monthData.month));

  // Get categories without targets that have assignments
  const categoriesWithoutTargets = allCategories
    .filter(category => !category.hasTarget && category.assigned !== 0);

  // Calculate key metrics
  const targetAlignmentScore = calculateTargetAlignmentScore(monthlyAnalysis);
  const budgetDisciplineRating = calculateBudgetDisciplineRating(monthlyAnalysis);

  const totalVariance = [...overTarget, ...underTarget]
    .reduce((sum, variance) => sum + Math.abs(variance.variance), 0);

  const averageTargetAchievement = monthlyAnalysis.categoriesWithTargets > 0
    ? (monthlyAnalysis.onTargetAmount + monthlyAnalysis.overTargetAmount) / monthlyAnalysis.totalTargeted * 100
    : 0;

  return {
    selectedMonth: monthData.month,
    monthlyAnalysis,
    topOverTargetCategories: overTarget,
    topUnderTargetCategories: underTarget,
    categoriesWithoutTargets,
    categories: allCategories, // Include all categories with debug information
    keyMetrics: {
      targetAlignmentScore,
      budgetDisciplineRating,
      totalVariance,
      averageTargetAchievement,
    },
  };
}

/**
 * Application-specific types for budget target alignment analysis
 */

import { YNABCategory, GoalType } from './ynab';

// Target Alignment Status
export type AlignmentStatus =
  | 'on-target'
  | 'over-target'
  | 'under-target'
  | 'no-target';

// Budget Discipline Rating
export type BudgetDisciplineRating =
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Needs Improvement';

// Processed Category Analysis
export interface ProcessedCategory {
  id: string;
  name: string;
  categoryGroupName: string;
  assigned: number; // milliunits assigned this month
  neededThisMonth: number | null; // milliunits needed this month (simplified calculation)
  target: number | null; // milliunits target (alias to neededThisMonth for backward compatibility)
  targetType: GoalType | null; // goal_type from YNAB
  variance: number; // assigned - target (positive = over-target)
  alignmentStatus: AlignmentStatus;
  percentageOfTarget: number | null; // (assigned / target) * 100
  isHidden: boolean;
  hasTarget: boolean;

  // Additional goal information
  goalPercentageComplete?: number | null;
  goalUnderFunded?: number | null;
  goalOverallLeft?: number | null;

  // Debug information for calculation validation
  debugInfo?: {
    // Raw YNAB API fields
    rawFields: {
      goal_type: string | null;
      goal_target: number | null;
      goal_creation_month: string | null;
      goal_cadence: number | null;
      goal_cadence_frequency: number | null;
      goal_day: number | null;
      goal_months_to_budget: number | null;
      goal_overall_left: number | null;
      budgeted: number;
      balance: number;
      activity: number;
    };
    // Calculation details
    calculationRule: string;
    calculationDetails?: any;
  };
}

// Monthly Analysis Summary
export interface MonthlyAnalysis {
  month: string; // YYYY-MM-DD format
  budgetId: string;
  budgetName: string;
  totalIncome: number; // milliunits - from YNAB API income field
  totalActivity: number; // milliunits - from YNAB API activity field
  totalAssigned: number; // milliunits
  totalTargeted: number; // milliunits (sum of all targets)
  onTargetAmount: number; // milliunits assigned to categories within target
  overTargetAmount: number; // milliunits assigned above targets
  noTargetAmount: number; // milliunits assigned to categories without targets
  underTargetAmount: number; // milliunits under-assigned relative to targets
  onTargetPercentage: number; // (onTargetAmount / totalAssigned) * 100
  overTargetPercentage: number; // (overTargetAmount / totalAssigned) * 100
  noTargetPercentage: number; // (noTargetAmount / totalAssigned) * 100
  underTargetPercentage: number; // (underTargetAmount / totalAssigned) * 100
  categoriesAnalyzed: number;
  categoriesWithTargets: number;
  categoriesOverTarget: number;
  categoriesUnderTarget: number;
  categoriesWithoutTargets: number;
  budgetDisciplineRating: BudgetDisciplineRating;
  lastUpdated: string; // ISO 8601 timestamp
}

// Category Variance Detail
export interface CategoryVariance {
  categoryId: string;
  categoryName: string;
  categoryGroupName: string;
  assigned: number; // milliunits
  target: number; // milliunits (non-null for variance calculations)
  variance: number; // milliunits (assigned - target)
  variancePercentage: number | null; // (variance / target) * 100, null if invalid
  targetType: GoalType | null;
  month: string;
}

// Dashboard Summary
export interface DashboardSummary {
  selectedMonth: string;
  monthlyAnalysis: MonthlyAnalysis;
  topOverTargetCategories: CategoryVariance[]; // Top 10 over-target
  topUnderTargetCategories: CategoryVariance[]; // Top 10 under-target
  categoriesWithoutTargets: ProcessedCategory[]; // Categories with assignments but no targets
  categories: ProcessedCategory[]; // All categories with debug information
  keyMetrics: {
    targetAlignmentScore: number; // 0-100 score based on alignment
    budgetDisciplineRating: BudgetDisciplineRating;
    totalVariance: number; // Total absolute variance from targets
    averageTargetAchievement: number; // Average percentage of targets met
  };
}

// Monthly Analysis Response (API response format)
export interface MonthlyAnalysisResponse {
  selectedMonth: string;
  monthlyAnalysis: MonthlyAnalysis;
  topOverTargetCategories: CategoryVariance[];
  topUnderTargetCategories: CategoryVariance[];
  categoriesWithoutTargets: ProcessedCategory[];
  categories: ProcessedCategory[];
  keyMetrics: {
    targetAlignmentScore: number;
    budgetDisciplineRating: BudgetDisciplineRating;
    totalVariance: number;
    averageTargetAchievement: number;
  };
}

// Goal Type Descriptions
export const GOAL_TYPE_DESCRIPTIONS: Record<string, string> = {
  TB: 'Target Category Balance',
  TBD: 'Target Category Balance by Date',
  MF: 'Monthly Funding',
  NEED: 'Plan Your Spending',
  DEBT: 'Debt Payoff Goal',
};

// Analysis Configuration
export interface AnalysisConfig {
  toleranceMilliunits: number; // Tolerance for "on-target" calculation
  includeHiddenCategories: boolean;
  includeDeletedCategories: boolean;
  minimumAssignmentThreshold: number; // Minimum assignment to consider
}

// Filter Options
export interface FilterOptions {
  alignmentStatus?: AlignmentStatus[];
  targetTypes?: GoalType[];
  categoryGroups?: string[];
  showHidden?: boolean;
  minimumVariance?: number;
}

// Sort Options
export type SortField =
  | 'name'
  | 'assigned'
  | 'target'
  | 'variance'
  | 'variancePercentage';
export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

// Export Data Format
export interface ExportData {
  month: string;
  budgetName: string;
  summary: MonthlyAnalysis;
  categories: ProcessedCategory[];
  generatedAt: string;
  version: string;
}

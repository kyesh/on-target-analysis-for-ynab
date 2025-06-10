/**
 * YNAB API Types - Based on confirmed API research findings
 * All interfaces match the official YNAB API v1 specification
 */

// Goal/Target Types - CONFIRMED AVAILABLE
export type GoalType = 'TB' | 'TBD' | 'MF' | 'NEED' | 'DEBT' | null;

// YNAB Category Interface - CONFIRMED COMPLETE
export interface YNABCategory {
  id: string;
  category_group_id: string;
  category_group_name?: string;
  name: string;
  hidden: boolean;
  original_category_group_id?: string | null; // DEPRECATED: Always null
  note?: string | null;
  budgeted: number; // milliunits - amount assigned in current month
  activity: number; // milliunits - amount spent in current month
  balance: number; // milliunits - current balance
  
  // TARGET/GOAL FIELDS - ALL CONFIRMED AVAILABLE
  goal_type?: GoalType;
  goal_target?: number | null; // milliunits - target amount
  goal_target_month?: string | null; // YYYY-MM-DD format
  goal_creation_month?: string | null; // YYYY-MM-DD format
  goal_percentage_complete?: number | null; // 0-100 percentage
  goal_months_to_budget?: number | null; // months left in goal period
  goal_under_funded?: number | null; // milliunits - amount needed this month
  goal_overall_funded?: number | null; // milliunits - total funded toward goal
  goal_overall_left?: number | null; // milliunits - amount still needed
  goal_needs_whole_amount?: boolean | null; // rollover behavior for NEED goals
  goal_day?: number | null; // day offset for goal due date
  goal_cadence?: number | null; // goal cadence (0-14)
  goal_cadence_frequency?: number | null; // cadence frequency
  
  deleted: boolean;
}

// YNAB Budget Interface
export interface YNABBudget {
  id: string;
  name: string;
  last_modified_on: string; // ISO 8601 date
  first_month: string; // YYYY-MM-DD format
  last_month: string; // YYYY-MM-DD format
  date_format?: {
    format: string;
  };
  currency_format?: YNABCurrencyFormat;
}

// Currency Format Interface
export interface YNABCurrencyFormat {
  iso_code: string;
  example_format: string;
  decimal_digits: number;
  decimal_separator: string;
  symbol_first: boolean;
  group_separator: string;
  currency_symbol: string;
  display_symbol: boolean;
}

// YNAB Month Interface
export interface YNABMonth {
  month: string; // YYYY-MM-DD format (first day of month)
  note?: string;
  income: number; // milliunits
  budgeted: number; // milliunits - total assigned this month
  activity: number; // milliunits - total spent this month
  to_be_budgeted: number; // milliunits - remaining to assign
  age_of_money?: number;
  deleted: boolean;
  categories: YNABCategory[];
}

// YNAB Category Group Interface
export interface YNABCategoryGroup {
  id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
  categories: YNABCategory[];
}

// API Response Interfaces
export interface YNABBudgetsResponse {
  data: {
    budgets: YNABBudget[];
    default_budget?: YNABBudget;
  };
}

export interface YNABCategoriesResponse {
  data: {
    category_groups: YNABCategoryGroup[];
    server_knowledge: number;
  };
}

export interface YNABMonthResponse {
  data: {
    month: YNABMonth;
  };
}

export interface YNABCategoryResponse {
  data: {
    category: YNABCategory;
  };
}

// Error Response Interface
export interface YNABErrorResponse {
  error: {
    id: string;
    name: string;
    description: string;
    detail?: string;
  };
}

// User Interface
export interface YNABUser {
  id: string;
}

export interface YNABUserResponse {
  data: {
    user: YNABUser;
  };
}

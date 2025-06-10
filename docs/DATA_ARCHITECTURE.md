# YNAB Off-Target Assignment Analysis - Data Architecture Design

## Overview

This document defines the data models, structures, and flow for the YNAB Off-Target Assignment Analysis application. The application processes YNAB API data to analyze budget target alignment.

## YNAB API Data Models

### Core YNAB Data Structures

**✅ CONFIRMED:** Based on thorough research of the official YNAB API v1 documentation, OpenAPI specification, and TypeScript SDK, the following data structures are accurate and complete. **All target/goal data IS available through the API.**

#### Budget Object
```typescript
interface YNABBudget {
  id: string;
  name: string;
  last_modified_on: string; // ISO 8601 date
  first_month: string; // YYYY-MM-DD format
  last_month: string; // YYYY-MM-DD format
  date_format?: {
    format: string;
  };
  currency_format?: {
    iso_code: string;
    example_format: string;
    decimal_digits: number;
    decimal_separator: string;
    symbol_first: boolean;
    group_separator: string;
    currency_symbol: string;
    display_symbol: boolean;
  };
}
```

#### Category Object (CONFIRMED - Based on Official YNAB API v1)
```typescript
interface YNABCategory {
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
  goal_type?: 'TB' | 'TBD' | 'MF' | 'NEED' | 'DEBT' | null;
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
```

#### Month Object
```typescript
interface YNABMonth {
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
```

#### Category Group Object
```typescript
interface YNABCategoryGroup {
  id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
  categories: YNABCategory[];
}
```

## Application Data Models

### Processed Data Structures

#### Processed Category Analysis
```typescript
interface ProcessedCategory {
  id: string;
  name: string;
  categoryGroupName: string;
  assigned: number; // milliunits assigned this month
  target: number | null; // milliunits target (null if no target)
  targetType: string | null; // goal_type from YNAB
  variance: number; // assigned - target (positive = over-target)
  alignmentStatus: 'on-target' | 'over-target' | 'under-target' | 'no-target';
  percentageOfTarget: number | null; // (assigned / target) * 100
  isHidden: boolean;
  hasTarget: boolean;
}
```

#### Monthly Analysis Summary
```typescript
interface MonthlyAnalysis {
  month: string; // YYYY-MM-DD format
  budgetId: string;
  budgetName: string;
  totalAssigned: number; // milliunits
  totalTargeted: number; // milliunits (sum of all targets)
  onTargetAmount: number; // milliunits assigned to categories within target
  overTargetAmount: number; // milliunits assigned above targets
  noTargetAmount: number; // milliunits assigned to categories without targets
  onTargetPercentage: number; // (onTargetAmount / totalAssigned) * 100
  overTargetPercentage: number; // (overTargetAmount / totalAssigned) * 100
  noTargetPercentage: number; // (noTargetAmount / totalAssigned) * 100
  categoriesAnalyzed: number;
  categoriesWithTargets: number;
  categoriesOverTarget: number;
  categoriesWithoutTargets: number;
  lastUpdated: string; // ISO 8601 timestamp
}
```

#### Category Variance Detail
```typescript
interface CategoryVariance {
  categoryId: string;
  categoryName: string;
  categoryGroupName: string;
  assigned: number; // milliunits
  target: number; // milliunits
  variance: number; // milliunits (assigned - target)
  variancePercentage: number; // (variance / target) * 100
  targetType: string;
  month: string;
}
```

#### Dashboard Summary
```typescript
interface DashboardSummary {
  selectedMonth: string;
  monthlyAnalysis: MonthlyAnalysis;
  topOverTargetCategories: CategoryVariance[]; // Top 10 over-target
  categoriesWithoutTargets: ProcessedCategory[]; // Categories with assignments but no targets
  keyMetrics: {
    targetAlignmentScore: number; // 0-100 score based on alignment
    budgetDisciplineRating: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement';
    totalVariance: number; // Total absolute variance from targets
    averageTargetAchievement: number; // Average percentage of targets met
  };
}
```

## Data Processing Logic

### Target Alignment Calculation (CONFIRMED FEASIBLE)

```typescript
enum AlignmentStatus {
  ON_TARGET = 'on-target',      // assigned === target (within tolerance)
  OVER_TARGET = 'over-target',  // assigned > target
  UNDER_TARGET = 'under-target', // assigned < target
  NO_TARGET = 'no-target'       // no target set but has assignment
}

function calculateAlignmentStatus(
  category: YNABCategory,
  tolerance: number = 0 // milliunits tolerance for "on-target"
): AlignmentStatus {
  const assigned = category.budgeted; // milliunits assigned this month
  const target = category.goal_target; // milliunits target (null if no goal)

  // No target set
  if (target === null || target === 0) {
    return assigned > 0 ? AlignmentStatus.NO_TARGET : AlignmentStatus.ON_TARGET;
  }

  const variance = assigned - target;

  if (Math.abs(variance) <= tolerance) {
    return AlignmentStatus.ON_TARGET;
  } else if (variance > 0) {
    return AlignmentStatus.OVER_TARGET;
  } else {
    return AlignmentStatus.UNDER_TARGET;
  }
}

// Goal type descriptions for UI display
const GOAL_TYPE_DESCRIPTIONS: Record<string, string> = {
  'TB': 'Target Category Balance',
  'TBD': 'Target Category Balance by Date',
  'MF': 'Monthly Funding',
  'NEED': 'Plan Your Spending',
  'DEBT': 'Debt Payoff Goal'
};
```

### Currency Conversion

```typescript
// YNAB uses "milliunits" - 1000 milliunits = 1 currency unit
function milliunitsToCurrency(milliunits: number): number {
  return milliunits / 1000;
}

function currencyToMilliunits(currency: number): number {
  return Math.round(currency * 1000);
}

function formatCurrency(milliunits: number, currencyFormat: YNABCurrencyFormat): string {
  const amount = milliunitsToCurrency(milliunits);
  // Format according to budget's currency format
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyFormat.iso_code,
    minimumFractionDigits: currencyFormat.decimal_digits,
    maximumFractionDigits: currencyFormat.decimal_digits,
  }).format(amount);
}
```

## YNAB API Endpoints (CONFIRMED)

### Target Data Endpoints

**✅ CONFIRMED:** All target/goal data is available through these official YNAB API v1 endpoints:

#### Primary Endpoints for Target Analysis

1. **`GET /budgets/{budget_id}/categories`**
   - **Purpose**: Get all categories with current month data
   - **Target Data**: All goal fields included in response
   - **Use Case**: Initial dashboard load, current month analysis
   - **Rate Limit**: Counts as 1 request

2. **`GET /budgets/{budget_id}/months/{month}`**
   - **Purpose**: Get all categories for specific month
   - **Target Data**: All goal fields for specified month
   - **Use Case**: Historical analysis, month selection
   - **Rate Limit**: Counts as 1 request
   - **Format**: month parameter as YYYY-MM-DD (e.g., "2024-01-01")

3. **`GET /budgets/{budget_id}/months/{month}/categories/{category_id}`**
   - **Purpose**: Get single category for specific month
   - **Target Data**: Complete goal information for category
   - **Use Case**: Category drill-down, detailed analysis
   - **Rate Limit**: Counts as 1 request

#### Response Structure Confirmation

All endpoints return categories with this confirmed structure:
```json
{
  "data": {
    "categories": [
      {
        "id": "category-uuid",
        "name": "Groceries",
        "budgeted": 50000,  // $50.00 assigned this month
        "goal_type": "MF",  // Monthly Funding goal
        "goal_target": 45000,  // $45.00 target
        "goal_percentage_complete": 100,
        "goal_under_funded": 0,
        // ... all other goal fields available
      }
    ]
  }
}
```

## Data Flow Architecture

### API Data Flow

1. **Authentication Flow**
   - User provides YNAB Personal Access Token
   - Token stored securely in environment variables
   - Token validated with initial API call

2. **Data Fetching Flow**
   - Fetch available budgets
   - User selects budget for analysis
   - Fetch budget details with categories and months
   - Cache responses for 5-minute intervals

3. **Data Processing Flow**
   - Extract category data for selected month
   - Process each category for target alignment
   - Calculate monthly analysis summary
   - Generate dashboard data structure

4. **Caching Strategy**
   - Cache YNAB API responses in memory
   - Implement cache invalidation based on timestamps
   - Use delta requests when supported by endpoints

### Error Handling Strategy

```typescript
interface APIError {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
}

enum ErrorType {
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error'
}

interface ErrorHandlingStrategy {
  [ErrorType.AUTHENTICATION]: 'redirect_to_setup';
  [ErrorType.RATE_LIMIT]: 'show_retry_timer';
  [ErrorType.NOT_FOUND]: 'show_error_message';
  [ErrorType.SERVER_ERROR]: 'retry_with_backoff';
  [ErrorType.NETWORK_ERROR]: 'retry_with_backoff';
}
```

## Database Schema (Optional Local Storage)

For enhanced performance, we may implement local caching:

### Cache Tables

```sql
-- Budget cache
CREATE TABLE budget_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSON NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Category cache
CREATE TABLE category_cache (
  budget_id TEXT,
  month TEXT,
  category_id TEXT,
  data JSON NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (budget_id, month, category_id)
);

-- Analysis cache
CREATE TABLE analysis_cache (
  budget_id TEXT,
  month TEXT,
  analysis_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (budget_id, month)
);
```

## Performance Considerations

### Data Optimization Strategies

1. **Lazy Loading**: Load only required months and categories
2. **Pagination**: Implement pagination for large category lists
3. **Memoization**: Cache calculated values within component lifecycle
4. **Delta Updates**: Use YNAB's delta request feature when available
5. **Compression**: Compress cached JSON data for storage efficiency

### Memory Management

- Implement LRU cache for API responses
- Clear old analysis data automatically
- Monitor memory usage in development
- Optimize data structures for minimal memory footprint

## Data Validation

### Input Validation
- Validate YNAB API token format
- Validate date formats (YYYY-MM-DD)
- Validate numeric values and ranges
- Sanitize user inputs

### Data Integrity Checks
- Verify milliunits calculations
- Check for missing required fields
- Validate category relationships
- Ensure data consistency across views

This data architecture provides a solid foundation for processing YNAB data and generating meaningful budget target alignment analysis.

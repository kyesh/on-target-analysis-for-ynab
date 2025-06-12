# Development Guide

## Overview

This guide provides technical implementation details for developers working on the YNAB Off-Target Assignment Analysis application. It covers the codebase structure, development workflow, testing strategies, and recent architectural decisions.

## Core Architecture

### Technology Stack

- **Frontend**: Next.js 14+ with React 18+, TypeScript
- **Styling**: Tailwind CSS for responsive design
- **API Integration**: YNAB API v1 with custom service layer
- **State Management**: React hooks and context
- **Testing**: Jest with React Testing Library
- **Development**: Hot reload with Fast Refresh

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── analysis/      # Analysis endpoints
│   │   ├── budgets/       # Budget management
│   │   ├── config/        # Configuration
│   │   └── ynab/          # YNAB integration
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── AnalysisDashboard.tsx
│   ├── BudgetSelector.tsx
│   └── MonthSelector.tsx
├── lib/                   # Core utilities
│   ├── data-processing.ts # Analysis calculations
│   ├── monthly-analysis.ts # Month processing
│   ├── ynab-client.ts     # YNAB API client
│   └── ynab-service.ts    # Service layer
├── types/                 # TypeScript definitions
│   ├── analysis.ts        # Analysis types
│   └── ynab.ts           # YNAB API types
└── __tests__/            # Unit tests
```

## Core Metrics Calculation

### Total Assigned Calculation

**Location**: `src/lib/monthly-analysis.ts:47`

```typescript
const totalAssigned = processedCategories.reduce((sum, cat) => sum + cat.assigned, 0);
```

**Implementation Details**:
- Sums `budgeted` field from all YNAB categories
- Includes both targeted and non-targeted categories
- Values in milliunits (1000 = $1.00)
- Filters applied based on `AnalysisConfig`

**Code Reference**: `analyzeMonth()` function

### Total Targeted Calculation

**Location**: `src/lib/monthly-analysis.ts:48-49`

```typescript
const categoriesWithTargets = processedCategories.filter(cat => cat.hasTarget);
const totalTargeted = categoriesWithTargets.reduce((sum, cat) => sum + (cat.target || 0), 0);
```

**Implementation Details**:
- Only includes categories with valid targets (`hasTarget: true`)
- Extracts target from `goal_target` field via `extractTargetAmount()`
- Handles different goal types (TB, TBD, MF, NEED, DEBT)
- Null targets are excluded from calculation

**Code Reference**: `extractTargetAmount()` in `src/lib/data-processing.ts:85`

### Enhanced Target Extraction Logic

**Updated Implementation** (`src/lib/data-processing.ts:85`):

```typescript
export function extractTargetAmount(category: YNABCategory): number | null {
  if (!category.goal_type) return null;

  const monthlyNeeded = category.goal_under_funded;
  const overallTarget = category.goal_target;

  switch (category.goal_type) {
    case 'MF': // Monthly Funding
      // Use overall target as it represents the monthly amount
      return overallTarget || null;

    case 'TB': // Target Category Balance
    case 'TBD': // Target Category Balance by Date
    case 'DEBT': // Debt Payoff Goal
      // Use goal_under_funded (amount needed THIS MONTH) when available
      if (monthlyNeeded !== null && monthlyNeeded !== undefined) {
        return monthlyNeeded;
      }
      return overallTarget || null;

    case 'NEED': // Plan Your Spending
      // Use goal_target as it represents monthly spending target
      return overallTarget || null;

    default:
      return null;
  }
}
```

**Key Improvements**:
- **Monthly Focus**: Prioritizes `goal_under_funded` (**VERIFIED** as "Needed This Month") for accurate monthly calculations
- **Goal Type Specific**: Different logic for different goal types (MF vs TB/TBD vs NEED)
- **Backward Compatible**: Falls back to `goal_target` when `goal_under_funded` unavailable
- **Enhanced Accuracy**: Uses YNAB's calculated monthly progress amounts for date-based goals
- **Official Verification**: Implementation confirmed against YNAB's official API documentation

## Month Selection and Validation

### Available Month Determination

**Location**: `src/components/MonthSelector.tsx:104`

```typescript
const generateMonthOptions = (): string[] => {
  if (!budgetFirstMonth || !budgetLastMonth) return [];
  
  const months: string[] = [];
  const monthsSet = new Set<string>();
  let current = budgetFirstMonth;
  
  const budgetLastDate = new Date(budgetLastMonth + 'T00:00:00.000Z');
  
  while (new Date(current + 'T00:00:00.000Z') <= budgetLastDate) {
    if (!monthsSet.has(current)) {
      months.push(current);
      monthsSet.add(current);
    }
    current = getNextMonth(current);
  }
  
  return months.reverse(); // Most recent first
};
```

**Key Features**:
- Uses budget's `firstMonth` and `lastMonth` properties
- Generates all months within range
- Prevents duplicates with Set data structure
- Returns months in reverse chronological order

### Month Validation System

**Location**: `src/app/api/analysis/monthly/route.ts:7`

```typescript
function validateMonthInBudgetRange(month: string, budget: any): { isValid: boolean; error?: string } {
  // Handle both camelCase and snake_case property names
  const firstMonth = budget.firstMonth || budget.first_month;
  const lastMonth = budget.lastMonth || budget.last_month;
  
  if (!firstMonth || !lastMonth) {
    return { 
      isValid: false, 
      error: `Budget ${budget.name} is missing date range information.` 
    };
  }
  
  const requestedDate = new Date(month);
  const budgetFirstDate = new Date(firstMonth);
  const budgetLastDate = new Date(lastMonth);
  
  if (requestedDate < budgetFirstDate) {
    return { 
      isValid: false, 
      error: `Month ${month} is before budget start date ${firstMonth}` 
    };
  }
  
  if (requestedDate > budgetLastDate) {
    return { 
      isValid: false, 
      error: `Month ${month} is after budget end date ${lastMonth}` 
    };
  }
  
  return { isValid: true };
}
```

**Validation Rules**:
1. Month format must be YYYY-MM-DD
2. Month must be within budget's date range
3. Budget must have valid `firstMonth` and `lastMonth`
4. Handles property name compatibility (camelCase vs snake_case)

### Default Month Selection Logic

**Location**: `src/app/api/analysis/monthly/route.ts:56`

```typescript
function getSafeDefaultMonth(budget: any): string {
  const firstMonth = budget.firstMonth || budget.first_month;
  const lastMonth = budget.lastMonth || budget.last_month;
  
  const currentMonth = getFirstDayOfMonth();
  const budgetLastDate = new Date(lastMonth);
  const budgetFirstDate = new Date(firstMonth);
  const currentDate = new Date(currentMonth);
  
  // If current month is within budget range, use it
  if (currentDate >= budgetFirstDate && currentDate <= budgetLastDate) {
    return currentMonth;
  }
  
  // If current month is after budget range, use budget's last month
  if (currentDate > budgetLastDate) {
    return lastMonth;
  }
  
  // If current month is before budget range, use budget's first month
  return firstMonth;
}
```

## Critical Bug Fixes

### Timezone-Safe Date Handling

**Issue**: `getNextMonth()` was returning the same month due to timezone parsing issues.

**Root Cause**: JavaScript `Date` constructor parsing "YYYY-MM-DD" as UTC but `getMonth()` using local timezone.

**Solution**: Implemented UTC-consistent date handling.

**Location**: `src/lib/data-processing.ts:214`

```typescript
export function getNextMonth(month: string): string {
  // Parse as UTC to avoid timezone issues
  const date = new Date(month + 'T00:00:00.000Z');
  date.setUTCMonth(date.getUTCMonth() + 1);
  return getFirstDayOfMonth(date);
}

export function getFirstDayOfMonth(date: Date = new Date()): string {
  // Use UTC methods to avoid timezone issues
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}
```

**Impact**: Eliminated infinite loops in MonthSelector component.

### React setState During Render Fix

**Issue**: MonthSelector was calling `onMonthSelect()` during render, causing React warnings.

**Solution**: Moved state updates to separate useEffect with setTimeout.

**Location**: `src/components/MonthSelector.tsx:33`

```typescript
// Handle initial month selection separately to avoid setState during render
useEffect(() => {
  if (!selectedMonth && currentMonth && budgetFirstMonth && budgetLastMonth) {
    // Use setTimeout to avoid setState during render
    const timer = setTimeout(() => {
      onMonthSelect(currentMonth);
    }, 0);
    return () => clearTimeout(timer);
  }
}, [currentMonth, selectedMonth, budgetFirstMonth, budgetLastMonth, onMonthSelect]);
```

### Property Name Compatibility

**Issue**: Backend returns snake_case (`first_month`) but frontend expects camelCase (`firstMonth`).

**Solution**: Added compatibility layer in validation functions.

```typescript
// Handle both camelCase and snake_case property names
const firstMonth = budget.firstMonth || budget.first_month;
const lastMonth = budget.lastMonth || budget.last_month;
```

## YNAB API Integration

### Service Layer Architecture

**YNABClient** (`src/lib/ynab-client.ts`):
- Low-level HTTP client for YNAB API
- Handles authentication and rate limiting
- Provides raw API responses

**YNABService** (`src/lib/ynab-service.ts`):
- High-level service layer
- Implements caching (5-10 minute TTL)
- Provides application-specific methods

### Caching Strategy

```typescript
class YNABService {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private static getCacheKey(endpoint: string, params?: any): string {
    return params ? `${endpoint}:${JSON.stringify(params)}` : endpoint;
  }
  
  private static isExpired(item: { timestamp: number; ttl: number }): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }
}
```

**Cache TTL**:
- Budget data: 10 minutes (changes infrequently)
- Month data: 5 minutes (can change during active budgeting)

### Rate Limiting

- **YNAB Limit**: 200 requests/hour per token
- **Monitoring**: Rate limit status included in responses
- **Mitigation**: Aggressive caching and request batching

## Error Handling

### API Error Responses

**Structure**:
```typescript
{
  success: false,
  error: {
    type: string,
    message: string,
    statusCode: number,
    availableRange?: { firstMonth: string; lastMonth: string }
  }
}
```

**Error Types**:
- `invalid_month`: Month validation failed
- `budget_not_found`: Budget ID not found
- `ynab_api_error`: YNAB API returned error
- `configuration_error`: Missing or invalid configuration

### Frontend Error Boundaries

**AnalysisDashboard** includes comprehensive error handling:
- Loading states for async operations
- Retry mechanisms for failed requests
- User-friendly error messages
- Graceful degradation

## Testing Strategy

### Unit Tests

**Location**: `src/__tests__/`

**Coverage**:
- Data processing functions
- Date manipulation utilities
- Validation logic
- Currency conversion

**Example**:
```typescript
describe('getNextMonth', () => {
  it('should correctly increment month', () => {
    expect(getNextMonth('2024-01-01')).toBe('2024-02-01');
    expect(getNextMonth('2024-12-01')).toBe('2025-01-01');
  });
});
```

### Integration Testing

**Browser Automation**: Playwright for end-to-end testing
- Dropdown functionality
- API integration
- Error handling
- User workflows

## Performance Considerations

### Optimization Strategies

1. **Caching**: Aggressive caching of YNAB API responses
2. **Memoization**: React.memo for expensive components
3. **Lazy Loading**: Code splitting for large components
4. **Debouncing**: User input debouncing for API calls

### Memory Management

- Cache size limits to prevent memory leaks
- Automatic cache cleanup for expired entries
- Component cleanup in useEffect return functions

## Deployment

### Environment Variables

```bash
YNAB_ACCESS_TOKEN=your_token_here
NODE_ENV=production
```

### Build Process

```bash
npm run build    # Production build
npm run start    # Production server
npm run dev      # Development server
```

### Production Considerations

- Remove debug endpoints (`/api/debug/*`)
- Enable production optimizations
- Configure proper error logging
- Set up monitoring for API rate limits

## Troubleshooting

### Common Issues

**"getNextMonth returned same month"**:
- Check timezone handling in date functions
- Verify UTC parsing implementation

**"Duplicate React keys"**:
- Ensure unique keys in month option generation
- Check for duplicate months in arrays

**"setState during render"**:
- Move state updates to useEffect hooks
- Use setTimeout for deferred updates

### Debug Tools

**Cache Clearing** (Development):
```bash
curl -X POST http://localhost:3000/api/debug/clear-cache
```

**Console Logging**:
- Structured JSON logs for API errors
- Request context included in error logs
- Performance timing for slow operations

## Contributing

### Code Standards

- TypeScript strict mode enabled
- ESLint and Prettier for code formatting
- Comprehensive error handling required
- Unit tests for new functions

### Git Workflow

- Feature branches for new development
- Comprehensive commit messages with sections:
  - Summary
  - Detailed Description
  - Current Status
  - Next Steps

### Documentation

- Update relevant documentation for changes
- Include code examples for new features
- Maintain API documentation accuracy

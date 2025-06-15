# Testing Guide

## Overview

This guide covers the comprehensive testing strategy for the On Target Analysis for YNAB application, including unit tests, integration tests, and end-to-end testing approaches.

## Testing Philosophy

The application follows a multi-layered testing approach:

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test API integration and data flow
3. **Component Tests**: Test React component functionality and user interactions
4. **End-to-End Tests**: Test complete user workflows

## Test Structure

### Test Organization

```
src/__tests__/
├── data-processing.test.ts      # Core calculation logic tests
├── monthly-analysis.test.ts     # Analysis engine tests
├── ynab-service.test.ts        # API integration tests
└── components/
    ├── AnalysisDashboard.test.tsx
    ├── CategoryDebugPanel.test.tsx
    └── MonthlyOverview.test.tsx
```

### Test Configuration

The project uses Jest with React Testing Library:

```json
{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/src/setupTests.ts"],
  "testMatch": ["**/__tests__/**/*.test.{ts,tsx}"],
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**/*"
  ]
}
```

## Running Tests

### Basic Test Commands

```bash
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report
```

### Test Filtering

```bash
npm test -- --testNamePattern="Rule 1"     # Run specific test patterns
npm test -- --testPathPattern="data-processing"  # Run specific test files
npm test -- --verbose                      # Detailed test output
```

## Core Calculation Tests

### Rule-Based Testing

Each of the 7 calculation rules has comprehensive test coverage:

#### Zero-Target Strategy Tests

```typescript
test('returns 0 for categories without goal_type', () => {
  const category = createMockCategory(null, null);
  expect(calculateNeededThisMonth(category)).toBe(0);
});
```

#### Rule 1: Monthly NEED Goals

```typescript
test('should use goal_target for monthly NEED goals', () => {
  const category = createMockCategory({
    goal_type: 'NEED',
    goal_target: 60000,
    goal_cadence: 1,
    goal_cadence_frequency: 1,
  });
  expect(calculateNeededThisMonth(category)).toBe(60000);
});
```

#### Rule 2: Weekly NEED Goals

```typescript
test('should calculate weekly goals with day counting', () => {
  const category = createMockCategory({
    goal_type: 'NEED',
    goal_target: 25000,
    goal_cadence: 2,
    goal_cadence_frequency: 1,
    goal_day: 4, // Thursday
  });
  // December 2024 has 5 Thursdays
  expect(calculateNeededThisMonth(category, '2024-12-01')).toBe(125000);
});
```

#### Rule Priority Tests

```typescript
test('Weekly goals take precedence over months to budget', () => {
  const category = {
    goal_type: 'NEED',
    goal_target: 25000,
    goal_cadence: 2,
    goal_cadence_frequency: 1,
    goal_day: 4,
    goal_months_to_budget: 3, // Should NOT be used
    goal_overall_left: 75000,
    budgeted: 0,
  };

  const result = calculateNeededThisMonth(category, '2024-12-01');
  expect(result).toBe(125000); // Weekly calculation
  expect(result).not.toBe(25000); // Not months-to-budget calculation
});
```

### Edge Case Testing

#### Date Handling

```typescript
test('handles invalid date formats gracefully', () => {
  const category = createMockCategory({
    goal_type: 'NEED',
    goal_target: 25000,
    goal_cadence: 2,
    goal_day: 4,
  });

  // Invalid month format should fall back to goal_target
  expect(calculateNeededThisMonth(category, 'invalid-date')).toBe(25000);
});
```

#### Null/Undefined Values

```typescript
test('handles null goal values correctly', () => {
  const category = createMockCategory({
    goal_type: 'NEED',
    goal_target: null,
  });
  expect(calculateNeededThisMonth(category)).toBeNull();
});
```

## Component Testing

### React Component Tests

#### AnalysisDashboard Component

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import AnalysisDashboard from '../AnalysisDashboard';

test('displays monthly overview when data is loaded', async () => {
  const mockData = createMockAnalysisData();

  render(<AnalysisDashboard budgetId="test-budget" month="2024-12-01" />);

  await waitFor(() => {
    expect(screen.getByText('Monthly Overview')).toBeInTheDocument();
    expect(screen.getByText('$12,238.77')).toBeInTheDocument(); // Total income
  });
});

test('toggles debug mode correctly', () => {
  render(<AnalysisDashboard budgetId="test-budget" month="2024-12-01" />);

  const debugToggle = screen.getByLabelText('Show Debug Information');
  fireEvent.click(debugToggle);

  expect(screen.getByText('Debug Information')).toBeInTheDocument();
});
```

#### CategoryDebugPanel Component

```typescript
test('displays calculation rule with correct color coding', () => {
  const category = createMockCategoryWithDebug('Rule 1: Monthly NEED');

  render(<CategoryDebugPanel category={category} isOpen={true} />);

  const ruleElement = screen.getByText('Rule 1: Monthly NEED');
  expect(ruleElement).toHaveClass('text-blue-600', 'bg-blue-50');
});

test('shows raw YNAB API fields with proper formatting', () => {
  const category = createMockCategoryWithDebug();

  render(<CategoryDebugPanel category={category} isOpen={true} />);

  expect(screen.getByText('goal_type: NEED')).toBeInTheDocument();
  expect(screen.getByText('goal_target: $400.00')).toBeInTheDocument();
  expect(screen.getByText('goal_cadence: 1 (Monthly)')).toBeInTheDocument();
});
```

## API Integration Testing

### YNAB OAuth Client Tests

#### API Response Handling

```typescript
import { YNABOAuthClient } from '../lib/ynab/client-oauth';

test('handles successful budget fetch', async () => {
  const mockResponse = createMockBudgetResponse();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockResponse),
  });

  const client = new YNABOAuthClient('mock-oauth-token');
  const budgets = await client.getBudgets();

  expect(budgets.data.budgets).toHaveLength(1);
  expect(budgets.data.budgets[0].name).toBe('Test Budget');
});

test('handles API rate limiting', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests',
  });

  const client = new YNABOAuthClient('mock-oauth-token');
  await expect(client.getBudgets()).rejects.toThrow('Rate limit exceeded');
});
```

#### Error Handling

```typescript
test('handles network errors gracefully', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

  const client = new YNABOAuthClient('mock-oauth-token');
  await expect(client.getBudgets()).rejects.toThrow('Network error');
});

test('handles invalid API responses', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ invalid: 'response' }),
  });

  const client = new YNABOAuthClient('mock-oauth-token');
  await expect(client.getBudgets()).rejects.toThrow('Invalid response format');
});
```

## Test Data Management

### Mock Data Creation

#### Category Mocks

```typescript
function createMockCategory(overrides = {}) {
  return {
    id: 'test-category-id',
    name: 'Test Category',
    budgeted: 40000,
    activity: -30000,
    balance: 10000,
    goal_type: 'NEED',
    goal_target: 40000,
    goal_cadence: 1,
    goal_cadence_frequency: 1,
    ...overrides,
  };
}

function createEnhancedMockCategory(goalType, goalTarget, overrides = {}) {
  return {
    ...createMockCategory(),
    goal_type: goalType,
    goal_target: goalTarget,
    ...overrides,
  };
}
```

#### Analysis Data Mocks

```typescript
function createMockAnalysisData() {
  return {
    selectedMonth: '2024-12-01',
    monthlyAnalysis: {
      totalIncome: 500000,
      totalActivity: -350000,
      totalAssigned: 450000,
      // ... other fields
    },
    categories: [
      createMockCategory(),
      // ... more categories
    ],
  };
}
```

## Coverage Requirements

### Coverage Targets

- **Overall Coverage**: >90%
- **Function Coverage**: >95%
- **Branch Coverage**: >85%
- **Line Coverage**: >90%

### Critical Areas

High coverage requirements for:

- **Calculation logic**: 100% coverage required
- **API integration**: >95% coverage
- **Error handling**: >90% coverage
- **Component rendering**: >85% coverage

### Coverage Reporting

```bash
npm run test:coverage
```

Generates reports in:

- **HTML**: `coverage/lcov-report/index.html`
- **JSON**: `coverage/coverage-final.json`
- **LCOV**: `coverage/lcov.info`

## Continuous Integration

### GitHub Actions

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run lint
      - run: npm run type-check
```

### Quality Gates

- **All tests must pass**: No failing tests allowed
- **Coverage thresholds**: Must meet minimum coverage requirements
- **Linting**: No ESLint errors allowed
- **Type checking**: No TypeScript errors allowed

## Best Practices

### Test Writing Guidelines

1. **Descriptive test names**: Clearly describe what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear sections
3. **Single responsibility**: Each test should verify one specific behavior
4. **Mock external dependencies**: Isolate units under test
5. **Test edge cases**: Include boundary conditions and error scenarios

### Performance Testing

- **Large dataset testing**: Test with budgets containing 100+ categories
- **Memory usage**: Monitor memory consumption during tests
- **Async operation testing**: Verify proper handling of API calls
- **Error boundary testing**: Test React error boundaries

This comprehensive testing strategy ensures the reliability and accuracy of the YNAB budget analysis calculations and user interface components.

# 📚 YNAB "Needed This Month" Calculation - Developer Reference Guide

**Version**: 2.0  
**Date**: December 2024  
**Status**: Comprehensive Technical Reference  
**Audience**: Developers implementing YNAB budget analysis tools

---

## 🎯 Overview

The "Needed This Month" value in YNAB is **not a single API field** but a computed value that varies based on goal type, timing, cadence, and funding status. This guide provides definitive calculation methodologies for all YNAB goal types and scenarios.

### Key Insight
YNAB's `goal_under_funded` field represents the official "Needed This Month" value, but it has specific behaviors and limitations that require additional calculation logic for complete coverage.

---

## 📊 Goal Type Reference

### Goal Type Definitions

| Code | Name | Description | Primary Use Case |
|------|------|-------------|------------------|
| **TB** | Target Category Balance | Build to a specific balance | Emergency funds, sinking funds |
| **TBD** | Target Category Balance by Date | Build to balance by specific date | Vacation funds, major purchases |
| **MF** | Monthly Funding | Fund a specific amount monthly | Regular bills, subscriptions |
| **NEED** | Plan Your Spending | Spending category with optional cadence | Groceries, gas, entertainment |
| **DEBT** | Debt Payoff Goal | Pay off debt by target date | Credit cards, loans |

---

## 🔧 API Field Reference

### Primary Fields for "Needed This Month" Calculation

| Field | Type | Description | Usage |
|-------|------|-------------|-------|
| `goal_under_funded` | number\|null | Official "amount needed this month" | **Primary source** when available |
| `goal_target` | number\|null | Target amount (context varies by goal type) | Fallback and MF goals |
| `goal_target_month` | string\|null | Target completion date (YYYY-MM-DD) | Future goal calculations |
| `goal_overall_funded` | number\|null | Total amount funded toward goal | Manual calculations |
| `goal_overall_left` | number\|null | Amount remaining to reach goal | Validation |
| `goal_months_to_budget` | number\|null | Months remaining in goal period | TBD goal calculations |

### Cadence and Timing Fields

| Field | Type | Description | Values |
|-------|------|-------------|--------|
| `goal_cadence` | number\|null | Goal frequency type | 0=One-time, 1=Monthly, 2=Weekly, 13=Yearly |
| `goal_cadence_frequency` | number\|null | Frequency multiplier | 1-6+ (every N periods) |
| `goal_needs_whole_amount` | boolean\|null | Rollover behavior for NEED goals | true=No rollover, false=Rollover |

---

## 🧮 Calculation Methodologies

### 1. Monthly Funding (MF) Goals

**Principle**: Use `goal_target` as the monthly funding amount.

```typescript
function calculateMFGoal(category: YNABCategory): number | null {
  // MF goals: goal_target represents the monthly funding amount
  return category.goal_target || null;
}
```

**Rationale**: For MF goals, `goal_target` is the desired monthly funding amount, not a total target.

### 2. Target Category Balance (TB) Goals

**Principle**: Prioritize `goal_under_funded`, fallback to `goal_target`.

```typescript
function calculateTBGoal(category: YNABCategory): number | null {
  // TB goals: goal_under_funded shows monthly amount needed to reach target
  if (category.goal_under_funded !== null && category.goal_under_funded !== undefined) {
    return category.goal_under_funded;
  }
  
  // Fallback: Use total target (may indicate goal is not active)
  return category.goal_target || null;
}
```

**Behavior**: 
- `goal_under_funded = 0` when target is reached
- `goal_under_funded = null` when goal is inactive or complete

### 3. Target Category Balance by Date (TBD) Goals

**Principle**: Use `goal_under_funded` for monthly progress calculation.

```typescript
function calculateTBDGoal(category: YNABCategory): number | null {
  // TBD goals: goal_under_funded shows monthly amount needed to reach target by date
  if (category.goal_under_funded !== null && category.goal_under_funded !== undefined) {
    return category.goal_under_funded;
  }
  
  // Fallback: Use total target (may indicate goal is not active)
  return category.goal_target || null;
}
```

**Note**: `goal_months_to_budget` can provide additional context but `goal_under_funded` is the authoritative monthly amount.

### 4. Plan Your Spending (NEED) Goals

**Principle**: Complex logic based on cadence, timing, and funding status.

```typescript
function calculateNEEDGoal(
  category: YNABCategory, 
  currentMonth: string
): number | null {
  // Priority 1: Use goal_under_funded when available
  if (category.goal_under_funded !== null && category.goal_under_funded !== undefined) {
    return category.goal_under_funded;
  }
  
  // Priority 2: Handle future-dated goals with manual calculation
  if (category.goal_target_month && category.goal_target_month > currentMonth) {
    return calculateFutureDatedNEED(category, currentMonth);
  }
  
  // Priority 3: Handle cadence-based calculations
  if (category.goal_cadence && category.goal_cadence !== 1) {
    return calculateCadenceBasedNEED(category);
  }
  
  // Fallback: Use goal_target for monthly amount
  return category.goal_target || null;
}
```

### 5. Debt Payoff (DEBT) Goals

**Principle**: Similar to TBD goals, prioritize `goal_under_funded`.

```typescript
function calculateDEBTGoal(category: YNABCategory): number | null {
  // DEBT goals: goal_under_funded shows monthly payment needed
  if (category.goal_under_funded !== null && category.goal_under_funded !== undefined) {
    return category.goal_under_funded;
  }
  
  // Fallback: Use total target (may indicate goal is not active)
  return category.goal_target || null;
}
```

---

## ⏰ Cadence and Timing Analysis

### Cadence Code Meanings

| Code | Meaning | Frequency Calculation |
|------|---------|----------------------|
| **0** | One-time/No cadence | Use goal_target or manual calculation |
| **1** | Monthly | goal_target ÷ goal_cadence_frequency |
| **2** | Weekly | (goal_target × 52) ÷ 12 ÷ goal_cadence_frequency |
| **13** | Yearly | goal_target ÷ 12 ÷ goal_cadence_frequency |
| **3-12** | Custom intervals | Varies by implementation |
| **14+** | Extended periods | Varies by implementation |

### Cadence-Based Calculation

```typescript
function calculateCadenceBasedNEED(category: YNABCategory): number | null {
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
    
    default:
      // For other cadences, use goal_target as monthly amount
      return target;
  }
}
```

---

## 🚀 Future-Dated Goals

### The Challenge
Future-dated NEED goals return `goal_under_funded = null` until the target month is reached, but users still need to see monthly funding requirements.

### Manual Calculation Formula

```typescript
function calculateFutureDatedNEED(
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
  if (monthsRemaining <= 0) return null;
  
  const alreadyFunded = category.goal_overall_funded || 0;
  const remainingNeeded = category.goal_target - alreadyFunded;
  
  // If already fully funded, no monthly amount needed
  if (remainingNeeded <= 0) return 0;
  
  return Math.round(remainingNeeded / monthsRemaining);
}

function calculateMonthsBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T00:00:00.000Z');
  
  const yearDiff = end.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = end.getUTCMonth() - start.getUTCMonth();
  
  return Math.max(1, yearDiff * 12 + monthDiff);
}
```

### Real-World Examples

**Summer Camp Goal**:
- Target: $800 (goal_target = 800000 milliunits)
- Target Date: 2025-06-01
- Current Month: 2024-12-01
- Calculation: $800 ÷ 6 months = $133.33/month

**Camp Michigania Goal**:
- Target: $5,240 (goal_target = 5240000 milliunits)
- Target Date: 2025-04-15
- Current Month: 2024-12-01
- Calculation: $5,240 ÷ 4 months = $1,310/month

---

## 🛡️ Edge Cases and Error Handling

### 1. Division by Zero Protection

```typescript
function calculateCategoryVariance(
  category: ProcessedCategory,
  month: string
): CategoryVariance | null {
  // Prevent division by zero
  if (!category.hasTarget || category.target === null || category.target === 0) {
    return null;
  }

  const variancePercentage = (category.variance / category.target) * 100;

  // Handle invalid calculation results
  const safeVariancePercentage = (!isNaN(variancePercentage) && isFinite(variancePercentage))
    ? variancePercentage
    : null;

  return {
    // ... other fields
    variancePercentage: safeVariancePercentage,
    // ... other fields
  };
}
```

### 2. Null and Undefined Handling

```typescript
function safeExtractTarget(category: YNABCategory): number | null {
  // Comprehensive null checking
  if (!category.goal_type) return null;

  const monthlyNeeded = category.goal_under_funded;
  const overallTarget = category.goal_target;

  // Check for null, undefined, and NaN
  if (monthlyNeeded !== null &&
      monthlyNeeded !== undefined &&
      !isNaN(monthlyNeeded) &&
      isFinite(monthlyNeeded)) {
    return monthlyNeeded;
  }

  // Fallback with same validation
  if (overallTarget !== null &&
      overallTarget !== undefined &&
      !isNaN(overallTarget) &&
      isFinite(overallTarget)) {
    return overallTarget;
  }

  return null;
}
```

### 3. Over-Funded Goals

```typescript
function handleOverFundedGoal(category: YNABCategory): number {
  // When goal_under_funded is 0, goal is fully funded
  if (category.goal_under_funded === 0) {
    return 0; // No additional funding needed
  }

  // When goal_under_funded is negative, goal is over-funded
  if (category.goal_under_funded && category.goal_under_funded < 0) {
    return 0; // Could return negative for "excess" tracking
  }

  return category.goal_under_funded || 0;
}
```

### 4. Invalid Date Handling

```typescript
function validateAndCalculateMonths(startDate: string, endDate: string): number | null {
  try {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return null;
    }

    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T00:00:00.000Z');

    // Validate dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return null;
    }

    // Ensure end date is after start date
    if (end <= start) {
      return null;
    }

    const yearDiff = end.getUTCFullYear() - start.getUTCFullYear();
    const monthDiff = end.getUTCMonth() - start.getUTCMonth();

    return Math.max(1, yearDiff * 12 + monthDiff);
  } catch (error) {
    console.error('Date calculation error:', error);
    return null;
  }
}
```

---

## 🔄 Complete Implementation Example

### Master "Needed This Month" Function

```typescript
/**
 * Extract the "Needed This Month" amount for any YNAB category
 * Handles all goal types, cadences, and edge cases
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

function handleMFGoal(category: YNABCategory): number | null {
  // MF goals: goal_target is the monthly funding amount
  return category.goal_target || null;
}

function handleTBGoal(
  category: YNABCategory,
  monthlyNeeded: number | null,
  overallTarget: number | null
): number | null {
  // TB goals: prioritize goal_under_funded
  if (isValidNumber(monthlyNeeded)) {
    return monthlyNeeded;
  }
  return overallTarget || null;
}

function handleTBDGoal(
  category: YNABCategory,
  monthlyNeeded: number | null,
  overallTarget: number | null
): number | null {
  // TBD goals: prioritize goal_under_funded for monthly progress
  if (isValidNumber(monthlyNeeded)) {
    return monthlyNeeded;
  }
  return overallTarget || null;
}

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

  // Priority 2: Handle future-dated goals
  if (currentMonth &&
      category.goal_target_month &&
      category.goal_target_month > currentMonth) {
    const calculated = calculateFutureDatedNEED(category, currentMonth);
    if (calculated !== null) {
      return calculated;
    }
  }

  // Priority 3: Handle cadence-based calculations
  if (category.goal_cadence && category.goal_cadence !== 1) {
    const cadenceBased = calculateCadenceBasedNEED(category);
    if (cadenceBased !== null) {
      return cadenceBased;
    }
  }

  // Fallback: Use goal_target
  return overallTarget || null;
}

function handleDEBTGoal(
  category: YNABCategory,
  monthlyNeeded: number | null,
  overallTarget: number | null
): number | null {
  // DEBT goals: prioritize goal_under_funded for monthly payment
  if (isValidNumber(monthlyNeeded)) {
    return monthlyNeeded;
  }
  return overallTarget || null;
}

function isValidNumber(value: number | null | undefined): value is number {
  return value !== null &&
         value !== undefined &&
         !isNaN(value) &&
         isFinite(value);
}
```

---

## 📋 Decision Tree Summary

### Quick Reference Decision Tree

```
1. Does category have goal_type?
   ├─ No → Return null
   └─ Yes → Continue

2. What is the goal_type?
   ├─ MF → Use goal_target (monthly amount)
   ├─ TB/TBD/DEBT → Use goal_under_funded, fallback to goal_target
   └─ NEED → Complex logic (see below)

3. For NEED goals:
   ├─ Is goal_under_funded available? → Use it
   ├─ Is goal_target_month in future? → Calculate manually
   ├─ Is goal_cadence != 1? → Apply cadence calculation
   └─ Else → Use goal_target

4. For future-dated goals:
   ├─ Calculate months remaining
   ├─ Apply formula: (goal_target - goal_overall_funded) / months_remaining
   └─ Handle edge cases (over-funded, zero months, etc.)

5. For all results:
   ├─ Validate number is finite and not NaN
   ├─ Handle null/undefined gracefully
   └─ Return calculated value or null
```

---

## 🧪 Testing and Validation

### Test Cases to Implement

```typescript
describe('YNAB Needed This Month Calculations', () => {
  describe('MF Goals', () => {
    test('should use goal_target for monthly funding amount');
    test('should handle null goal_target gracefully');
  });

  describe('TB/TBD/DEBT Goals', () => {
    test('should prioritize goal_under_funded when available');
    test('should fallback to goal_target when goal_under_funded is null');
    test('should handle goal_under_funded of 0 (fully funded)');
  });

  describe('NEED Goals', () => {
    test('should use goal_under_funded when available');
    test('should calculate future-dated goals manually');
    test('should handle cadence-based calculations');
    test('should fallback to goal_target for simple cases');
  });

  describe('Future-Dated Goals', () => {
    test('should calculate monthly amount for future targets');
    test('should handle already funded goals');
    test('should return 0 for over-funded goals');
    test('should handle single month remaining');
    test('should not calculate for past dates');
  });

  describe('Edge Cases', () => {
    test('should handle division by zero');
    test('should validate date formats');
    test('should handle invalid numbers (NaN, Infinity)');
    test('should gracefully handle missing fields');
  });

  describe('Cadence Calculations', () => {
    test('should handle weekly goals (cadence = 2)');
    test('should handle yearly goals (cadence = 13)');
    test('should handle custom frequencies');
  });
});
```

---

## 📚 External Resources and Validation

### Official YNAB Documentation
- **YNAB API Reference**: https://api.ynab.com/
- **Goal Types Documentation**: Limited official documentation available
- **Community Forums**: YNAB community discussions on goal calculations

### Third-Party Implementations
- **YNAB SDK Libraries**: Various language implementations available
- **Community Tools**: Toolkit for YNAB and similar applications
- **Budget Analysis Tools**: Third-party applications with similar calculations

### Validation Sources
- **Microsoft YNAB API Connector**: Confirmed goal_under_funded definition
- **Real YNAB Data Testing**: Validated against actual budget data
- **Cross-Month Analysis**: Confirmed behavior patterns across time periods

---

## ⚠️ Important Notes

### 1. API Rate Limits
- YNAB API has rate limits (200 requests per hour)
- Cache results when possible
- Implement proper error handling for rate limit responses

### 2. Data Consistency
- YNAB data can change between API calls
- Implement proper data validation
- Handle stale data gracefully

### 3. Timezone Considerations
- All YNAB dates are in YYYY-MM-DD format
- Use UTC for date calculations to avoid timezone issues
- Be consistent with date handling across your application

### 4. Currency Precision
- YNAB uses milliunits (1/1000 of currency unit)
- Always handle currency conversion properly
- Round appropriately for display purposes

---

## 🎯 Conclusion

This guide provides comprehensive coverage of YNAB's "Needed This Month" calculations. The key insight is that this value is computed differently based on goal type, timing, and cadence, requiring sophisticated logic to handle all scenarios accurately.

**Key Takeaways**:
1. **goal_under_funded is authoritative** when available
2. **Future-dated goals require manual calculation**
3. **Cadence affects monthly amount calculations**
4. **Robust error handling is essential**
5. **Edge cases are common and must be handled**

For the most accurate implementation, always prioritize goal_under_funded when available, implement manual calculations for future-dated goals, and include comprehensive error handling for edge cases.

**Version History**:
- v1.0: Initial implementation with basic goal type handling
- v2.0: Added future-dated goals, cadence calculations, and comprehensive edge case handling

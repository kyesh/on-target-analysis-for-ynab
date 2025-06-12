# 📚 YNAB "Needed This Month" Calculation - Simplified Developer Guide

**Version**: 3.0
**Date**: December 2024
**Status**: Simplified Technical Reference
**Audience**: Developers implementing YNAB budget analysis tools

---

## 🎯 Overview

The "Needed This Month" value in YNAB can be calculated using simplified, definitive rules based on direct analysis of YNAB's behavior. This guide provides a streamlined approach that eliminates complexity while maintaining accuracy.

### Key Insight
Rather than trying to handle every edge case, we use five clear rules that cover all practical YNAB goal scenarios with simple, maintainable logic. This includes a zero-target strategy for categories without goals and proper rule priority to ensure weekly goals take precedence over months-to-budget calculations.

---

## 🔄 Rule Priority Order

The rules are evaluated in this specific order:

1. **Zero-Target Strategy**: Categories without `goal_type` → 0
2. **Rule 6**: Goal Creation Month Check → 0 (if goal created after current month)
3. **Rule 1**: Monthly NEED Goals → `goal_target`
4. **Rule 2**: Weekly NEED Goals → `goal_target × day_count`
5. **Rule 3**: Months to Budget → `(goal_overall_left + budgeted) ÷ goal_months_to_budget`
6. **Rule 5**: Low Months to Budget → 0
7. **Rule 4**: All other cases → `goal_target`

---

## 🎯 Simplified Calculation Rules

### Zero-Target Strategy
**Condition**: `goal_type` is null or undefined
**Calculation**: Return `0` for categories without goals

```typescript
if (!category.goal_type) {
  return 0; // Zero-target strategy
}
```

### Rule 1: Monthly NEED Goals
**Condition**: `goal_cadence = 1` AND `goal_cadence_frequency = 1`
**Calculation**: Use `goal_target` as the monthly amount

```typescript
if (category.goal_cadence === 1 && category.goal_cadence_frequency === 1) {
  return category.goal_target;
}
```

### Rule 6: Goal Creation Month Check (High Priority)
**Condition**: `goal_creation_month` exists and is after the currently selected analysis month
**Calculation**: Return `0` for goals created after the current month

```typescript
if (category.goal_creation_month && currentMonth) {
  const goalCreationDate = new Date(category.goal_creation_month + 'T00:00:00.000Z');
  const currentMonthDate = new Date(currentMonth + 'T00:00:00.000Z');

  if (goalCreationDate > currentMonthDate) {
    return 0; // Goal created after current month
  }
}
```

**Example**: Goal created in January 2025, analyzing December 2024 → $0 needed
**Priority**: Checked early in rule evaluation sequence

### Rule 1: Monthly NEED Goals
**Condition**: `goal_cadence = 1` AND `goal_cadence_frequency = 1`
**Calculation**: Use `goal_target` as the monthly amount

```typescript
if (category.goal_cadence === 1 && category.goal_cadence_frequency === 1) {
  return category.goal_target;
}
```

### Rule 2: Weekly NEED Goals (High Priority)
**Condition**: `goal_cadence = 2` AND `goal_cadence_frequency = 1` AND `goal_day` is set
**Calculation**: `goal_target × count_of_goal_day_in_month`

```typescript
if (category.goal_cadence === 2 && category.goal_cadence_frequency === 1 &&
    typeof category.goal_day === 'number') {
  const dayCount = countDayOccurrencesInMonth(year, month, category.goal_day);
  return Math.round(category.goal_target * dayCount);
}
```

**Example**: $100 per Monday × 5 Mondays in December = $500/month
**Priority**: Takes precedence over Rule 3 (Months to Budget)

### Rule 3: Goals with Months to Budget
**Condition**: `goal_months_to_budget > 0` AND no specific cadence rules apply
**Calculation**: `(goal_overall_left + budgeted) ÷ goal_months_to_budget`

```typescript
if (category.goal_months_to_budget && category.goal_months_to_budget > 0) {
  const overallLeft = category.goal_overall_left || 0;
  const budgeted = category.budgeted || 0;
  return Math.round((overallLeft + budgeted) / category.goal_months_to_budget);
}
```

**Note**: Only applies if no specific cadence rules (Rule 1 or 2) match.

### Rule 5: Low Months to Budget
**Condition**: `goal_months_to_budget ≤ 0`
**Calculation**: Return `0` for completed or overdue goals

```typescript
if (typeof category.goal_months_to_budget === 'number' && category.goal_months_to_budget <= 0) {
  return 0; // Goal completed or overdue
}
```

### Rule 4: All Other Cases (Fallback)
**Condition**: Any goal type not covered by other rules
**Calculation**: Use `goal_target` directly

```typescript
// Covers MF, TB, TBD, DEBT goals and other NEED goal variations
return category.goal_target;
```

---

## 🔧 Complete Implementation

### Master Function

```typescript
/**
 * Calculate "Needed This Month" amount based on simplified YNAB rules
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
      return category.goal_target; // Fallback on error
    }
  }

  // Rule 4: All other cases - fallback to goal_target
  return category.goal_target;
}
```

### Helper Function for Day Counting

```typescript
/**
 * Count occurrences of a specific day of the week in a given month
 */
function countDayOccurrencesInMonth(
  year: number,
  month: number,
  dayOfWeek: number
): number {
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
```

---

## 📊 Real-World Examples

### Example 1: Monthly NEED Goal
```typescript
const monthlyGoal = {
  goal_type: 'NEED',
  goal_target: 60000, // $60/month
  goal_cadence: 1,
  goal_cadence_frequency: 1
};

// Result: 60000 (Rule 1 - Monthly NEED)
calculateNeededThisMonth(monthlyGoal); // $60/month
```

### Example 2: Weekly NEED Goal
```typescript
const weeklyGoal = {
  goal_type: 'NEED',
  goal_target: 100000, // $100 per occurrence
  goal_cadence: 2,
  goal_cadence_frequency: 1,
  goal_day: 1 // Monday (0=Sunday, 1=Monday, etc.)
};

// December 2024 has 5 Mondays (2, 9, 16, 23, 30)
// Result: 500000 (Rule 2 - $100 × 5 = $500/month)
calculateNeededThisMonth(weeklyGoal, '2024-12-01');
```

### Example 3: Months to Budget Goal
```typescript
const monthsToBudgetGoal = {
  goal_type: 'TBD',
  goal_target: 120000,
  goal_months_to_budget: 4,
  goal_overall_left: 80000,
  budgeted: 20000
};

// Result: 25000 (Rule 3 - (80000 + 20000) ÷ 4 = $25/month)
calculateNeededThisMonth(monthsToBudgetGoal);
```

### Example 4: Monthly Funding Goal
```typescript
const mfGoal = {
  goal_type: 'MF',
  goal_target: 150000 // $150/month
};

// Result: 150000 (Rule 4 - Fallback to goal_target)
calculateNeededThisMonth(mfGoal);
```

---

## 🧪 Testing and Validation

### Test Cases

```typescript
describe('Simplified YNAB Calculation', () => {
  test('Rule 1: Monthly NEED Goals', () => {
    const category = {
      goal_type: 'NEED',
      goal_target: 60000,
      goal_cadence: 1,
      goal_cadence_frequency: 1,
    };
    expect(calculateNeededThisMonth(category)).toBe(60000);
  });

  test('Rule 2: Weekly NEED Goals', () => {
    const category = {
      goal_type: 'NEED',
      goal_target: 100000,
      goal_cadence: 2,
      goal_cadence_frequency: 1,
      goal_day: 1, // Monday
    };
    // December 2024 has 5 Mondays
    expect(calculateNeededThisMonth(category, '2024-12-01')).toBe(500000);
  });

  test('Rule 3: Months to Budget Priority', () => {
    const category = {
      goal_type: 'TBD',
      goal_target: 120000,
      goal_months_to_budget: 4,
      goal_overall_left: 80000,
      budgeted: 20000,
    };
    expect(calculateNeededThisMonth(category)).toBe(25000);
  });

  test('Rule 4: Fallback Cases', () => {
    const category = {
      goal_type: 'MF',
      goal_target: 150000,
    };
    expect(calculateNeededThisMonth(category)).toBe(150000);
  });
});
```

---

## 🛡️ Edge Cases and Error Handling

### Basic Error Handling

```typescript
export function calculateNeededThisMonth(
  category: YNABCategory,
  currentMonth?: string
): number | null {
  // Return null if no goal type or target is set
  if (!category.goal_type || !category.goal_target) {
    return null;
  }

  // Handle invalid numbers
  if (!isFinite(category.goal_target) || isNaN(category.goal_target)) {
    return null;
  }

  // ... rest of calculation logic
}
```

### Weekly Goal Error Handling

```typescript
// Rule 2: Weekly NEED Goals with error handling
if (category.goal_cadence === 2 && category.goal_cadence_frequency === 1 &&
    typeof category.goal_day === 'number') {
  if (!currentMonth) {
    return category.goal_target; // Fallback
  }

  try {
    const [year, month] = currentMonth.split('-').map(Number);
    if (isNaN(year) || isNaN(month)) {
      return category.goal_target; // Fallback on invalid date
    }

    const dayCount = countDayOccurrencesInMonth(year, month, category.goal_day);
    return Math.round(category.goal_target * dayCount);
  } catch (error) {
    console.warn('Error calculating weekly goal:', error);
    return category.goal_target; // Fallback on error
  }
}
```

---

## 🎯 Simplified Decision Tree

```
1. Does category have goal_type and goal_target?
   ├─ No → Return null
   └─ Yes → Continue

2. Does category have goal_months_to_budget > 0?
   ├─ Yes → Use Rule 3 (months to budget calculation)
   └─ No → Continue

3. Is it a monthly NEED goal (cadence=1, frequency=1)?
   ├─ Yes → Use Rule 1 (goal_target)
   └─ No → Continue

4. Is it a weekly NEED goal (cadence=2, frequency=1, goal_day set)?
   ├─ Yes → Use Rule 2 (goal_target × day occurrences)
   └─ No → Continue

5. All other cases:
   └─ Use Rule 4 (goal_target fallback)
```

---

## 🎯 Conclusion

This simplified guide provides a clean, maintainable approach to calculating YNAB's "Needed This Month" values. By focusing on four clear rules instead of complex edge cases, we achieve:

**Key Benefits**:
1. **Simple Logic**: Easy to understand and maintain
2. **Clear Rules**: Definitive calculation methods for each scenario
3. **Reduced Complexity**: Eliminated over-engineering from previous approaches
4. **Better Performance**: Faster calculations with less overhead
5. **Easier Testing**: Focused test cases for specific rules

**Implementation Summary**:
- **Rule 1**: Monthly NEED goals → Use `goal_target`
- **Rule 2**: Weekly NEED goals → `goal_target × day_occurrences`
- **Rule 3**: Months to budget → `(goal_overall_left + budgeted) ÷ goal_months_to_budget`
- **Rule 4**: All other cases → Use `goal_target`

This approach eliminates the confusion caused by trying to handle every possible edge case and provides a reliable foundation for YNAB budget analysis tools.

**Version History**:
- v1.0: Initial implementation with basic goal type handling
- v2.0: Added complex future-dated goals and cadence calculations
- v3.0: **Simplified approach with four definitive rules** ✅



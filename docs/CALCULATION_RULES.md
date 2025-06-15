# YNAB "Needed This Month" Calculation Rules

## Overview

This document provides comprehensive documentation for the 7-rule calculation system used to determine "Needed This Month" values for YNAB budget categories. The system handles all YNAB goal types with sophisticated logic that mirrors YNAB's internal calculations.

## Rule Priority Order

The rules are evaluated in this specific order to ensure accurate calculations:

1. **Zero-Target Strategy**: Categories without `goal_type` → $0
2. **Rule 6**: Goal Creation Month Check → $0 (if goal created after current month)
3. **Rule 1**: Monthly NEED Goals → `goal_target`
4. **Rule 2**: Weekly NEED Goals → `goal_target × day_count`
5. **Rule 3**: Months to Budget → `(goal_overall_left + budgeted) ÷ goal_months_to_budget`
6. **Rule 5**: Low Months to Budget → $0 (if goal_months_to_budget ≤ 0)
7. **Rule 4**: All other cases → `goal_target`

## Detailed Rule Documentation

### Zero-Target Strategy

**Purpose**: Handle categories without any goals set  
**Condition**: `goal_type` is null or undefined  
**Calculation**: Return `0`  
**Rationale**: Categories without goals should not contribute to monthly targets

```typescript
if (!category.goal_type) {
  return 0; // Zero-target strategy
}
```

**Example**: A category with no goal set → $0 needed this month

---

### Rule 6: Goal Creation Month Check

**Purpose**: Exclude goals created after the analysis month  
**Condition**: `goal_creation_month` exists and is after the currently selected analysis month  
**Calculation**: Return `0`  
**Rationale**: Goals created after the current month should not affect current month calculations

```typescript
if (category.goal_creation_month && currentMonth) {
  const goalCreationDate = new Date(
    category.goal_creation_month + 'T00:00:00.000Z'
  );
  const currentMonthDate = new Date(currentMonth + 'T00:00:00.000Z');

  if (goalCreationDate > currentMonthDate) {
    return 0; // Goal created after current month
  }
}
```

**Example**: Goal created January 2025, analyzing December 2024 → $0 needed  
**Priority**: Checked early in rule evaluation sequence

---

### Rule 1: Monthly NEED Goals

**Purpose**: Handle standard monthly recurring goals  
**Condition**: `goal_cadence = 1` AND `goal_cadence_frequency = 1`  
**Calculation**: Use `goal_target` as the monthly amount

```typescript
if (category.goal_cadence === 1 && category.goal_cadence_frequency === 1) {
  return category.goal_target;
}
```

**Example**: Monthly grocery budget of $400 → $400 needed this month

---

### Rule 2: Weekly NEED Goals

**Purpose**: Handle weekly recurring goals with day-specific targeting  
**Condition**: `goal_cadence = 2` AND `goal_cadence_frequency = 1` AND `goal_day` is set  
**Calculation**: `goal_target × count_of_goal_day_in_month`  
**Priority**: Takes precedence over Rule 3 (Months to Budget)

```typescript
if (
  category.goal_cadence === 2 &&
  category.goal_cadence_frequency === 1 &&
  typeof category.goal_day === 'number'
) {
  const dayCount = countDayOccurrencesInMonth(year, month, category.goal_day);
  return Math.round(category.goal_target * dayCount);
}
```

**Example**: $25 every Thursday → Count Thursdays in month × $25  
**December 2024**: 5 Thursdays × $25 = $125 needed this month

---

### Rule 3: Months to Budget

**Purpose**: Handle target balance goals with specific timeline  
**Condition**: `goal_months_to_budget > 0` AND no specific cadence rules apply  
**Calculation**: `(goal_overall_left + budgeted) ÷ goal_months_to_budget`

```typescript
if (category.goal_months_to_budget && category.goal_months_to_budget > 0) {
  const overallLeft = category.goal_overall_left || 0;
  const budgeted = category.budgeted || 0;
  return Math.round((overallLeft + budgeted) / category.goal_months_to_budget);
}
```

**Example**: $1200 left to save, 4 months remaining → ($1200 + $0) ÷ 4 = $300 needed this month  
**Note**: Only applies if no specific cadence rules (Rule 1 or 2) match

---

### Rule 5: Low Months to Budget

**Purpose**: Handle completed or overdue target balance goals  
**Condition**: `goal_months_to_budget ≤ 0`  
**Calculation**: Return `0`  
**Rationale**: Goals that are completed or overdue should have zero monthly target

```typescript
if (
  typeof category.goal_months_to_budget === 'number' &&
  category.goal_months_to_budget <= 0
) {
  return 0; // Goal completed or overdue
}
```

**Example**: Target balance goal with 0 months remaining → $0 needed this month

---

### Rule 4: All Other Cases (Fallback)

**Purpose**: Handle any goal type not covered by specific rules  
**Condition**: Any goal type not covered by Rules 1-3, 5-6  
**Calculation**: Use `goal_target` directly

```typescript
// Covers MF, TB, TBD, DEBT goals and other NEED goal variations
return category.goal_target;
```

**Examples**:

- Monthly Funding (MF) goals → Use `goal_target`
- Target Balance (TB) goals → Use `goal_target`
- Debt goals → Use `goal_target`

## Implementation Details

### Day Counting for Weekly Goals

The `countDayOccurrencesInMonth` function accurately counts specific day occurrences:

```typescript
function countDayOccurrencesInMonth(
  year: number,
  month: number,
  dayOfWeek: number
): number {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let count = 0;

  for (
    let date = new Date(firstDay);
    date <= lastDay;
    date.setDate(date.getDate() + 1)
  ) {
    if (date.getDay() === dayOfWeek) {
      count++;
    }
  }

  return count;
}
```

### Date Handling

All date operations use UTC to avoid timezone issues:

```typescript
const goalCreationDate = new Date(
  category.goal_creation_month + 'T00:00:00.000Z'
);
const currentMonthDate = new Date(currentMonth + 'T00:00:00.000Z');
```

### Error Handling

The system includes comprehensive error handling:

- Invalid date parsing falls back to normal calculation
- Missing fields are handled with null checks
- Calculation errors are logged and use fallback values

## Testing Coverage

The calculation rules are thoroughly tested with:

- **Rule-specific tests**: Each rule tested in isolation
- **Priority tests**: Verify correct rule precedence
- **Edge cases**: Boundary conditions and error scenarios
- **Integration tests**: End-to-end calculation validation

## Debug Information

Each calculation returns debug information including:

- Applied rule name and description
- Raw YNAB API field values
- Calculation formulas and intermediate values
- Day counting details for weekly goals
- Error messages and fallback reasons

This enables comprehensive validation and troubleshooting of the calculation logic.

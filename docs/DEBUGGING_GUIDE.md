# Debugging Guide

## Overview

This guide explains how to use the comprehensive debugging features in the On Target Analysis for YNAB application. The debugging UI provides detailed insights into calculation logic, raw YNAB API data, and step-by-step rule evaluation.

## Accessing Debug Mode

### Enable Debug Information

1. **Navigate to the analysis dashboard**
2. **Locate the "Show Debug Information" toggle** in the top-right section
3. **Click the toggle** to enable debug mode
4. **Debug panels will appear** below each category with targets or assignments

### Debug Toggle Features

- **Global control**: Enables/disables debug information for all categories
- **Persistent state**: Debug mode preference is maintained during the session
- **Performance optimized**: Debug information is only rendered when enabled

## Debug Panel Components

### Category Debug Panel

Each category with goals displays a collapsible debug panel containing:

#### 1. Applied Calculation Rule
- **Rule identification**: Shows which of the 7 rules was applied
- **Color coding**: Each rule has a distinct color for easy identification
  - Rule 1 (Monthly NEED): Blue
  - Rule 2 (Weekly NEED): Green  
  - Rule 3 (Months to Budget): Purple
  - Rule 4 (Fallback): Orange
  - Rule 5 (Low Months to Budget): Red
  - Rule 6 (Future Goal Creation): Pink
  - No Goal: Gray

#### 2. Raw YNAB API Fields
Complete display of all relevant YNAB API fields with human-readable interpretations:

```
goal_type: NEED
goal_target: $400.00
goal_creation_month: 2024-01-01
goal_cadence: 1 (Monthly)
goal_cadence_frequency: 1
goal_day: null
goal_months_to_budget: null
goal_overall_left: null
budgeted: $450.00
balance: $150.00
activity: -$300.00
```

#### 3. Calculation Details
Step-by-step breakdown of the calculation process:

- **Formula used**: Exact calculation formula applied
- **Intermediate values**: Day counts, date comparisons, etc.
- **Final result**: Calculated "Needed This Month" value
- **Error handling**: Any fallback logic or error conditions

## Debug Information Interpretation

### Rule Identification

#### Rule 1: Monthly NEED
```
Rule: Rule 1: Monthly NEED
Calculation: goal_target = 40000
Result: $400.00 needed this month
```

#### Rule 2: Weekly NEED
```
Rule: Rule 2: Weekly NEED (5 occurrences)
Calculation: 25000 × 5 = 125000
Day: 4 (Thursday)
Month: 2024-12-01
Day Count: 5
Result: $1,250.00 needed this month
```

#### Rule 3: Months to Budget
```
Rule: Rule 3: Months to Budget
Calculation: (120000 + 0) ÷ 4 = 30000
Goal Overall Left: $1,200.00
Budgeted: $0.00
Months to Budget: 4
Result: $300.00 needed this month
```

#### Rule 6: Future Goal Creation
```
Rule: Rule 6: Future Goal Creation
Calculation: Goal created 2025-01-01 > analysis month 2024-12-01 → 0
Goal Creation Month: 2025-01-01
Current Month: 2024-12-01
Result: $0.00 needed this month
```

### Field Interpretations

#### Goal Cadence Values
- `0`: One-time goal
- `1`: Monthly recurring
- `2`: Weekly recurring
- `13`: Yearly recurring

#### Goal Day Values (for weekly goals)
- `0`: Sunday
- `1`: Monday
- `2`: Tuesday
- `3`: Wednesday
- `4`: Thursday
- `5`: Friday
- `6`: Saturday

#### Goal Types
- `NEED`: Needed for Spending goals
- `TB`: Target Category Balance goals
- `TBD`: Target Category Balance by Date goals
- `MF`: Monthly Funding goals
- `DEBT`: Debt payoff goals

## Troubleshooting Common Issues

### Unexpected Calculation Results

1. **Check the applied rule**: Verify the correct rule is being used
2. **Review raw fields**: Ensure YNAB API data is as expected
3. **Validate date handling**: Check goal_creation_month and current month comparison
4. **Examine day counting**: For weekly goals, verify day occurrence calculations

### Rule Priority Issues

If a category is using an unexpected rule:

1. **Review rule priority order**: Rules are evaluated in specific sequence
2. **Check goal_creation_month**: Rule 6 takes precedence over other rules
3. **Verify cadence fields**: Weekly goals (Rule 2) override months-to-budget (Rule 3)
4. **Validate goal_months_to_budget**: Rule 5 handles zero/negative values

### Missing Debug Information

If debug panels don't appear:

1. **Ensure debug mode is enabled**: Toggle "Show Debug Information"
2. **Check category has goals**: Debug info only shows for categories with targets
3. **Verify category is included**: Hidden or deleted categories may be filtered out
4. **Refresh the page**: Clear any cached data

## Advanced Debugging Techniques

### API Response Inspection

Use the debug API endpoint to examine raw YNAB data:

```bash
curl "http://localhost:3000/api/debug/ynab-raw?budgetId=budget-uuid&month=2024-12-01"
```

### Console Logging

Enable browser console logging for additional debug information:

1. **Open browser developer tools** (F12)
2. **Navigate to Console tab**
3. **Look for calculation warnings** and error messages
4. **Check network requests** for API response details

### Calculation Validation

To validate calculations manually:

1. **Note the raw field values** from the debug panel
2. **Apply the calculation rule** shown in the debug information
3. **Compare with the displayed result**
4. **Check for rounding differences** (calculations use Math.round)

## Debug Panel Navigation

### Expanding/Collapsing Panels

- **Click the debug toggle button** (🔍) next to each category
- **Panels expand** to show full debug information
- **Click again to collapse** and reduce visual clutter
- **Multiple panels** can be open simultaneously

### Information Layout

Debug panels are organized in logical sections:

1. **Rule Summary**: Applied rule with color coding
2. **Raw API Fields**: Complete YNAB data with interpretations
3. **Calculation Details**: Step-by-step calculation breakdown
4. **Additional Context**: Error handling, fallbacks, special cases

## Performance Considerations

### Debug Mode Impact

- **Minimal performance impact**: Debug information is pre-calculated
- **Conditional rendering**: Only displayed when debug mode is enabled
- **Efficient updates**: Debug panels update automatically with data changes

### Large Budget Handling

For budgets with many categories:

- **Selective expansion**: Open only relevant debug panels
- **Use filtering**: Focus on specific category groups or types
- **Monitor browser performance**: Close unused panels if needed

## Integration with Testing

### Test Case Development

Debug information helps create comprehensive test cases:

1. **Document expected rules** for different goal configurations
2. **Capture edge cases** revealed through debug inspection
3. **Validate calculation formulas** against debug output
4. **Test rule priority** scenarios

### Regression Testing

Use debug mode to verify:

- **Calculation consistency** across application updates
- **Rule application accuracy** for complex goal types
- **Edge case handling** for unusual YNAB configurations
- **Performance stability** with debug information enabled

This debugging system provides comprehensive visibility into the calculation engine, enabling thorough validation and troubleshooting of YNAB budget analysis results.

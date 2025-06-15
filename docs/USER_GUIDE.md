# On Target Analysis for YNAB - User Guide

**Version:** 1.0  
**Last Updated:** June 2025  
**Status:** Production Ready

## Overview

The On Target Analysis for YNAB application helps you understand how well your monthly budget assignments align with your predefined targets. This guide explains how to use the application effectively.

## Getting Started

### Prerequisites

1. **Active YNAB Subscription**: You need a valid You Need A Budget account
2. **YNAB Personal Access Token**: Generated from your YNAB developer settings
3. **Budget with Targets**: At least some categories should have targets/goals set

### Initial Setup

1. **Configure API Access**: Add your YNAB Personal Access Token to the application
2. **Verify Connection**: The dashboard will show "✓ Valid" configuration and "Connected to YNAB API"
3. **Check Rate Limit**: Monitor your API usage (200 requests/hour limit)

## Understanding the Dashboard

### Configuration Status

The top of the dashboard shows:

- **Configuration**: ✓ Valid / ✗ Invalid
- **YNAB API Connection**: Connected / Disconnected
- **API Rate Limit**: X / 200 remaining

### Budget Selection

**Budget Selector Dropdown:**

- Lists all your YNAB budgets
- Shows budget names (e.g., "Family Budget V2", "Team MK")
- Automatically selects your default budget initially

**How Budget Selection Works:**

- Each budget has a valid date range (`firstMonth` to `lastMonth`)
- Archived budgets show limited date ranges
- Active budgets typically extend into future months

### Month Selection

**Month Selector Dropdown:**

- Shows available months for the selected budget
- Displays months in "Month YYYY" format (e.g., "December 2024")
- Most recent months appear first

**Month Selection Logic:**

- **Available Range**: Only months within budget's date range are shown
- **Default Selection**:
  - Current month if within budget range
  - Budget's last month if current month is after range
  - Budget's first month if current month is before range

**Example Date Ranges:**

- **Active Budget**: March 2024 → May 2025 (18 months available)
- **Archived Budget**: January 2024 → June 2024 (6 months available)

## Analysis Results

### Core Metrics

**Total Assigned**: Sum of all money assigned to categories this month

- Calculated from YNAB `budgeted` field across all categories
- Includes both targeted and non-targeted categories
- Displayed in dollars (converted from milliunits)

**Total Targeted**: Sum of all category targets/goals for this month

- Only includes categories that have targets set
- Calculated from YNAB `goal_target` field
- Excludes categories without targets

### Alignment Categories

**On-Target** (Green):

- Categories where assigned amount matches target
- Within $1.00 tolerance by default
- Indicates good budget discipline

**Over-Target** (Orange):

- Categories where assigned amount exceeds target
- Shows excess funding that could be reallocated
- May indicate changing priorities

**Under-Target** (Red):

- Categories where assigned amount is less than target
- Indicates potential shortfall in goal achievement
- Requires attention to stay on track

**No Target** (Gray):

- Categories with assignments but no targets set
- Represents unplanned or flexible spending
- Consider setting targets for better tracking

### Key Performance Indicators

**Budget Discipline Rating**:

- **Excellent** (85%+): Most assignments align with targets
- **Good** (70-84%): Generally good alignment with minor variances
- **Fair** (50-69%): Moderate alignment, room for improvement
- **Needs Improvement** (<50%): Significant misalignment from targets

**Target Alignment Score** (0-100):

- Weighted score considering on-target, over-target, and under-target percentages
- Bonus points for having targets set (encourages target setting)
- Higher scores indicate better budget discipline

## YNAB Terminology Mapping

### YNAB API Fields → Application Terms

| YNAB API Field | YNAB UI Term          | Application Term | Description                       |
| -------------- | --------------------- | ---------------- | --------------------------------- |
| `budgeted`     | "Assigned This Month" | "Total Assigned" | Money allocated to categories     |
| `activity`     | "Activity"            | Not used         | Actual spending/income            |
| `balance`      | "Available"           | Not used         | Money remaining to spend          |
| `goal_target`  | "Target Amount"       | "Total Targeted" | Target/goal amount                |
| `goal_type`    | "Goal Type"           | "Target Type"    | Type of goal (TB, MF, NEED, etc.) |

### Goal Types Explained

- **TB** (Target Category Balance): Save a specific amount
- **TBD** (Target Category Balance by Date): Save amount by specific date
- **MF** (Monthly Funding): Fund with specific amount each month
- **NEED** (Plan Your Spending): Spending goal for the month
- **DEBT** (Debt Payoff Goal): Pay off debt by specific date

## Interpreting Results

### Top Over-Target Categories

Shows categories with the largest excess funding:

- **Category Name**: Name and category group
- **Assigned vs Target**: Actual assignment vs target amount
- **Variance**: Dollar amount over target
- **Percentage**: How much over target (e.g., 400% = 4x target)

**Action Items:**

- Consider reducing assignments to reallocate funds
- Evaluate if targets need updating
- Check if over-funding is intentional

### Top Under-Target Categories

Shows categories with the largest funding shortfalls:

- **Negative Variance**: Dollar amount under target
- **Percentage**: How much under target (e.g., -100% = no funding)

**Action Items:**

- Increase assignments to meet targets
- Evaluate if targets are realistic
- Consider adjusting target dates or amounts

### Categories Without Targets

Lists categories that have assignments but no targets:

- Represents unplanned or flexible spending
- Consider setting targets for better tracking
- May indicate areas where goals would be beneficial

## Best Practices

### Setting Up for Success

1. **Set Realistic Targets**: Base targets on historical spending and income
2. **Regular Review**: Check alignment monthly and adjust as needed
3. **Target Coverage**: Aim to have targets for most spending categories
4. **Tolerance Setting**: Use small tolerance ($1-5) for precise tracking

### Using the Analysis

1. **Monthly Review**: Check alignment at month-end
2. **Mid-Month Adjustments**: Use real-time data to adjust assignments
3. **Trend Tracking**: Monitor discipline rating over time
4. **Goal Refinement**: Update targets based on analysis insights

### Troubleshooting

**"Configuration Invalid"**:

- Check YNAB Personal Access Token
- Verify token has not expired
- Ensure token has proper permissions

**"No months available"**:

- Budget may be archived or have no data
- Check budget date range
- Try selecting a different budget

**"Month out of range" error**:

- Selected month is outside budget's valid range
- Use month selector to choose valid month
- Check if budget needs to be extended

## Advanced Features

### Custom Analysis Configuration

The application supports custom analysis parameters:

- **Tolerance**: Adjust "on-target" tolerance amount
- **Category Filters**: Include/exclude hidden or deleted categories
- **Minimum Threshold**: Filter out small assignments

### Data Export

Analysis results can be used for:

- Monthly budget reviews
- Goal setting sessions
- Financial planning discussions
- Budget optimization decisions

## Support and Feedback

For technical issues or feature requests:

1. Check the troubleshooting section
2. Review API rate limits
3. Verify YNAB service status
4. Contact support with specific error messages

## Version History

- **v1.0** (June 2025): Initial release with full functionality
  - Budget and month selection
  - Comprehensive target alignment analysis
  - Real-time YNAB API integration
  - Responsive web interface

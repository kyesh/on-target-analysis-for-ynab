# YNAB API Field Analysis - "Needed This Month" Investigation

## Raw Data Analysis from December 2024

### Key Observations from Real YNAB Data

#### 1. **goal_under_funded Behavior Patterns**

**Categories with goal_under_funded = null:**

- Summer Camp (NEED): budgeted=0, goal_target=800000, goal_under_funded=null
- 25 - Camp Michigania (NEED): budgeted=0, goal_target=5240000, goal_under_funded=null
- YNAB (NEED): budgeted=109000, goal_target=110000, goal_under_funded=null
- Cobra Premium (NEED): budgeted=1652180, goal_target=865880, goal_under_funded=null

**Categories with goal_under_funded = 0:**

- Mortgage (NEED): budgeted=2281680, goal_target=2281680, goal_under_funded=0 (100% complete)
- Grocery (NEED): budgeted=537340, goal_target=220000, goal_under_funded=0 (100% complete, over-funded)
- Au Pair Stipend (NEED): budgeted=1075000, goal_target=215000, goal_under_funded=0 (100% complete, over-funded)

**Categories with goal_under_funded > 0:**

- Water (NEED): budgeted=63340, goal_target=235000, goal_under_funded=15000 (26% complete)
- Internet (NEED): budgeted=34670, goal_target=51000, goal_under_funded=820 (98% complete)
- Gas (NEED): budgeted=100000, goal_target=120000, goal_under_funded=7080 (94% complete)
- Kibble (NEED): budgeted=59590, goal_target=90000, goal_under_funded=30410 (66% complete)

#### 2. **Monthly Funding (MF) Goals Analysis**

**MF Goals with goal_under_funded:**

- Books and Art Supplies (MF): budgeted=4990, goal_target=15000, goal_under_funded=10010
- Vehicle Registration (MF): budgeted=0, goal_target=25000, goal_under_funded=25000
- Baby Clothes (MF): budgeted=0, goal_target=125000, goal_under_funded=125000
- Home Maintenance (MF): budgeted=0, goal_target=100000, goal_under_funded=100000
- Hostess Gifts/Potluck (MF): budgeted=132480, goal_target=20000, goal_under_funded=0

#### 3. **Key Pattern Discovery**

**goal_under_funded appears to represent:**

- **For NEED goals**: Amount still needed to reach the target for this specific month/period
- **For MF goals**: Amount still needed to reach the monthly funding target
- **When null**: Goal may be inactive, future-dated, or not applicable for current month
- **When 0**: Goal is fully funded for the current period

#### 4. **Relationship Analysis**

**Formula appears to be:**

```
goal_under_funded = max(0, goal_target - goal_overall_funded)
```

**Examples:**

- Water: goal_target=235000, goal_overall_funded=63340, goal_under_funded=15000 ❌ (doesn't match formula)
- Internet: goal_target=51000, goal_overall_funded=50180, goal_under_funded=820 ✅ (matches: 51000-50180=820)
- Gas: goal_target=120000, goal_overall_funded=112920, goal_under_funded=7080 ✅ (matches: 120000-112920=7080)

#### 5. **Null Values Investigation**

**Categories with null goal_under_funded seem to be:**

- Future-dated goals (goal_target_month in future)
- Inactive goals
- Goals that don't require monthly funding calculation

#### 6. **Over-funded Categories**

**When budgeted > goal_target:**

- Grocery: budgeted=537340, goal_target=220000, goal_under_funded=0
- Au Pair Stipend: budgeted=1075000, goal_target=215000, goal_under_funded=0
- Hostess Gifts: budgeted=132480, goal_target=20000, goal_under_funded=0

**Pattern**: goal_under_funded=0 when goal is met or exceeded

## OFFICIAL YNAB API DOCUMENTATION CONFIRMATION

### Microsoft YNAB API Documentation Definition:

**`goal_under_funded` (integer)**:

> "The amount of funding still needed in the current month to stay on track towards completing the goal within the current goal period. This amount will generally correspond to the 'Underfunded' amount in the web and mobile clients except when viewing a category with a Needed for Spending Goal in a future month."

### Cross-Month Behavior Analysis

#### November 2024 vs December 2024 Comparison:

**Books and Art Supplies (MF Goal):**

- November: budgeted=43660, goal_target=15000, goal_under_funded=0
- December: budgeted=4990, goal_target=15000, goal_under_funded=10010
- **Analysis**: In November, fully funded (over-funded), in December needs $10.01 more

**DTE/Consumer (Goal Type Unknown):**

- November: budgeted=198810, goal_target=400000, goal_under_funded=201190
- December: budgeted=0, goal_target=400000, goal_under_funded=400000
- **Analysis**: November partially funded, December completely unfunded

**Vehicle Registration (MF Goal):**

- October: budgeted=0, goal_target=25000, goal_under_funded=25000
- December: budgeted=0, goal_target=25000, goal_under_funded=25000
- **Analysis**: Consistently unfunded across months

### Key Findings:

1. **goal_under_funded IS "Needed This Month"**: Official documentation confirms this
2. **Monthly Variation**: Values change month-to-month based on current funding status
3. **Real-time Calculation**: Reflects current month's funding needs, not overall goal progress
4. **Null Values**: Appear for inactive/future goals or goals not applicable to current month
5. **Zero Values**: Indicate goal is fully funded for current month/period

### VERIFICATION: Our Implementation is MOSTLY CORRECT with Edge Case Identified

Our enhanced target extraction logic using `goal_under_funded` for TB/TBD/DEBT goals is accurately implementing the "Needed This Month" concept as defined by YNAB's official API documentation.

**HOWEVER**: We identified a critical edge case where our implementation differs from YNAB UI behavior.

## EDGE CASE DISCOVERED: Future-Dated NEED Goals

### The Problem

**Future-dated NEED goals return `goal_under_funded = null`** until the target month is reached, but YNAB's UI still displays a "Needed This Month" value.

### Examples from Real Data

**Summer Camp (Target: 2025-06-01)**:

- December 2024: `goal_under_funded = null` (6 months before target)
- June 2025: `goal_under_funded = 687930` (in target month)

**Camp Michigania (Target: 2025-04-15)**:

- December 2024: `goal_under_funded = null` (4 months before target)
- April 2025: `goal_under_funded = 580000` (in target month)

### Manual Calculation Formula

For future-dated goals where `goal_under_funded = null`, YNAB UI likely calculates:

```
Monthly Needed = (goal_target - goal_overall_funded) / months_remaining
```

**Example Calculations**:

- Summer Camp: (800,000 - 0) / 6 months = 133,333 milliunits/month ($133.33)
- Camp Michigania: (5,240,000 - 0) / 4 months = 1,310,000 milliunits/month ($1,310.00)

### Impact on Our Implementation

**Current Behavior**: Future-dated NEED goals with `goal_under_funded = null` fall back to `goal_target`, which represents the TOTAL goal amount, not the monthly amount needed.

**Correct Behavior**: Should calculate monthly amount using the formula above when `goal_under_funded = null` and `goal_target_month` is in the future.

### Recommendation

Enhance our target extraction logic to handle this edge case by implementing the manual calculation for future-dated goals.

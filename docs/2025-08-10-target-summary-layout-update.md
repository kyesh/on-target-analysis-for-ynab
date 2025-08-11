# Target Summary UI Update

## Desired end state
- Target Summary card header shows count and total targeted dollar amount, e.g., "Target Summary (26) - $3,245.00 Total Targeted".
- Target Summary list layout focuses on each category's target amount and its percent of Total Targeted.
  - Right-hand column shows the category's Target in bold
  - A secondary line shows the percentage of the overall Total Targeted that this category represents
- We intentionally omit Assigned and Variance from this section to keep focus on target composition. Those details remain in Over/Under Target sections and the detailed category list.

## Implementation plan
1. Update AnalysisDashboard Target Summary header to append `{formatCurrency(monthlyAnalysis.totalTargeted)} Total Targeted`.
2. Change Target Summary list item right column to:
   - Primary: `formatCurrency(item.target)` in prominent styling
   - Secondary: `(item.target / monthlyAnalysis.totalTargeted) * 100` formatted to 1 decimal followed by "% of total targeted"
3. Keep list sorting by `target` descending and maintain scroll container.
4. Do not change data structures; reuse existing `monthlyAnalysis.totalTargeted` and computed `targetSummary`.

## Testing
- Visual check locally for a month with multiple targeted categories.
- Verify percentage sums approximately to 100% (allowing rounding).
- Confirm Over/Under Target sections unchanged and still display total over/under in headers.
- Run type-checks and unit tests.

## Notes
- Guard divide-by-zero when totalTargeted is 0; show 0.0%.


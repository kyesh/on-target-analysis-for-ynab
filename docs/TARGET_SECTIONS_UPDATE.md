# Target Sections Update Plan

## Overview
We will update the application to:
1. Replace the wording "over/under budget" with "over/under target" where applicable.
2. Make Over/Under Target category lists scrollable so all items are visible (no top-5 truncation).
3. Add a new Target Summary section listing all categories with targets > 0 for the selected month, ordered by target amount (largest to smallest).

## Current State (as discovered)
- UI strings and list rendering are in `src/components/AnalysisDashboard.tsx`.
- Over/Under sections previously displayed only the top 5 using `.slice(0, 5)`.
- Section headers said "Over Budget" and "Under Budget".
- Data is provided by `generateDashboardSummary` in `src/lib/monthly-analysis.ts`, which used `getTopVarianceCategories(..., 10, ...)`.

## Desired End State
- All relevant strings use "target" terminology.
- Over-Target and Under-Target sections show all items with a scroll container, not just top five.
- Target Summary appears below the two sections:
  - Includes all categories with targets > 0 for the month
  - Sorted by target descending
  - Shows Target, Assigned, and Variance colored similarly to the detailed list

## Implementation Steps
1. Update AnalysisDashboard UI text and list behavior:
   - Change headers from "Over Budget/Under Budget" to "Over Target/Under Target".
   - Remove `.slice(0, 5)` and wrap lists in a max-height scroll container.
2. Update data generation to return all variance items:
   - Pass `Number.POSITIVE_INFINITY` as limit in `getTopVarianceCategories` call within `generateDashboardSummary` so the UI can display all.
3. Add Target Summary section in `AnalysisDashboard.tsx`:
   - Compute `targetSummary` by filtering `analysis.categories` for `hasTarget && neededThisMonth > 0` and sort by target desc.
   - Render a scrollable list showing Target, Assigned, and Variance with color coding.
4. Testing:
   - Run `npm run type-check` and `npm test`.
   - Manually verify UI in dev: confirm lists are scrollable and wording updates.

## Notes and Trade-offs
- Using `Number.POSITIVE_INFINITY` ensures no artificial limit; the UI scroll container keeps rendering performant.
- We preserved existing color coding and percentage messaging; only wording and list behavior changed.

## Next Steps
- After verification, update `docs/IMPLEMENTATION_STATUS.md` and `docs/USER_GUIDE.md` to reflect the new sections and behavior.


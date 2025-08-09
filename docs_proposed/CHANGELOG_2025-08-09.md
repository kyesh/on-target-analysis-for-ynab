# Changelog - 2025-08-09

## UI Updates
- Replace "Over/Under Budget" wording with "Over/Under Target" in category sections.
- Over/Under Target lists now show all categories within a scrollable container (removed top-5 limit).
- Added Target Summary section: lists all categories with targets > 0 for the selected month, sorted by target amount descending.

## Data Layer
- generateDashboardSummary now requests all over/under variances by passing `Number.POSITIVE_INFINITY` to getTopVarianceCategories.

## Notes
- TypeScript type check passes.
- Jest tests: existing suite surfaced unrelated calculation rule expectations; no changes were made to calculation logic in this update.


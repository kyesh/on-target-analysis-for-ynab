# UI Bugfix: Target Summary nested inside Under-Target Categories

## Current behavior
- The "Target Summary" card was rendered inside the "Under-Target Categories" card, causing visual nesting and confusing scrollbars.
- Root cause: mis-nested JSX — the Target Summary block was placed before the closing tags of the Under-Target list container.

## Desired end state
- "Under-Target Categories" and "Target Summary" are rendered as two separate top-level cards, each with its own header, body, and scroll area.
- No overlapping/nested backgrounds; clean vertical stacking in the dashboard.

## Plan
1. Edit `src/components/AnalysisDashboard.tsx` to:
   - Remove the Target Summary markup accidentally placed within the Under-Target block
   - Re-insert the Target Summary card as a sibling, immediately after the Under-Target card
2. Type-check and build to catch JSX mistakes
3. Follow-up: add a lightweight UI test to assert card order and headings

## Implementation summary
- Removed the mis-nested block between lines ~388–436.
- Inserted a new standalone Target Summary card after the Under-Target block (now around lines ~403–451 after formatting).
- Ran `npm run type-check` and `npm run build` successfully.

## Verification steps (next)
- Run the app locally and authenticate with YNAB
- Verify visually that the two cards are separate
- Add an automated Playwright test (post-auth) that:
  - Navigates to the dashboard
  - Asserts presence and order of H3 headings: Under-Target Categories -> Target Summary
  - Takes a screenshot

## Notes
- No dependency changes
- No sensitive data added


# Production Validation Plan (2025-08-11)

## Desired End State
- Confirm the new deployment is healthy and introduced no regressions.
- Validate key endpoints/pages via browser automation (Playwright tools):
  - Home page renders without console errors
  - /api/health returns healthy
  - /auth/signin and /auth/error render
  - Unauthenticated APIs (/api/budgets, /api/analysis/monthly) return 401

## Targets
- Base URL (Cloud Run): https://on-target-analysis-for-ynab-bmedyh2qpq-uc.a.run.app

## Steps
1) Load home, capture console messages, screenshot
2) Hit /api/health and check content contains "healthy"
3) Load /auth/signin, /auth/error and capture screenshots
4) Load /api/budgets and /api/analysis/monthly; verify 401 via network request status

## Acceptance Criteria
- No console errors on home
- Health endpoint shows healthy
- Auth pages accessible
- Unauth APIs return 401


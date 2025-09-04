# Local Smoke Test Results — On Target Analysis for YNAB

Date: 2025-09-04
Environment: macOS (darwin), Node 20+, Next.js 15.4.6, local dev server at http://localhost:3000

## Scope
- Verify the app runs locally with current env (.env.local present)
- Exercise key routes via browser automation (Playwright tools)
- Validate OAuth entry points and error UX
- Run existing integration checks script

## Commands Executed
1) npm install
   - Result: up to date; 1 moderate advisory (no action taken)
2) npm run dev
   - Result: Ready in ~7s on http://localhost:3000
   - Notice: Next.js printed "Found multiple lockfiles. Selecting /Users/kennethyesh/GitRepos/package-lock.json."
3) curl http://localhost:3000/ -> 200 OK
4) curl http://localhost:3000/api/health
   - Result: status: healthy; checks.oauth_config=true; checks.ynab_connectivity=true
5) ./scripts/test-integration.sh all
   - Result: All integration tests passed; page load 87ms; warning: dashboard page 404

## Playwright Browser Actions (manual smoke via tooling)
- Visited /
  - Saw header "On Target Analysis for YNAB"; System Status cards; footer legal sections
- Clicked CTA to /auth/signin (and directly opened /auth/signin)
  - Sign-in page rendered with "Connect with YNAB" button and development mode hint
- Clicked "Connect with YNAB"
  - Navigated to YNAB authorize page with correct params:
    - client_id from env, scope=read-only, response_type=token
    - redirect_uri=http://localhost:3000/auth/callback
- Visited /auth/error?error=access_denied&error_description=User%20denied%20access
  - Error page rendered with friendly copy, Try Again and Go Home buttons, development details

## Observations
- App boots and serves pages successfully; health endpoint reports healthy
- OAuth initiation flow correctly builds YNAB authorize URL and redirects to YNAB
- Integration script confirms:
  - /api/budgets and /api/analysis/monthly return 401 unauthenticated as expected
  - Security headers present (CSP, XFO, X-Content-Type-Options)
  - Performance good (87ms page load by script)
- Minor items:
  - Next.js warning: multiple lockfiles detected; selecting parent /Users/kennethyesh/GitRepos/package-lock.json (environmental; consider removing parent lockfile or running in clean folder)
  - Integration script warning: /dashboard returned 404; expected 200/302/307. If a dashboard route is intended, add a stub/redirect for unauthenticated users; otherwise update test expectation.
  - Console warnings from SecurityInitializer flagged "Suspicious DOM modification" for PostHog script/iframe injections. Likely benign but noisy in dev; we can tune allowlist.
  - A 404 for a local asset was seen once in console (likely favicon or map); needs confirmation if persistent.

## Verdict
- The application behaves normally in local dev for core flows. OAuth entrypoint works and error UX is correct. Integration checks pass.

## Next Steps (Proposed)
1) Dashboard route behavior
   - Decide if /dashboard should exist. If yes, create page that redirects unauthenticated users to /auth/signin (and update tests). If no, adjust integration script to accept 404.
2) SecurityInitializer tuning
   - Add an allowlist entry to avoid flagging known analytics injections (PostHog) during development.
3) Resolve lockfile warning
   - Remove stray package-lock.json in /Users/kennethyesh/GitRepos (outside repo) or run dev from a clean shell where CWD has no parent lockfile.
4) Track down recurring 404 asset (if reproducible)
   - Open devtools Network tab to identify missing path and add asset or update reference.

## Artifacts
- Health JSON sample shows checks.oauth_config=true and ynab_connectivity=true
- YNAB authorize URL captured with correct query params
- Integration script output captured in terminal (all checks passed)


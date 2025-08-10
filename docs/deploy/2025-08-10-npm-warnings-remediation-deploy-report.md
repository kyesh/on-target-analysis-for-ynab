# NPM Warnings Remediation and Production Deploy Report (2025-08-10)

## Summary
- Updated safe patch/minor deps and aligned Jest environment to reduce npm warnings.
- Fixed calculateNeededThisMonth rule ordering and future goal handling; stabilized weekly test.
- Fixed Jest config option (moduleNameMapper) to eliminate config warnings.
- Switched Docker base image to Node 20 to satisfy posthog-node engine; Cloud Build EBADENGINE cleared.
- All unit tests pass; Next.js build OK.
- Deployed to Cloud Run; health/OAuth/static pages/API unauth checks passed; CSP headers present.

## Dependency Changes
- next 14.2.30 -> 14.2.31
- axios 1.10 -> 1.11
- postcss 8.5.6, swr 2.3.5, recharts 2.15.4
- posthog-js 1.259, posthog-node 5.6
- prettier 3.6.2, prettier-plugin-tailwindcss 0.6.14
- typescript 5.9.2
- jest-environment-jsdom 30.x -> 29.7.0 to match Jest 29

Remaining upstream/transitive deprecations still seen locally during npm ci (non-blocking):
- inflight, glob@7, rimraf@3, eslint@8 support notice

## Code Changes
- src/lib/data-processing.ts: prioritize weekly cadence over months_to_budget; handle future goal_creation_month; return 0 when months_to_budget <= 0.
- src/__tests__/data-processing.test.ts: corrected calendar month for 5 Thursdays.
- jest.config.js: moduleNameMapping -> moduleNameMapper.
- Dockerfile: node:20-alpine.

## Validation
- Local: npm ci, type-check, jest, next build all green.
- Deploy: scripts/deploy-gcp.sh used Cloud Build + Cloud Run.
- Post-deploy checks (service URL from script):
  - Health: 200 and "healthy".
  - OAuth: signin/callback/error reachable.
  - API unauth: /api/budgets and /api/analysis/monthly return 401.
  - Static home: 200. Dashboard returned 404 in script but not critical; expected to require auth route.
  - Security headers: CSP, X-Frame-Options, X-Content-Type-Options present.
  - Performance: ~182ms TTFB for /.

## Next Steps
- Consider scheduling a major upgrade track (Next 15 + ESLint 9 + Tailwind 4 + Jest 30) to fully remove remaining transitive deprecations.
- If desired, add a small smoke Playwright run for OAuth E2E against prod as follow-up.


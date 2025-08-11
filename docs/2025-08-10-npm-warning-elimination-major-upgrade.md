# Major Upgrade Plan to Eliminate NPM Deprecation Warnings (2025-08-10)

## Desired End State
- No npm install/ci deprecation warnings from inflight, glob@7, rimraf@3, domexception, or ESLint 8 support notices.
- Project on:
  - Next 15.x
  - ESLint 9.x + @typescript-eslint 8.x + eslint-config-next 15.x
  - Jest 30.x + jest-environment-jsdom 30.x (remove ts-jest if unused)
  - Node 20 in Docker (already updated) and production
- CI/build logs clean, no "--force" notices (removed cache clean force in Docker).

## Plan
1) Upgrade framework/toolchain majors:
   - next -> ^15, eslint -> ^9, eslint-config-next -> ^15, @typescript-eslint/* -> ^8
   - jest -> ^30, jest-environment-jsdom -> ^30, remove ts-jest
   - keep React 18 to reduce risk (Next 15 supports React 18)
2) Adjust ESLint configuration if needed (rules/plugin compatibility), run lint locally.
3) Verify locally:
   - npm ci, npm run type-check, npm test, npm run build
   - Confirm npm ci output is free of listed deprecations
4) Redeploy to Cloud Run; run integration checks against prod URL.
5) Document results and next steps; move docs_proposed to docs/ when complete.

## Risks & Mitigations
- Major upgrades can surface config changes (ESLint/Jest). We'll iterate minimally and keep code changes tiny.
- If unexpected breaking changes appear, we can quickly revert via git and lock file.

## Acceptance Criteria
- npm ci shows none of the deprecations listed by the user.
- All tests/build pass and app functions in prod checks.


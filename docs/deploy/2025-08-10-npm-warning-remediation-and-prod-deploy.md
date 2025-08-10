# NPM Warning Remediation and Production Redeploy Plan (2025-08-10)

## Desired End State
- Minimize npm install/build warnings without introducing breaking changes.
- Keep framework majors stable (Next.js 14, React 18, Tailwind 3, Jest 29) to reduce risk.
- Update dependencies to latest compatible patch/minor versions.
- Align Jest environment versions to avoid cross-major mismatches.
- Verify: type-check, lint, unit tests, build.
- Redeploy to GCP Cloud Run using existing scripts and run integration checks against prod.

## Current Findings (baseline)
- npm ci emitted deprecation warnings from transitive dependencies: inflight, rimraf@3, glob@7, eslint@8 support notice.
- Outdated packages (highlights):
  - next 14.2.30 -> 14.2.31 (stay on 14)
  - axios 1.10 -> 1.11
  - posthog-js 1.252 -> 1.259; posthog-node 5.1 -> 5.6
  - postcss 8.5.5 -> 8.5.6
  - prettier 3.5.3 -> 3.6.2; prettier-plugin-tailwindcss 0.5.14 -> 0.6.14
  - swr 2.3.3 -> 2.3.5; recharts 2.15.3 -> 2.15.4
  - typescript 5.8.3 -> 5.9.2
  - jest-environment-jsdom was 30.x while jest is 29.x (mismatch). Will align env to 29.7.
- Some warnings (eslint 8 EOL, glob 7 deprecation) likely persist until major upgrades (Next 15 / ESLint 9 / Tailwind 4 / Jest 30).

## Plan
1) Update safe patch/minor versions via npm install to reduce warnings.
2) Align Jest environment to 29.7 to match Jest 29 and ts-jest 29.
3) Reinstall clean, run type-check, lint, unit tests, and build.
4) If clean: deploy to prod with scripts/deploy-gcp.sh and run scripts/test-integration.sh against prod URL.
5) Document results and follow-up plan for remaining transitive warnings that require major upgrades.

## Test Strategy
- Unit tests: `npm test`
- Build verification: `npm run build`
- Integration checks: `./scripts/test-integration.sh` locally and against prod (TEST_BASE_URL)

## Risks & Rollback
- Low risk: only patch/minor updates and Jest env alignment. Rollback by reverting lockfile and package.json.

## Follow-up (Phase 2 - separate work)
- Consider coordinated upgrade to Next 15 + ESLint 9 + Tailwind 4 + Jest 30 to fully eliminate upstream deprecations, scheduled post-production verification.


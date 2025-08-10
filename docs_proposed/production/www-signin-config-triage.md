# Triage: www site sign-in config error (production)

Date: 2025-08-10

## Observations
- Using Playwright on https://www.ontargetanalysisforynab.com/auth/signin shows a UI banner: "NEXT_PUBLIC_YNAB_CLIENT_ID environment variable is not set" and the Connect button is disabled.
- Console logs:
  - Security monitoring initialized
  - Warning: PostHog API key not configured
- Homepage (/) shows System Status in "Checking…" then logs a client-side error: AppError: No authentication token available (expected when unauthenticated). It likely reads health OK but cannot proceed without token.
- This indicates a mismatch: server health likely sees NEXT_PUBLIC_YNAB_CLIENT_ID set (via Cloud Run env/secret), but the client bundle does not have the value at runtime.

## Root cause
- Next.js client-side code references process.env.NEXT_PUBLIC_YNAB_CLIENT_ID at module load (implicit-oauth-client.ts). In Next.js, NEXT_PUBLIC_* is statically inlined at build time. Our Docker/Cloud Build currently does not inject the YNAB client ID at build time, only at deploy/runtime via Cloud Run --set-secrets.
- Result: the built client bundle has NEXT_PUBLIC_YNAB_CLIENT_ID undefined, causing the sign-in page to show a configuration error, even though the server health endpoint passes.

## Proposed fix (safer runtime approach)
- Inject public runtime config from the server into window.__PUBLIC_CONFIG__ in app/layout.tsx using a small script that reads process.env at request time.
- Update implicit-oauth-client.ts to read client ID via a getter from window.__PUBLIC_CONFIG__ with fallback to process.env for dev. Avoid static top-level read.
- This uses Cloud Run runtime env (from Secret Manager) correctly without changing the build pipeline.

## Alternative fix (build-time injection)
- Pass NEXT_PUBLIC_YNAB_CLIENT_ID as a Docker build arg and embed during npm run build; requires adjusting deploy script to fetch the secret and pass --build-arg, and ensuring Cloud Build path supports build args. Less flexible and slightly more plumbing.

## Validation plan
1) Implement runtime injection and client getter.
2) Deploy to Cloud Run.
3) Playwright checks on prod:
   - /auth/signin shows no config error and the Connect with YNAB button is enabled.
   - Clicking the button navigates to app.ynab.com OAuth with redirect_uri=https://www.ontargetanalysisforynab.com/auth/callback.
4) Confirm /api/health remains healthy.

## Notes
- Revealing client_id on the client is expected for public OAuth apps.
- PostHog keys are optional; we can keep the warning if analytics disabled.


# Local Run + Playwright Smoke Test Plan

## Desired end state
- Next.js dev server runs locally on http://localhost:3000 with required env configured
- Home page renders without runtime errors; health endpoint responds
- Key navigation flows load: / (home), /auth/signin, /auth/error (render only)
- OAuth link is present and clickable; we validate redirect initiation (not full YNAB login)
- No obvious console errors during basic navigation

## Approach
1. Review existing docs (docs/SETUP_GUIDE.md, DEVELOPMENT_GUIDE.md) to confirm commands and env
2. Start locally using scripts/dev-with-secrets.sh start to generate .env.local from GCP Secret Manager and run app
   - If GCP auth/secrets unavailable, fall back to .env.local from .env.example with placeholder NEXT_PUBLIC_YNAB_CLIENT_ID and NextAuth secret
3. Use Playwright tools to perform a smoke run:
   - Open /, verify title, header, status card, and presence of the sign-in CTA
   - Click the sign-in CTA to load /auth/signin and ensure the page renders and shows config validation
   - Visit /auth/error?error=access_denied to validate error page UX
   - Capture console messages and network requests for anomalies
4. If time allows, run scripts/test-integration.sh all for quick API-level sanity checks (expect 401s for protected endpoints when unauthenticated)

## Automation/tests
- We will rely on the built-in Playwright tools of our environment for this pass (no local Playwright package install required)
- Future work: add minimal e2e Playwright config and scripts in repo for CI

## Risks/Notes
- Full OAuth cannot be automated without live YNAB creds; out-of-scope for this smoke pass
- If gcloud auth is missing, we’ll use the fallback .env.local and proceed

## Exit criteria
- Server runs; browser smoke steps pass; no critical errors observed in console/network
- Short summary + next steps committed to git


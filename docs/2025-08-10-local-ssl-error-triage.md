# Local SSL Error Triage: ERR_SSL_PROTOCOL_ERROR on http://localhost:3000

## Summary
When accessing the local app with a production-like build, the browser displayed:

- "This site can’t provide a secure connection"
- ERR_SSL_PROTOCOL_ERROR

## Root Cause
Two mechanisms were upgrading http://localhost to https, causing the browser to attempt TLS on a non-TLS local server:

1. Client-side HTTPS enforcement in SecurityInitializer (http->https redirect in production)
2. CSP directives in next.config.js included `upgrade-insecure-requests` and `block-all-mixed-content`, causing automatic protocol upgrades

On localhost, there is no certificate, so requests fail with ERR_SSL_PROTOCOL_ERROR.

## Fix
- Updated SecurityInitializer to skip http->https redirects on localhost/127.0.0.1/::1 even when NODE_ENV=production
- Updated next.config.js header generation to only add `upgrade-insecure-requests` and `block-all-mixed-content` when in production and NOT running on localhost (based on NEXT_PUBLIC_APP_URL)

## Validation steps
1. Built the app (npm run build)
2. Ran production server (node .next/standalone/server.js) — observed chunk load issues unrelated to SSL
3. Ran dev server (npm run dev) — verified the app loads at http://localhost:3000 without SSL errors
4. Playwright automation reproduced the original SSL error prior to the fix and confirmed page load after fix in dev server mode

## Notes
- For local development, prefer `npm run dev` which serves correctly without SSL.
- If running the production build locally, start with `node .next/standalone/server.js` (Next.js advises against `next start` for standalone). Ensure static assets are accessible at `/.next/static`.
- Production deployments still enforce HTTPS and strict CSP on non-localhost domains as intended.


# PostHog Configuration: Runtime Injection and Deployment Integration

## Summary
Production showed a console warning: "PostHog API key not configured". GCP Secret Manager already contains `posthog-host` and `posthog-project-key`, but the client bundle read `process.env.NEXT_PUBLIC_POSTHOG_KEY` at build-time, which can be undefined depending on build pipeline.

## Root Cause
- `posthog-client.ts` accessed `process.env.NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` directly. In Next.js, `NEXT_PUBLIC_*` is statically inlined at build time, so if the variable isn't present during `npm run build`, the client bundle won’t have it.
- We deploy with Cloud Run runtime secrets via `--set-secrets`. Without runtime injection into the client, the key may be missing at runtime.

## Fix
1. Runtime public config injection
   - Extended `PublicRuntimeConfig` to inject `POSTHOG_KEY` and `POSTHOG_HOST` into `window.__PUBLIC_CONFIG__` using server-side `process.env`, which is correctly sourced from Cloud Run env/secrets at request time.
2. PostHog client update
   - `posthog-client.ts` now prefers `window.__PUBLIC_CONFIG__` for `POSTHOG_KEY`/`POSTHOG_HOST`, falling back to `process.env` for local dev.
3. CSP update
   - Added `https://app.posthog.com` to `connect-src` in `next.config.js` to allow analytics network calls.
4. Deployment script
   - Confirmed `scripts/deploy-gcp.sh` passes PostHog secrets via `--set-secrets` under names `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`. No changes needed there.

## Validation
- Local: with dev-with-secrets.sh, `.env.local` picks up `posthog-project-key`/`posthog-host`, and the runtime injection makes keys available to client.
- Production: after deploy, client initializes PostHog (no missing-key warning), and network calls to app.posthog.com succeed per CSP.

## Future Improvements
- Add a CI Playwright smoke test asserting PostHog initialization logs are clean if keys are present (without actually emitting PII or sending events before consent).


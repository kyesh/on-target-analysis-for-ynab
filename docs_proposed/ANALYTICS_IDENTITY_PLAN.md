# PostHog Identity & Metadata Plan (YNAB OAuth)

Status: Proposal
Owner: Analytics
Last Updated: 2025-08-31

## 1) Current State (as implemented)
- PostHog is initialized via src/lib/analytics/posthog-client.ts with privacy defaults (opt-out by default, respect DNT, masked session recording). Good.
- Identify is called in useAuthAnalytics on auth with a non-stable ID:
  - analytics.identify(`user_${Date.now()}`, ...)
  - This is ephemeral and prevents stitching user sessions across visits.
- No YNAB user metadata is added. Budgets events include raw budget_id and budget_name in some cases.
- YNAB API via OAuth implicit grant exposes:
  - /user => { data: { user: { id } } } (no email or profile fields)
  - /budgets => budgets { id, name, currency_format, etc. }

Constraints:
- We do not have an email/name from YNAB API. Only a stable user id (UUID).
- We must respect analytics consent. PostHog calls should be gated on consent.
- Budget names may be considered sensitive user content; we should hash/anonymize before sending.

## 2) Desired End State
- Stable, privacy-safe PostHog identity per YNAB account to link sessions across visits.
- Minimal useful user properties to aid support (e.g., budget_count, currencies), without sending raw PII.
- Clear documentation and a simple way to locate a user for deletion requests (using the same stable identifier used in PostHog).

## 3) Proposed Metadata & Identity

Identity (distinct_id)
- distinct_id = sha256("ynab:" + ynab_user_id + ":v1" + OPTIONAL_SALT)
  - Uses Web Crypto SHA-256 in browser; salt can be a static public string to avoid rainbow attacks.
  - Stable across sessions/devices for the same YNAB account.
  - Avoids sending raw YNAB IDs to PostHog.

User properties (people.set)
- ynab_user_hash: same value as distinct_id
- ynab_user_id_last4: last 4 characters of YNAB UUID (non-unique but helps support), optional
- budget_count: number
- budget_ids: array of budget ids (UUIDs) [OK per API; lower sensitivity]
- budget_names_hash: array of sha256(name) values (no raw names)
- currencies: unique list of currency iso_codes used across budgets
- default_budget_id: if app determines one (e.g., most recently modified)

Event enrichment
- On budgets_loaded: include budget_count and currencies
- On budget_selected: include budget_id and budget_name_hash (not raw name)

Not collected (by design)
- Email, real name – not available via YNAB API and should not be inferred.
- Raw budget names – treated as sensitive; only hashed values are sent.

## 4) Implementation Plan

A. API route to fetch YNAB user id
- Add GET /api/user that proxies YNAB /user and returns { success, data: { userId } }.
- Reuse existing YNABOAuthClient.getUser().

B. Client: compute identity and identify
- On authenticated load (and after consent granted), fetch /api/user once, compute distinct_id, call analytics.identify(distinct_id, { ynab_user_hash, ...}).
- Store distinct_id in memory to avoid duplicate calls.

C. Client: add budget-derived properties
- After successful /api/budgets, compute:
  - budget_count, budget_ids, budget_names_hash, currencies
- Call analytics.setUserProperties(props) behind consent.
- Update budget events to include hashed budget name.

D. Privacy and consent
- Ensure all identify/people.set calls are gated on analytics consent (already enforced in analytics client).
- Continue masking inputs/session recording as configured.

E. Deletion request support
- Display current PostHog distinct_id in a small “Privacy” helper UI (not required now) or expose via console for the user.
- Document deletion process: use distinct_id to find person in PostHog and delete.

## 5) Test Plan
- Unit: hash utility returns stable SHA-256 hex; includes salt and prefixing.
- Unit: identity hook triggers identify only after consent and only once per session.
- Unit: budgets loader computes correct properties with sample data and calls people.set.
- E2E (Playwright):
  1) Sign in (dev OAuth), grant analytics consent.
  2) Verify a call to /api/user and subsequent posthog.identify with stable id.
  3) Load budgets and verify people.set properties (budget_count, currencies). Screenshots and console logs captured.

## 6) Minimal Code Changes (summary)
- New: src/app/api/user/route.ts – returns safe user id.
- New: src/lib/crypto/hash.ts – sha256 helper using Web Crypto.
- Update: src/lib/analytics/integration-hooks.ts – replace ephemeral identify with hashed YNAB id after consent.
- Update: src/components/BudgetSelector.tsx – after budgets fetched, call analytics.setUserProperties with derived props (hashed names; raw ids OK).
- Optional: src/lib/api/client.ts – add '/api/user' to allowed prefixes in validateEndpoint.

## 7) Rollout & Ops
- No new environment variables required (optional static salt can be in code or public runtime config).
- Backwards compatible; if /api/user fails, fallback to anonymous distinct_id and skip identify.
- Documented in docs/.

## 8) Open Questions
- Do we want to store/display the user’s current distinct_id in the UI for support?
- Confirm acceptability of sending raw budget IDs (UUIDs) vs also hashing them.


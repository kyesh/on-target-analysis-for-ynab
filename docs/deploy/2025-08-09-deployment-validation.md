# Deployment Validation - 2025-08-09

## Summary
- Pushed latest changes to main
- Deployed to GCP Cloud Run using scripts/deploy-gcp.sh
- Added deploy script fallback to Google Cloud Build when local Docker daemon is unavailable
- Ensured production secrets exist in Secret Manager via scripts/setup-production-secrets.sh
- Deployment succeeded; health checks passed for both Cloud Run service URL and custom domain

## Details
- Cloud Run Service URL: https://on-target-analysis-for-ynab-bmedyh2qpq-uc.a.run.app
- Custom Domain: https://www.ontargetanalysisforynab.com
- Health endpoint results: status=healthy, oauth_config=true, ynab_connectivity=true
- OAuth redirect URI validation: true (from /api/health)

## What we learned
- Local Docker downtime would block deploys; fallback to Cloud Build restores a reliable deploy path
- Secret Manager had all required secrets after running setup script

## Next steps
1) Add Playwright production E2E to verify the OAuth authorize URL contains redirect_uri=https://www.ontargetanalysisforynab.com/auth/callback and that the flow returns to /auth/callback
2) Optionally pin Cloud Build machine type via env to reduce cost/time if desired
3) Document the fallback path in docs/DEPLOYMENT_GUIDE.md (Cloud Build vs local Docker)


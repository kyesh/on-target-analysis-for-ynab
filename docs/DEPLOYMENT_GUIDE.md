# Google Cloud Platform Deployment Guide

This guide walks you through deploying the On Target Analysis for YNAB application to Google Cloud Platform using Cloud Run. This application is currently deployed and operational at https://www.ontargetanalysisforynab.com/

## 🎯 **Production Deployment Status**

**Current Status**: ✅ **PRODUCTION DEPLOYED AND OPERATIONAL**

- **Production URL**: https://www.ontargetanalysisforynab.com/
- **Platform**: Google Cloud Run
- **Authentication**: OAuth 2.0 Implicit Grant Flow
- **Analytics**: PostHog-JS 1.252.1 with GDPR/CCPA compliance and session recordings
- **Security**: Enterprise-grade security hardening
- **Custom Domain**: Configured with SSL/TLS certificates
- **Health Monitoring**: Operational with comprehensive checks

## Prerequisites

### Required Tools

- [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine
- [Node.js 18+](https://nodejs.org/) and npm
- A Google Cloud Platform account with billing enabled

### Required Accounts and Setup

- **YNAB Developer Account**: Register at [YNAB Developer Settings](https://app.ynab.com/settings/developer)
- **Google Cloud Project**: Create a new project or use an existing one
- **PostHog Account** (Optional): Sign up at [PostHog](https://posthog.com) for analytics

## Step 1: YNAB OAuth Application Setup

1. **Register OAuth Application**:

   - Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
   - Click "New Application"
   - Fill in application details:
     - **Application Name**: On Target Analysis for YNAB
     - **Description**: Budget target analysis and variance tracking
     - **Redirect URI**: `https://your-domain.com/auth/callback` (update with your actual domain)
   - Click "Save"
   - **Copy the Client ID** - you'll need this for deployment

2. **Important Notes**:
   - The Client ID is safe to expose (public OAuth client)
   - No Client Secret is needed for Implicit Grant Flow
   - You can update the Redirect URI later if needed

## Step 2: Google Cloud Platform Setup

### 2.1 Project Setup

```bash
# Set your project ID
export GCP_PROJECT_ID=your-project-id

# Authenticate with Google Cloud
gcloud auth login

# Set the default project
gcloud config set project $GCP_PROJECT_ID

# Enable billing (required for Cloud Run)
# This must be done through the GCP Console
```

### 2.2 Enable Required APIs

```bash
# Enable necessary Google Cloud APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

## Step 3: Secret Management Setup

### 3.1 Run the Secret Setup Script

```bash
# Make sure you're in the project root directory
cd /path/to/on-target-analysis-for-ynab

# Run the secret management setup
./scripts/setup-secrets.sh
```

### 3.2 What the Script Will Ask For

The script will prompt you for the following information:

1. **YNAB OAuth Client ID**: The Client ID from Step 1
2. **NextAuth Secret**: Generate with `openssl rand -base64 32`
3. **Application URL**: Your production domain (e.g., `https://www.ontargetanalysisforynab.com`)
4. **PostHog Project Key** (Optional): From your PostHog project settings
5. **PostHog Host** (Optional): Usually `https://app.posthog.com`
6. **PostHog Personal API Key** (Optional): For analytics dashboard features

### 3.3 Manual Secret Generation

If you prefer to generate secrets manually:

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Store secrets manually
echo "your-ynab-client-id" | gcloud secrets create ynab-oauth-client-id --data-file=-
echo "your-nextauth-secret" | gcloud secrets create nextauth-secret --data-file=-
echo "https://your-domain.com" | gcloud secrets create app-url --data-file=-
```

## Step 4: Application Deployment

### 4.1 Configure Environment Variables

```bash
# Set deployment configuration
export GCP_PROJECT_ID=your-project-id
export GCP_REGION=us-central1  # or your preferred region
export GCP_SERVICE_NAME=on-target-analysis-for-ynab
export GCP_MIN_INSTANCES=0
export GCP_MAX_INSTANCES=10
```

### 4.2 Run the Deployment Script

```bash
# Deploy to Cloud Run
./scripts/deploy-gcp.sh
```

### 4.3 Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Build the application
npm ci
npm run build

# Build and push Docker image
gcloud auth configure-docker
docker build -t gcr.io/$GCP_PROJECT_ID/on-target-analysis-for-ynab .
docker push gcr.io/$GCP_PROJECT_ID/on-target-analysis-for-ynab

# Deploy to Cloud Run
gcloud run deploy on-target-analysis-for-ynab \
  --image=gcr.io/$GCP_PROJECT_ID/on-target-analysis-for-ynab \
  --platform=managed \
  --region=$GCP_REGION \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --port=3000
```

## Step 5: Post-Deployment Configuration

### 5.1 Update YNAB OAuth Redirect URI

1. Go back to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
2. Edit your OAuth application
3. Update the Redirect URI to match your deployed service URL:
   - Format: `https://your-service-url/auth/callback`
   - Example: `https://on-target-analysis-for-ynab-abc123-uc.a.run.app/auth/callback`

### 5.2 Verify Deployment

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe on-target-analysis-for-ynab --region=$GCP_REGION --format="value(status.url)")

# Test health endpoint
curl $SERVICE_URL/api/health

# Test OAuth configuration
curl $SERVICE_URL/auth/signin
```

### 5.3 Set Up Custom Domain

```bash
# Map a custom domain
gcloud run domain-mappings create \
  --service=on-target-analysis-for-ynab \
  --domain=www.ontargetanalysisforynab.com \
  --region=$GCP_REGION
```

## Step 6: Production Features Verification

### 6.1 Authentication Flow Testing

```bash
# Test complete OAuth flow
curl -I $SERVICE_URL/auth/signin
curl -I $SERVICE_URL/auth/callback
```

### 6.2 Enhanced Error Handling Testing

- Visit the application without authentication
- Verify auto-redirect functionality (5-second countdown)
- Test "Connect to YNAB" button functionality
- Confirm user-friendly error messages

### 6.3 Analytics Verification

**PostHog-JS Version Check**:
- Verify PostHog-JS 1.252.1 is loading correctly
- Check browser network tab for PostHog script version parameter (v=1.252.1)

**Event Tracking Verification**:
- Check PostHog dashboard for event tracking
- Verify consent banner functionality
- Test analytics opt-out mechanisms

**Session Recording Verification**:
- Perform substantial user interaction (5+ minutes recommended)
- Check network requests for successful POST to `/s/` endpoint (200 status)
- Verify recordings appear in PostHog Session Replay dashboard within 10 minutes
- Test recording playback functionality

## Step 7: Monitoring and Maintenance

### 7.1 View Logs

```bash
# View application logs
gcloud run logs read on-target-analysis-for-ynab --region=$GCP_REGION

# Follow logs in real-time
gcloud run logs tail on-target-analysis-for-ynab --region=$GCP_REGION
```

### 7.2 Update Deployment

```bash
# Update with new image
./scripts/deploy-gcp.sh

# Or update specific configuration
gcloud run services update on-target-analysis-for-ynab \
  --region=$GCP_REGION \
  --memory=2Gi
```

### 7.3 Manage Secrets

```bash
# List secrets
gcloud secrets list

# Update a secret
echo "new-value" | gcloud secrets versions add secret-name --data-file=-

# View secret (be careful with this in production)
gcloud secrets versions access latest --secret=secret-name
```

## Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch**:
   - Ensure YNAB OAuth Redirect URI exactly matches your deployed URL
   - Check for trailing slashes and protocol (https://)

2. **Secret Access Errors**:
   - Verify service account has `secretmanager.secretAccessor` role
   - Check secret names match exactly in Cloud Run configuration

3. **Authentication Error Handling**:
   - Verify AuthenticationError component is working
   - Check auto-redirect functionality
   - Test user-friendly error messages

4. **Health Check Failures**:
   - Check application logs for startup errors
   - Verify environment variables are set correctly
   - Ensure port 3000 is exposed and application is listening

### Debug Commands

```bash
# Check service status
gcloud run services describe on-target-analysis-for-ynab --region=$GCP_REGION

# View recent logs
gcloud run logs read on-target-analysis-for-ynab --region=$GCP_REGION --limit=50

# Test local build
docker build -t test-image .
docker run -p 3000:3000 test-image

# Validate secrets
./scripts/setup-secrets.sh test
```

## Security Considerations

### Production Security Checklist

- [x] All secrets stored in Google Cloud Secret Manager
- [x] Service account follows principle of least privilege
- [x] HTTPS enforced for all traffic
- [x] Content Security Policy headers configured
- [x] OAuth redirect URIs restricted to production domains
- [x] Enhanced authentication error handling implemented
- [x] XSS prevention and input sanitization active
- [x] Regular security updates applied

### Monitoring and Alerts

- Set up Cloud Monitoring alerts for error rates
- Monitor resource usage and scaling
- Track authentication failures and error patterns
- Monitor secret access patterns
- Track user experience metrics (error handling, redirects)

## Cost Optimization

### Current Production Costs

- **Cloud Run**: ~$5-15/month (based on actual usage)
- **Secret Manager**: ~$1-3/month
- **Networking**: ~$1-5/month
- **Total**: ~$7-23/month for production deployment

### Optimization Tips

- Use minimum instances = 0 for cost savings
- Monitor and adjust memory/CPU allocation based on usage
- Implement request caching where appropriate
- Use Cloud CDN for static assets if needed

## Support and Resources

- **Production Application**: https://www.ontargetanalysisforynab.com/
- **Google Cloud Run Documentation**: https://cloud.google.com/run/docs
- **YNAB API Documentation**: https://api.ynab.com/
- **PostHog Documentation**: https://posthog.com/docs
- **Project Repository**: https://github.com/kyesh/on-target-analysis-for-ynab

For issues specific to this deployment, check the application logs and ensure all configuration steps were completed correctly. The application includes enhanced error handling to guide users through authentication issues.

---

**This deployment guide reflects the current production-ready implementation with OAuth 2.0, enhanced authentication error handling, and comprehensive security hardening.**

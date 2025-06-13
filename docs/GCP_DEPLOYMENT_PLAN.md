# Google Cloud Platform Deployment Plan

## Overview

Comprehensive deployment strategy for the YNAB Off-Target Assignment Analysis application using Google Cloud Platform services with automated CI/CD, security, and monitoring.

## Architecture Overview

### Recommended GCP Services
- **Cloud Run**: Serverless container deployment (RECOMMENDED)
- **Secret Manager**: Secure credential storage
- **Cloud Build**: CI/CD pipeline
- **Cloud DNS**: Domain management
- **Cloud CDN**: Global content delivery
- **Cloud Monitoring**: Application monitoring
- **Cloud Logging**: Centralized logging

### Why Cloud Run Over App Engine
- **Better for Next.js**: Native container support
- **Cost-effective**: Pay per request, scales to zero
- **Flexibility**: Full control over runtime environment
- **Modern deployment**: Container-based deployment

## Phase 1: GCP Project Setup

### 1.1 Project Initialization
```bash
# Create new GCP project
gcloud projects create ynab-analysis-prod --name="YNAB Analysis Production"

# Set project as default
gcloud config set project ynab-analysis-prod

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  dns.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com
```

### 1.2 IAM and Service Accounts
```bash
# Create service account for Cloud Run
gcloud iam service-accounts create ynab-analysis-runner \
  --display-name="YNAB Analysis Cloud Run Service Account"

# Create service account for Cloud Build
gcloud iam service-accounts create ynab-analysis-builder \
  --display-name="YNAB Analysis Cloud Build Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding ynab-analysis-prod \
  --member="serviceAccount:ynab-analysis-runner@ynab-analysis-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding ynab-analysis-prod \
  --member="serviceAccount:ynab-analysis-builder@ynab-analysis-prod.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"
```

## Phase 2: Secret Management

### 2.1 Create Secrets in Secret Manager
```bash
# YNAB OAuth secrets
gcloud secrets create ynab-client-id --data-file=- <<< "your-ynab-client-id"
gcloud secrets create ynab-client-secret --data-file=- <<< "your-ynab-client-secret"

# NextAuth secrets
gcloud secrets create nextauth-secret --data-file=- <<< "$(openssl rand -base64 32)"
gcloud secrets create nextauth-url --data-file=- <<< "https://your-domain.com"

# PostHog secrets
gcloud secrets create posthog-key --data-file=- <<< "your-posthog-key"
gcloud secrets create posthog-personal-api-key --data-file=- <<< "your-posthog-personal-api-key"

# Encryption keys
gcloud secrets create session-encryption-key --data-file=- <<< "$(openssl rand -base64 32)"
gcloud secrets create token-encryption-key --data-file=- <<< "$(openssl rand -base64 32)"
```

### 2.2 Secret Access Configuration
```yaml
# cloudbuild.yaml - Secret access configuration
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/ynab-analysis:$BUILD_ID', '.']
    
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/ynab-analysis:$BUILD_ID']
    
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'ynab-analysis'
      - '--image=gcr.io/$PROJECT_ID/ynab-analysis:$BUILD_ID'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--service-account=ynab-analysis-runner@$PROJECT_ID.iam.gserviceaccount.com'
      - '--set-env-vars=NODE_ENV=production'
      - '--set-secrets=YNAB_CLIENT_ID=ynab-client-id:latest'
      - '--set-secrets=YNAB_CLIENT_SECRET=ynab-client-secret:latest'
      - '--set-secrets=NEXTAUTH_SECRET=nextauth-secret:latest'
      - '--set-secrets=NEXTAUTH_URL=nextauth-url:latest'
      - '--set-secrets=NEXT_PUBLIC_POSTHOG_KEY=posthog-key:latest'
      - '--set-secrets=POSTHOG_PERSONAL_API_KEY=posthog-personal-api-key:latest'
      - '--set-secrets=SESSION_ENCRYPTION_KEY=session-encryption-key:latest'
      - '--set-secrets=TOKEN_ENCRYPTION_KEY=token-encryption-key:latest'
```

## Phase 3: Containerization

### 3.1 Production Dockerfile
```dockerfile
# Dockerfile.production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 3.2 Next.js Configuration for Cloud Run
```javascript
// next.config.js (updated for production)
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Cloud Run
  output: 'standalone',
  
  // Optimize for production
  experimental: {
    optimizePackageImports: ['recharts', 'lodash', 'date-fns'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.ynab.com https://app.posthog.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
  
  // Environment variables validation
  env: {
    NODE_ENV: process.env.NODE_ENV,
  },
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  // TypeScript and ESLint configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  }
};

module.exports = nextConfig;
```

## Phase 4: CI/CD Pipeline

### 4.1 GitHub Actions Workflow
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PROJECT_ID: ynab-analysis-prod
  SERVICE_NAME: ynab-analysis
  REGION: us-central1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Google Cloud CLI
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ env.PROJECT_ID }}
      
      - name: Configure Docker to use gcloud as a credential helper
        run: gcloud auth configure-docker
      
      - name: Build and push Docker image
        run: |
          docker build -f Dockerfile.production -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA .
          docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy $SERVICE_NAME \
            --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA \
            --region $REGION \
            --platform managed \
            --allow-unauthenticated \
            --service-account ynab-analysis-runner@$PROJECT_ID.iam.gserviceaccount.com \
            --memory 1Gi \
            --cpu 1 \
            --concurrency 100 \
            --max-instances 10 \
            --set-env-vars NODE_ENV=production \
            --set-secrets YNAB_CLIENT_ID=ynab-client-id:latest \
            --set-secrets YNAB_CLIENT_SECRET=ynab-client-secret:latest \
            --set-secrets NEXTAUTH_SECRET=nextauth-secret:latest \
            --set-secrets NEXTAUTH_URL=nextauth-url:latest \
            --set-secrets NEXT_PUBLIC_POSTHOG_KEY=posthog-key:latest \
            --set-secrets POSTHOG_PERSONAL_API_KEY=posthog-personal-api-key:latest \
            --set-secrets SESSION_ENCRYPTION_KEY=session-encryption-key:latest \
            --set-secrets TOKEN_ENCRYPTION_KEY=token-encryption-key:latest
      
      - name: Update traffic to new revision
        run: |
          gcloud run services update-traffic $SERVICE_NAME \
            --region $REGION \
            --to-latest
```

### 4.2 Automated Deployment Script
```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

PROJECT_ID="ynab-analysis-prod"
SERVICE_NAME="ynab-analysis"
REGION="us-central1"
IMAGE_TAG=$(date +%Y%m%d-%H%M%S)

echo "🚀 Starting production deployment..."

# Build and tag the image
echo "📦 Building Docker image..."
docker build -f Dockerfile.production -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG .

# Push to Google Container Registry
echo "📤 Pushing image to GCR..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG

# Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --service-account ynab-analysis-runner@$PROJECT_ID.iam.gserviceaccount.com \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 100 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-secrets YNAB_CLIENT_ID=ynab-client-id:latest \
  --set-secrets YNAB_CLIENT_SECRET=ynab-client-secret:latest \
  --set-secrets NEXTAUTH_SECRET=nextauth-secret:latest \
  --set-secrets NEXTAUTH_URL=nextauth-url:latest \
  --set-secrets NEXT_PUBLIC_POSTHOG_KEY=posthog-key:latest \
  --set-secrets POSTHOG_PERSONAL_API_KEY=posthog-personal-api-key:latest \
  --set-secrets SESSION_ENCRYPTION_KEY=session-encryption-key:latest \
  --set-secrets TOKEN_ENCRYPTION_KEY=token-encryption-key:latest

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo "✅ Deployment completed successfully!"
echo "🌍 Service URL: $SERVICE_URL"
echo "📊 Monitor at: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
```

## Phase 5: Domain and SSL Configuration

### 5.1 Custom Domain Setup
```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service ynab-analysis \
  --domain your-domain.com \
  --region us-central1

# Verify domain ownership (follow GCP instructions)
# Add DNS records as instructed by GCP
```

### 5.2 DNS Configuration
```bash
# Create DNS zone
gcloud dns managed-zones create ynab-analysis-zone \
  --description="YNAB Analysis DNS Zone" \
  --dns-name=your-domain.com

# Add A record pointing to Cloud Run
gcloud dns record-sets transaction start --zone=ynab-analysis-zone
gcloud dns record-sets transaction add \
  --name=your-domain.com \
  --ttl=300 \
  --type=A \
  --zone=ynab-analysis-zone \
  "CLOUD_RUN_IP_ADDRESS"
gcloud dns record-sets transaction execute --zone=ynab-analysis-zone
```

## Phase 6: Monitoring and Logging

### 6.1 Cloud Monitoring Setup
```yaml
# monitoring/alerts.yaml
displayName: "YNAB Analysis Monitoring"
conditions:
  - displayName: "High Error Rate"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" resource.label.service_name="ynab-analysis"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 0.05
      duration: 300s
  
  - displayName: "High Response Time"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" resource.label.service_name="ynab-analysis"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 5000
      duration: 300s

notificationChannels:
  - projects/ynab-analysis-prod/notificationChannels/EMAIL_CHANNEL_ID
```

### 6.2 Application Logging
```typescript
// src/lib/logging/cloud-logger.ts
import { Logging } from '@google-cloud/logging'

const logging = new Logging()
const log = logging.log('ynab-analysis')

export const logger = {
  info: (message: string, metadata?: any) => {
    const entry = log.entry({
      severity: 'INFO',
      timestamp: new Date(),
    }, { message, ...metadata })
    log.write(entry)
  },
  
  error: (message: string, error?: Error, metadata?: any) => {
    const entry = log.entry({
      severity: 'ERROR',
      timestamp: new Date(),
    }, { 
      message, 
      error: error?.stack,
      ...metadata 
    })
    log.write(entry)
  },
  
  warn: (message: string, metadata?: any) => {
    const entry = log.entry({
      severity: 'WARNING',
      timestamp: new Date(),
    }, { message, ...metadata })
    log.write(entry)
  }
}
```

## Implementation Timeline

### Week 1: Infrastructure Setup
- Create GCP project and enable services
- Set up IAM and service accounts
- Configure Secret Manager

### Week 2: Containerization and CI/CD
- Create production Dockerfile
- Set up GitHub Actions workflow
- Test deployment pipeline

### Week 3: Domain and Security
- Configure custom domain and SSL
- Set up monitoring and alerting
- Security audit and testing

### Week 4: Production Deployment
- Deploy to production environment
- Monitor performance and stability
- Optimize based on real-world usage

## Cost Optimization

### Expected Monthly Costs (estimated)
- **Cloud Run**: $20-50 (based on usage)
- **Secret Manager**: $1-5
- **Cloud Build**: $10-20
- **Cloud DNS**: $0.50
- **Monitoring/Logging**: $5-15
- **Total**: ~$40-90/month

### Cost Optimization Strategies
- Use Cloud Run's pay-per-request model
- Implement efficient caching
- Optimize container image size
- Monitor and adjust resource limits

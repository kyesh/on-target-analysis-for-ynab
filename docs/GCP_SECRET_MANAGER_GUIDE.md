# GCP Secret Manager Setup Guide for On Target Analysis for YNAB

## Overview

This comprehensive guide provides step-by-step instructions for setting up all required credentials in Google Cloud Platform (GCP) Secret Manager for the On Target Analysis for YNAB application.

## Prerequisites

- Google Cloud Platform account with billing enabled
- GCP Project created for the application
- `gcloud` CLI installed and authenticated
- Required IAM permissions (see [IAM Roles](#iam-roles) section)

## Required Secrets

The application requires the following secrets to be stored in GCP Secret Manager:

### 1. YNAB OAuth Configuration

- **Secret Name**: `ynab-oauth-client-id`
- **Description**: YNAB OAuth 2.0 Client ID for authentication
- **Required**: Yes

### 2. NextAuth Configuration

- **Secret Name**: `nextauth-secret`
- **Description**: JWT signing secret for NextAuth.js
- **Required**: Yes

### 3. PostHog Analytics (Optional)

- **Secret Name**: `posthog-project-key`
- **Description**: PostHog project API key for analytics
- **Required**: No

- **Secret Name**: `posthog-personal-api-key`
- **Description**: PostHog personal API key for dashboard features
- **Required**: No

## Step-by-Step Setup

### Step 1: Enable Secret Manager API

```bash
# Enable the Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Verify the API is enabled
gcloud services list --enabled --filter="name:secretmanager.googleapis.com"
```

### Step 2: Set Up YNAB OAuth Application

1. **Register OAuth Application with YNAB**:

   - Visit [YNAB Developer Settings](https://app.ynab.com/settings/developer)
   - Click "New Application"
   - Fill in application details:
     - **Application Name**: `On Target Analysis for YNAB`
     - **Description**: `Budget target alignment analysis tool`
     - **Website**: `https://ontargetanalysisforynab.com`
   - Set **Redirect URI**: `https://ontargetanalysisforynab.com/auth/callback`
   - Click "Create Application"
   - Copy the **Client ID** (you'll need this for the next step)

2. **Store YNAB Client ID in Secret Manager**:
   ```bash
   # Replace YOUR_YNAB_CLIENT_ID with the actual client ID from YNAB
   echo -n "YOUR_YNAB_CLIENT_ID" | gcloud secrets create ynab-oauth-client-id \
     --data-file=- \
     --replication-policy="automatic"
   ```

### Step 3: Generate and Store NextAuth Secret

1. **Generate a secure random secret**:

   ```bash
   # Generate a 32-byte base64 encoded secret
   openssl rand -base64 32
   ```

2. **Store the secret in Secret Manager**:
   ```bash
   # Replace YOUR_GENERATED_SECRET with the output from the previous command
   echo -n "YOUR_GENERATED_SECRET" | gcloud secrets create nextauth-secret \
     --data-file=- \
     --replication-policy="automatic"
   ```

### Step 4: Set Up PostHog Analytics (Optional)

1. **Create PostHog Account**:

   - Visit [PostHog](https://posthog.com) and create an account
   - Create a new project for your application
   - Navigate to Project Settings → API Keys
   - Copy the **Project API Key**

2. **Store PostHog Project Key**:

   ```bash
   # Replace YOUR_POSTHOG_PROJECT_KEY with the actual key
   echo -n "YOUR_POSTHOG_PROJECT_KEY" | gcloud secrets create posthog-project-key \
     --data-file=- \
     --replication-policy="automatic"
   ```

3. **Generate Personal API Key** (for dashboard features):

   - In PostHog, go to Personal Settings → Personal API Keys
   - Click "Create Personal API Key"
   - Give it a descriptive name: `On Target Analysis Dashboard`
   - Copy the generated key

4. **Store PostHog Personal API Key**:
   ```bash
   # Replace YOUR_POSTHOG_PERSONAL_KEY with the actual key
   echo -n "YOUR_POSTHOG_PERSONAL_KEY" | gcloud secrets create posthog-personal-api-key \
     --data-file=- \
     --replication-policy="automatic"
   ```

## IAM Roles and Permissions

### Required IAM Roles

The Cloud Run service account needs the following IAM role:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $GCP_PROJECT_ID --format="value(projectNumber)")

# Grant Secret Manager Secret Accessor role to the default compute service account
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Custom Service Account (Recommended)

For better security, create a dedicated service account:

```bash
# Create a dedicated service account
gcloud iam service-accounts create ontarget-analysis-sa \
  --display-name="On Target Analysis Service Account" \
  --description="Service account for On Target Analysis for YNAB application"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:ontarget-analysis-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Accessing Secrets in the Application

### Environment Variable Configuration

The application automatically retrieves secrets from Secret Manager when deployed to Cloud Run. The deployment script handles this configuration.

### Secret Naming Convention

| Application Variable         | Secret Manager Name        | Description              |
| ---------------------------- | -------------------------- | ------------------------ |
| `NEXT_PUBLIC_YNAB_CLIENT_ID` | `ynab-oauth-client-id`     | YNAB OAuth Client ID     |
| `NEXTAUTH_SECRET`            | `nextauth-secret`          | NextAuth JWT secret      |
| `NEXT_PUBLIC_POSTHOG_KEY`    | `posthog-project-key`      | PostHog project key      |
| `POSTHOG_PERSONAL_API_KEY`   | `posthog-personal-api-key` | PostHog personal API key |

## Verification and Testing

### Verify Secrets Are Created

```bash
# List all secrets
gcloud secrets list

# Verify specific secrets exist
gcloud secrets describe ynab-oauth-client-id
gcloud secrets describe nextauth-secret
gcloud secrets describe posthog-project-key  # if created
gcloud secrets describe posthog-personal-api-key  # if created
```

### Test Secret Access

```bash
# Test accessing a secret (this should return the secret value)
gcloud secrets versions access latest --secret="ynab-oauth-client-id"
```

## Security Best Practices

### 1. Principle of Least Privilege

- Only grant `secretmanager.secretAccessor` role, not broader permissions
- Use dedicated service accounts for each application

### 2. Secret Rotation

- Regularly rotate secrets, especially the NextAuth secret
- Update YNAB OAuth application if client ID changes

### 3. Audit and Monitoring

- Enable audit logging for Secret Manager access
- Monitor secret access patterns for anomalies

### 4. Environment-Specific Secrets

- Use different secrets for development, staging, and production
- Never share production secrets across environments

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**:

   - Verify the service account has `secretmanager.secretAccessor` role
   - Check that the secret exists and is in the correct project

2. **Secret Not Found**:

   - Verify secret names match exactly (case-sensitive)
   - Ensure secrets are created in the correct GCP project

3. **Invalid Secret Values**:
   - Check for extra whitespace or newlines in secret values
   - Use `echo -n` when creating secrets to avoid trailing newlines

### Debugging Commands

```bash
# Check service account permissions
gcloud projects get-iam-policy $GCP_PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:ontarget-analysis-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com"

# View secret metadata
gcloud secrets describe ynab-oauth-client-id

# Check secret versions
gcloud secrets versions list ynab-oauth-client-id
```

## Updating Secrets

### Update Existing Secret

```bash
# Add a new version to an existing secret
echo -n "NEW_SECRET_VALUE" | gcloud secrets versions add ynab-oauth-client-id \
  --data-file=-
```

### Delete Secret (if needed)

```bash
# Delete a secret (use with caution)
gcloud secrets delete ynab-oauth-client-id
```

## Cost Considerations

- Secret Manager pricing: $0.06 per 10,000 secret versions per month
- Secret access pricing: $0.03 per 10,000 access operations
- For this application, costs should be minimal (< $1/month)

## Next Steps

After setting up secrets:

1. **Deploy the application** using the deployment script
2. **Verify OAuth flow** works with your YNAB account
3. **Test analytics** if PostHog is configured
4. **Monitor secret access** in GCP Console

---

**Security Note**: Never commit secrets to version control. Always use Secret Manager for production deployments.

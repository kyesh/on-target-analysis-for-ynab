#!/bin/bash

# Production Secret Setup Script for On Target Analysis for YNAB
# Sets up specific production secrets in Google Cloud Secret Manager

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-on-target-analysis-for-ynab}"
SERVICE_ACCOUNT_NAME="${GCP_SERVICE_ACCOUNT:-ontarget-analysis-sa}"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Production secrets
POSTHOG_PROJECT_KEY="phc_sqK1lcYYbSn3opv38Trb3c6kYC3h4qy1majIhMlpX28"
POSTHOG_HOST="https://us.i.posthog.com"
YNAB_OAUTH_CLIENT_ID="qw-djT85-gw4pJuT4rrpxNzgss9dHuOGajQYoijEbUc"
YNAB_OAUTH_CLIENT_SECRET="pk_K7ZOFx5MTbNJMcyeFvijXPRQ6CVfrwvtcJPzgBMw"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to validate prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        print_error "Not authenticated with gcloud. Please run: gcloud auth login"
        exit 1
    fi
    
    # Set the project
    gcloud config set project "$PROJECT_ID"
    
    print_success "Prerequisites check passed"
    print_status "Using project: $PROJECT_ID"
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable secretmanager.googleapis.com
    gcloud services enable iam.googleapis.com
    gcloud services enable run.googleapis.com
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    
    print_success "Required APIs enabled"
}

# Function to create service account
create_service_account() {
    print_status "Creating service account..."
    
    # Check if service account already exists
    if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" &> /dev/null; then
        print_warning "Service account $SERVICE_ACCOUNT_EMAIL already exists"
    else
        gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
            --display-name="On Target Analysis Service Account" \
            --description="Service account for On Target Analysis for YNAB application"
        
        print_success "Service account created: $SERVICE_ACCOUNT_EMAIL"
    fi
    
    # Grant necessary permissions
    print_status "Granting permissions to service account..."
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/secretmanager.secretAccessor"
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/run.invoker"
    
    print_success "Service account permissions configured"
}

# Function to create or update a secret
create_or_update_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"
    
    # Check if secret exists
    if gcloud secrets describe "$secret_name" &> /dev/null; then
        print_status "Updating existing secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
    else
        print_status "Creating new secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --data-file=- \
            --labels="app=on-target-analysis,environment=production" \
            --replication-policy="automatic"
    fi
    
    # Grant access to service account
    gcloud secrets add-iam-policy-binding "$secret_name" \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/secretmanager.secretAccessor"
    
    print_success "Secret $secret_name configured successfully"
}

# Function to store production secrets
store_production_secrets() {
    print_status "Storing production secrets in Google Cloud Secret Manager..."
    
    # Store PostHog configuration
    create_or_update_secret "posthog-project-key" "$POSTHOG_PROJECT_KEY" "PostHog project API key"
    create_or_update_secret "posthog-host" "$POSTHOG_HOST" "PostHog host URL"
    
    # Store YNAB OAuth configuration
    create_or_update_secret "ynab-oauth-client-id" "$YNAB_OAUTH_CLIENT_ID" "YNAB OAuth Client ID"
    create_or_update_secret "ynab-oauth-client-secret" "$YNAB_OAUTH_CLIENT_SECRET" "YNAB OAuth Client Secret"
    
    # Generate and store NextAuth secret
    print_status "Generating NextAuth secret..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    create_or_update_secret "nextauth-secret" "$NEXTAUTH_SECRET" "NextAuth JWT signing secret"
    
    # Store application URL
    APP_URL="https://ontargetanalysisforynab.com"
    create_or_update_secret "app-url" "$APP_URL" "Application URL for OAuth redirects"
    
    print_success "All production secrets stored successfully"
}

# Function to test connectivity
test_connectivity() {
    print_status "Testing connectivity..."
    
    # Test YNAB API
    if curl -s --head "https://api.ynab.com/v1/budgets" | head -n 1 | grep -q "401"; then
        print_success "YNAB API is reachable"
    else
        print_warning "Unable to reach YNAB API. Please check your internet connection."
    fi
    
    # Test PostHog
    if curl -s --head "$POSTHOG_HOST" | head -n 1 | grep -q "200\|301\|302"; then
        print_success "PostHog is reachable"
    else
        print_warning "Unable to reach PostHog. Please verify the host URL."
    fi
    
    print_success "Connectivity tests completed"
}

# Function to display summary
display_summary() {
    print_success "Production Secret Setup Complete!"
    echo ""
    echo "==================== SUMMARY ===================="
    echo "Project ID: $PROJECT_ID"
    echo "Service Account: $SERVICE_ACCOUNT_EMAIL"
    echo "Application URL: https://ontargetanalysisforynab.com"
    echo ""
    echo "Secrets created:"
    echo "  • posthog-project-key"
    echo "  • posthog-host"
    echo "  • ynab-oauth-client-id"
    echo "  • ynab-oauth-client-secret"
    echo "  • nextauth-secret"
    echo "  • app-url"
    echo ""
    print_status "Next steps:"
    echo "1. Run the deployment script: ./scripts/deploy-gcp.sh"
    echo "2. Test your application at: https://ontargetanalysisforynab.com"
    echo "3. Verify OAuth flow with YNAB"
    echo "4. Check PostHog analytics integration"
    echo ""
    print_status "Useful commands:"
    echo "List secrets: gcloud secrets list"
    echo "View secret: gcloud secrets versions access latest --secret=SECRET_NAME"
    echo "Update secret: echo 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=-"
}

# Main function
main() {
    print_status "Starting production secret setup for On Target Analysis for YNAB..."
    print_status "Project: $PROJECT_ID"
    echo ""
    
    check_prerequisites
    enable_apis
    create_service_account
    store_production_secrets
    test_connectivity
    display_summary
    
    print_success "Production secret setup completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  help     Show this help message"
        echo "  setup    Set up production secrets (default)"
        echo "  list     List existing secrets"
        echo ""
        echo "Environment variables:"
        echo "  GCP_PROJECT_ID           Google Cloud Project ID (default: on-target-analysis-for-ynab)"
        echo "  GCP_SERVICE_ACCOUNT      Service account name (default: ontarget-analysis-sa)"
        ;;
    "list")
        check_prerequisites
        print_status "Listing existing secrets..."
        gcloud secrets list --filter="labels.app=on-target-analysis"
        ;;
    "setup"|"")
        main
        ;;
    *)
        print_error "Unknown command: $1"
        print_status "Use '$0 help' for usage information"
        exit 1
        ;;
esac

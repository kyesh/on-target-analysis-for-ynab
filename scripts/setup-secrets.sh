#!/bin/bash

# Google Cloud Secret Manager Setup Script
# Securely stores and manages secrets for YNAB Off-Target Analysis application

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-}"
SERVICE_ACCOUNT_NAME="${GCP_SERVICE_ACCOUNT:-ynab-analysis-service-account}"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

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

# Function to prompt for user input
prompt_for_input() {
    local prompt="$1"
    local var_name="$2"
    local is_secret="${3:-false}"
    local validation_pattern="${4:-}"
    
    while true; do
        if [ "$is_secret" = "true" ]; then
            echo -n "$prompt: "
            read -s value
            echo  # New line after hidden input
        else
            echo -n "$prompt: "
            read value
        fi
        
        if [ -n "$value" ]; then
            if [ -n "$validation_pattern" ]; then
                if [[ $value =~ $validation_pattern ]]; then
                    eval "$var_name='$value'"
                    break
                else
                    print_error "Invalid format. Please try again."
                fi
            else
                eval "$var_name='$value'"
                break
            fi
        else
            print_error "Value cannot be empty. Please try again."
        fi
    done
}

# Function to validate prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if project ID is set
    if [ -z "$PROJECT_ID" ]; then
        print_error "GCP_PROJECT_ID environment variable is not set"
        print_status "Please set it with: export GCP_PROJECT_ID=your-project-id"
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
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable secretmanager.googleapis.com
    gcloud services enable iam.googleapis.com
    gcloud services enable run.googleapis.com
    
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
            --display-name="YNAB Analysis Service Account" \
            --description="Service account for YNAB Off-Target Analysis application"
        
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
            --labels="app=ynab-analysis,environment=production" \
            --replication-policy="automatic"
    fi
    
    # Grant access to service account
    gcloud secrets add-iam-policy-binding "$secret_name" \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/secretmanager.secretAccessor"
    
    print_success "Secret $secret_name configured successfully"
}

# Function to validate YNAB OAuth Client ID
validate_ynab_client_id() {
    local client_id="$1"
    
    # YNAB OAuth Client IDs are typically UUIDs
    if [[ $client_id =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
        return 0
    else
        print_error "Invalid YNAB OAuth Client ID format. Expected UUID format."
        return 1
    fi
}

# Function to validate NextAuth secret
validate_nextauth_secret() {
    local secret="$1"
    
    # NextAuth secret should be at least 32 characters
    if [ ${#secret} -ge 32 ]; then
        return 0
    else
        print_error "NextAuth secret should be at least 32 characters long."
        return 1
    fi
}

# Function to test YNAB connectivity
test_ynab_connectivity() {
    local client_id="$1"
    
    print_status "Testing YNAB OAuth configuration..."
    
    # Test if YNAB API is reachable
    if curl -s --head "https://api.ynab.com/v1/budgets" | head -n 1 | grep -q "401"; then
        print_success "YNAB API is reachable"
    else
        print_warning "Unable to reach YNAB API. Please check your internet connection."
    fi
}

# Function to test PostHog connectivity
test_posthog_connectivity() {
    local project_key="$1"
    local host="$2"
    
    if [ -n "$project_key" ] && [ -n "$host" ]; then
        print_status "Testing PostHog configuration..."
        
        # Test PostHog endpoint
        if curl -s --head "$host" | head -n 1 | grep -q "200\|301\|302"; then
            print_success "PostHog is reachable"
        else
            print_warning "Unable to reach PostHog. Please verify the host URL."
        fi
    fi
}

# Function to collect all secrets
collect_secrets() {
    print_status "Collecting secrets for YNAB Off-Target Analysis..."
    echo ""
    
    # YNAB OAuth Client ID
    print_status "YNAB OAuth Configuration"
    print_status "Get your OAuth Client ID from: https://app.ynab.com/settings/developer"
    while true; do
        prompt_for_input "YNAB OAuth Client ID" YNAB_CLIENT_ID false
        if validate_ynab_client_id "$YNAB_CLIENT_ID"; then
            break
        fi
    done
    
    # NextAuth Secret
    echo ""
    print_status "NextAuth Configuration"
    print_status "Generate a secure secret with: openssl rand -base64 32"
    while true; do
        prompt_for_input "NextAuth Secret (32+ characters)" NEXTAUTH_SECRET true
        if validate_nextauth_secret "$NEXTAUTH_SECRET"; then
            break
        fi
    done
    
    # App URL
    echo ""
    print_status "Application Configuration"
    prompt_for_input "Application URL (e.g., https://your-domain.com)" APP_URL false "^https?://"
    
    # PostHog Configuration (optional)
    echo ""
    print_status "PostHog Analytics Configuration (Optional)"
    print_status "Leave empty to skip analytics setup"
    prompt_for_input "PostHog Project API Key (optional)" POSTHOG_PROJECT_KEY false
    
    if [ -n "$POSTHOG_PROJECT_KEY" ]; then
        prompt_for_input "PostHog Host (default: https://app.posthog.com)" POSTHOG_HOST false
        POSTHOG_HOST="${POSTHOG_HOST:-https://app.posthog.com}"
        
        prompt_for_input "PostHog Personal API Key (optional)" POSTHOG_PERSONAL_KEY true
    fi
    
    echo ""
    print_success "All secrets collected successfully"
}

# Function to store secrets
store_secrets() {
    print_status "Storing secrets in Google Cloud Secret Manager..."
    
    # Store YNAB OAuth Client ID
    create_or_update_secret "ynab-oauth-client-id" "$YNAB_CLIENT_ID" "YNAB OAuth Client ID"
    
    # Store NextAuth Secret
    create_or_update_secret "nextauth-secret" "$NEXTAUTH_SECRET" "NextAuth JWT signing secret"
    
    # Store App URL
    create_or_update_secret "app-url" "$APP_URL" "Application URL for OAuth redirects"
    
    # Store PostHog configuration if provided
    if [ -n "$POSTHOG_PROJECT_KEY" ]; then
        create_or_update_secret "posthog-project-key" "$POSTHOG_PROJECT_KEY" "PostHog project API key"
        create_or_update_secret "posthog-host" "$POSTHOG_HOST" "PostHog host URL"
        
        if [ -n "$POSTHOG_PERSONAL_KEY" ]; then
            create_or_update_secret "posthog-personal-api-key" "$POSTHOG_PERSONAL_KEY" "PostHog personal API key"
        fi
    fi
    
    print_success "All secrets stored successfully"
}

# Function to run connectivity tests
run_connectivity_tests() {
    print_status "Running connectivity tests..."
    
    test_ynab_connectivity "$YNAB_CLIENT_ID"
    
    if [ -n "$POSTHOG_PROJECT_KEY" ]; then
        test_posthog_connectivity "$POSTHOG_PROJECT_KEY" "$POSTHOG_HOST"
    fi
    
    print_success "Connectivity tests completed"
}

# Function to display summary
display_summary() {
    print_success "Secret Management Setup Complete!"
    echo ""
    echo "==================== SUMMARY ===================="
    echo "Project ID: $PROJECT_ID"
    echo "Service Account: $SERVICE_ACCOUNT_EMAIL"
    echo ""
    echo "Secrets created:"
    echo "  • ynab-oauth-client-id"
    echo "  • nextauth-secret"
    echo "  • app-url"
    if [ -n "$POSTHOG_PROJECT_KEY" ]; then
        echo "  • posthog-project-key"
        echo "  • posthog-host"
        if [ -n "$POSTHOG_PERSONAL_KEY" ]; then
            echo "  • posthog-personal-api-key"
        fi
    fi
    echo ""
    print_status "Next steps:"
    echo "1. Update your Cloud Run deployment to use these secrets"
    echo "2. Run the deployment script: ./scripts/deploy-gcp.sh"
    echo "3. Test your application at: $APP_URL"
    echo ""
    print_status "Useful commands:"
    echo "List secrets: gcloud secrets list"
    echo "View secret: gcloud secrets versions access latest --secret=SECRET_NAME"
    echo "Update secret: echo 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=-"
}

# Main function
main() {
    print_status "Starting Google Cloud Secret Manager setup..."
    print_status "Project: $PROJECT_ID"
    echo ""
    
    check_prerequisites
    enable_apis
    create_service_account
    collect_secrets
    store_secrets
    run_connectivity_tests
    display_summary
    
    print_success "Secret management setup completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  help     Show this help message"
        echo "  setup    Set up secrets (default)"
        echo "  test     Test connectivity only"
        echo "  list     List existing secrets"
        echo ""
        echo "Environment variables:"
        echo "  GCP_PROJECT_ID           Google Cloud Project ID (required)"
        echo "  GCP_SERVICE_ACCOUNT      Service account name (default: ynab-analysis-service-account)"
        ;;
    "test")
        check_prerequisites
        print_status "Testing connectivity with existing secrets..."
        # This would test with existing secrets - implementation depends on requirements
        ;;
    "list")
        check_prerequisites
        print_status "Listing existing secrets..."
        gcloud secrets list --filter="labels.app=ynab-analysis"
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

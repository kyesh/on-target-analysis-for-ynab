#!/bin/bash

# Local Development with GCP Secrets Script
# Retrieves real YNAB OAuth credentials from Google Cloud Secret Manager
# and starts local development server with proper configuration

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-on-target-analysis-for-ynab}"
ENV_FILE=".env.local"

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm"
        exit 1
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        print_error "Not authenticated with gcloud. Please run: gcloud auth login"
        exit 1
    fi
    
    # Set the project
    gcloud config set project "$PROJECT_ID" > /dev/null 2>&1
    
    print_success "Prerequisites check passed"
}

# Function to retrieve credential from GCP
get_secret() {
    local secret_name="$1"
    local secret_value
    
    if secret_value=$(gcloud secrets versions access latest --secret "$secret_name" 2>/dev/null); then
        echo "$secret_value"
        return 0
    else
        print_error "Failed to retrieve credential: $secret_name"
        print_status "Make sure the credential exists and you have access to it"
        print_status "Run: gcloud secrets list --filter=\"labels.app=on-target-analysis\""
        return 1
    fi
}

# Function to generate .env.local with real credentials
generate_env_file() {
    print_status "Retrieving credentials from Google Cloud Secret Manager..."

    # Retrieve credentials
    local ynab_client_id
    local nextauth_secret
    local app_url
    local posthog_key
    local posthog_host
    
    print_status "Retrieving YNAB OAuth Client ID..."
    if ! ynab_client_id=$(get_secret "ynab-oauth-client-id"); then
        exit 1
    fi
    
    print_status "Retrieving NextAuth secret..."
    if ! nextauth_secret=$(get_secret "nextauth-secret"); then
        exit 1
    fi
    
    print_status "Retrieving app URL..."
    if ! app_url=$(get_secret "app-url"); then
        # Use localhost for development if production URL is stored
        app_url="http://localhost:3000"
        print_warning "Using localhost URL for development: $app_url"
    fi
    
    print_status "Retrieving PostHog configuration..."
    posthog_key=$(get_secret "posthog-project-key" 2>/dev/null || echo "")
    posthog_host=$(get_secret "posthog-host" 2>/dev/null || echo "https://app.posthog.com")
    
    # Generate .env.local file
    print_status "Generating $ENV_FILE with real credentials..."
    
    cat > "$ENV_FILE" << EOF
# On Target Analysis for YNAB - Local Development Environment Variables
# Generated automatically from Google Cloud Secret Manager
# Generated on: $(date)

# =============================================================================
# OAuth 2.0 Implicit Grant Flow Configuration
# =============================================================================

# YNAB OAuth Client ID (retrieved from GCP Secret Manager)
NEXT_PUBLIC_YNAB_CLIENT_ID=$ynab_client_id

# =============================================================================
# NextAuth.js Configuration
# =============================================================================

# NextAuth Secret (retrieved from GCP Secret Manager)
NEXTAUTH_SECRET=$nextauth_secret

# NextAuth URL (for local development)
NEXTAUTH_URL=http://localhost:3000

# =============================================================================
# Application Configuration
# =============================================================================

# Environment
NODE_ENV=development

# Application Name
NEXT_PUBLIC_APP_NAME=On Target Analysis for YNAB

# Application URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# YNAB API Base URL
NEXT_PUBLIC_API_BASE_URL=https://api.ynab.com/v1

# =============================================================================
# Rate Limiting Configuration
# =============================================================================

RATE_LIMIT_REQUESTS_PER_HOUR=200
CACHE_TTL_SECONDS=300

# =============================================================================
# Security Configuration
# =============================================================================

ENABLE_SECURITY_HEADERS=true
LOG_LEVEL=info

# =============================================================================
# Development Configuration
# =============================================================================

NEXT_PUBLIC_ENABLE_DEBUG=true

# Disable telemetry
NEXT_TELEMETRY_DISABLED=1

# =============================================================================
# PostHog Analytics Configuration
# =============================================================================

EOF

    # Add PostHog configuration if available
    if [ -n "$posthog_key" ]; then
        cat >> "$ENV_FILE" << EOF
# PostHog Project API Key (retrieved from GCP Secret Manager)
NEXT_PUBLIC_POSTHOG_KEY=$posthog_key

# PostHog Host
NEXT_PUBLIC_POSTHOG_HOST=$posthog_host
EOF
    else
        cat >> "$ENV_FILE" << EOF
# PostHog Project API Key (not configured)
# NEXT_PUBLIC_POSTHOG_KEY=

# PostHog Host
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
EOF
    fi
    
    print_success "Generated $ENV_FILE with real YNAB credentials"
    print_status "YNAB Client ID: ${ynab_client_id:0:8}...${ynab_client_id: -8}"
}

# Function to start development server
start_dev_server() {
    print_status "Installing dependencies..."
    npm install
    
    print_status "Starting development server with real YNAB credentials..."
    print_success "Local development URL: http://localhost:3000"
    print_success "OAuth will use real YNAB Client ID for authentication"
    
    # Start the development server
    npm run dev
}

# Function to display usage
show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start    Generate .env.local with real secrets and start dev server (default)"
    echo "  env      Generate .env.local file only (don't start server)"
    echo "  clean    Remove .env.local file"
    echo "  help     Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  GCP_PROJECT_ID    Google Cloud Project ID (default: on-target-analysis-for-ynab)"
    echo ""
    echo "Prerequisites:"
    echo "  - gcloud CLI installed and authenticated"
    echo "  - Access to GCP Secret Manager secrets"
    echo "  - Node.js and npm installed"
}

# Function to clean environment file
clean_env() {
    if [ -f "$ENV_FILE" ]; then
        rm "$ENV_FILE"
        print_success "Removed $ENV_FILE"
    else
        print_warning "$ENV_FILE does not exist"
    fi
}

# Main function
main() {
    print_status "Starting local development with real GCP secrets..."
    print_status "Project: $PROJECT_ID"
    echo ""
    
    check_prerequisites
    generate_env_file
    start_dev_server
}

# Handle script arguments
case "${1:-start}" in
    "help"|"-h"|"--help")
        show_usage
        ;;
    "env")
        check_prerequisites
        generate_env_file
        print_success "Environment file generated. Run 'npm run dev' to start the server."
        ;;
    "clean")
        clean_env
        ;;
    "start"|"")
        main
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac

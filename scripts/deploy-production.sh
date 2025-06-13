#!/bin/bash

# YNAB Off-Target Assignment Analysis - Production Deployment Script
# This script automates the complete deployment process to Google Cloud Platform

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Configuration
PROJECT_ID="${PROJECT_ID:-ynab-analysis-prod}"
SERVICE_NAME="${SERVICE_NAME:-ynab-analysis}"
REGION="${REGION:-us-central1}"
DOMAIN="${DOMAIN:-your-domain.com}"
IMAGE_TAG=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if authenticated with gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not authenticated with gcloud. Run 'gcloud auth login' first."
        exit 1
    fi
    
    # Check if project exists
    if ! gcloud projects describe "$PROJECT_ID" &> /dev/null; then
        log_error "Project $PROJECT_ID does not exist or you don't have access."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Set up GCP project
setup_project() {
    log_info "Setting up GCP project..."
    
    # Set the project
    gcloud config set project "$PROJECT_ID"
    
    # Enable required APIs
    log_info "Enabling required APIs..."
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        secretmanager.googleapis.com \
        dns.googleapis.com \
        monitoring.googleapis.com \
        logging.googleapis.com \
        containerregistry.googleapis.com
    
    log_success "GCP project setup completed"
}

# Create service accounts if they don't exist
setup_service_accounts() {
    log_info "Setting up service accounts..."
    
    # Cloud Run service account
    if ! gcloud iam service-accounts describe "ynab-analysis-runner@$PROJECT_ID.iam.gserviceaccount.com" &> /dev/null; then
        gcloud iam service-accounts create ynab-analysis-runner \
            --display-name="YNAB Analysis Cloud Run Service Account"
        
        # Grant Secret Manager access
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:ynab-analysis-runner@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/secretmanager.secretAccessor"
    fi
    
    log_success "Service accounts setup completed"
}

# Validate secrets exist
validate_secrets() {
    log_info "Validating secrets in Secret Manager..."
    
    required_secrets=(
        "ynab-client-id"
        "ynab-client-secret"
        "nextauth-secret"
        "nextauth-url"
        "posthog-key"
        "posthog-personal-api-key"
        "session-encryption-key"
        "token-encryption-key"
    )
    
    missing_secrets=()
    
    for secret in "${required_secrets[@]}"; do
        if ! gcloud secrets describe "$secret" &> /dev/null; then
            missing_secrets+=("$secret")
        fi
    done
    
    if [ ${#missing_secrets[@]} -ne 0 ]; then
        log_error "Missing required secrets: ${missing_secrets[*]}"
        log_info "Please create these secrets in Secret Manager before deploying."
        log_info "Example: gcloud secrets create ynab-client-id --data-file=-"
        exit 1
    fi
    
    log_success "All required secrets are present"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm ci
    fi
    
    # Run tests
    npm test
    
    # Run type checking
    npm run type-check
    
    # Run linting
    npm run lint
    
    log_success "All tests passed"
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building Docker image..."
    
    # Configure Docker to use gcloud as credential helper
    gcloud auth configure-docker
    
    # Build the image
    docker build -f Dockerfile.production -t "gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG" .
    docker tag "gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG" "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"
    
    log_info "Pushing image to Google Container Registry..."
    docker push "gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG"
    docker push "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"
    
    log_success "Image built and pushed successfully"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    gcloud run deploy "$SERVICE_NAME" \
        --image="gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG" \
        --region="$REGION" \
        --platform=managed \
        --allow-unauthenticated \
        --service-account="ynab-analysis-runner@$PROJECT_ID.iam.gserviceaccount.com" \
        --memory=1Gi \
        --cpu=1 \
        --concurrency=100 \
        --max-instances=10 \
        --min-instances=0 \
        --timeout=300 \
        --set-env-vars="NODE_ENV=production" \
        --set-secrets="YNAB_CLIENT_ID=ynab-client-id:latest" \
        --set-secrets="YNAB_CLIENT_SECRET=ynab-client-secret:latest" \
        --set-secrets="NEXTAUTH_SECRET=nextauth-secret:latest" \
        --set-secrets="NEXTAUTH_URL=nextauth-url:latest" \
        --set-secrets="NEXT_PUBLIC_POSTHOG_KEY=posthog-key:latest" \
        --set-secrets="POSTHOG_PERSONAL_API_KEY=posthog-personal-api-key:latest" \
        --set-secrets="SESSION_ENCRYPTION_KEY=session-encryption-key:latest" \
        --set-secrets="TOKEN_ENCRYPTION_KEY=token-encryption-key:latest"
    
    log_success "Deployment to Cloud Run completed"
}

# Configure custom domain (optional)
configure_domain() {
    if [ "$DOMAIN" != "your-domain.com" ]; then
        log_info "Configuring custom domain: $DOMAIN"
        
        # Create domain mapping
        if ! gcloud run domain-mappings describe --domain="$DOMAIN" --region="$REGION" &> /dev/null; then
            gcloud run domain-mappings create \
                --service="$SERVICE_NAME" \
                --domain="$DOMAIN" \
                --region="$REGION"
            
            log_warning "Domain mapping created. Please update your DNS records as instructed by GCP."
        else
            log_info "Domain mapping already exists"
        fi
    else
        log_info "Skipping domain configuration (using default domain)"
    fi
}

# Set up monitoring and alerting
setup_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Create notification channel (email)
    if [ -n "${ALERT_EMAIL:-}" ]; then
        log_info "Creating email notification channel..."
        gcloud alpha monitoring channels create \
            --display-name="YNAB Analysis Alerts" \
            --type=email \
            --channel-labels=email_address="$ALERT_EMAIL" \
            --enabled
    fi
    
    log_success "Monitoring setup completed"
}

# Get deployment information
get_deployment_info() {
    log_info "Getting deployment information..."
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')
    
    # Get latest revision
    LATEST_REVISION=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.latestReadyRevisionName)')
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📊 Deployment Information:"
    echo "  Project ID: $PROJECT_ID"
    echo "  Service Name: $SERVICE_NAME"
    echo "  Region: $REGION"
    echo "  Image: gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG"
    echo "  Latest Revision: $LATEST_REVISION"
    echo ""
    echo "🌍 Service URLs:"
    echo "  Cloud Run URL: $SERVICE_URL"
    if [ "$DOMAIN" != "your-domain.com" ]; then
        echo "  Custom Domain: https://$DOMAIN"
    fi
    echo ""
    echo "📈 Monitoring:"
    echo "  Cloud Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
    echo "  Logs: https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22$SERVICE_NAME%22"
    echo ""
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add any cleanup tasks here
}

# Main deployment function
main() {
    echo "🚀 Starting YNAB Off-Target Assignment Analysis Production Deployment"
    echo "=================================================="
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Run deployment steps
    check_prerequisites
    setup_project
    setup_service_accounts
    validate_secrets
    run_tests
    build_and_push_image
    deploy_to_cloud_run
    configure_domain
    setup_monitoring
    get_deployment_info
    
    log_success "🎉 Production deployment completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id)
            PROJECT_ID="$2"
            shift 2
            ;;
        --service-name)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --alert-email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --project-id ID      GCP project ID (default: ynab-analysis-prod)"
            echo "  --service-name NAME  Cloud Run service name (default: ynab-analysis)"
            echo "  --region REGION      GCP region (default: us-central1)"
            echo "  --domain DOMAIN      Custom domain (optional)"
            echo "  --alert-email EMAIL  Email for alerts (optional)"
            echo "  --skip-tests         Skip running tests"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main

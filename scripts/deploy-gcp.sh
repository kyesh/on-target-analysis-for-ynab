#!/bin/bash

# Google Cloud Platform Deployment Script for On Target Analysis for YNAB
# Deploys the OAuth 2.0 Implicit Grant Flow application to Cloud Run

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${GCP_SERVICE_NAME:-on-target-analysis-for-ynab}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
MIN_INSTANCES="${GCP_MIN_INSTANCES:-0}"
MAX_INSTANCES="${GCP_MAX_INSTANCES:-10}"
MEMORY="${GCP_MEMORY:-1Gi}"
CPU="${GCP_CPU:-1}"
TIMEOUT="${GCP_TIMEOUT:-300}"

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

# Function to check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop or Docker Engine"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm"
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to validate configuration
validate_config() {
    print_status "Validating configuration..."
    
    if [ -z "$PROJECT_ID" ]; then
        print_error "GCP_PROJECT_ID environment variable is not set"
        print_status "Please set it with: export GCP_PROJECT_ID=your-project-id"
        exit 1
    fi
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local file not found"
        print_status "Creating .env.local from .env.example..."
        cp .env.example .env.local
        print_warning "Please edit .env.local with your actual values before deploying"
        exit 1
    fi
    
    # Validate required environment variables in .env.local
    if ! grep -q "NEXT_PUBLIC_YNAB_CLIENT_ID=" .env.local || grep -q "your_ynab_oauth_client_id_here" .env.local; then
        print_error "NEXT_PUBLIC_YNAB_CLIENT_ID is not properly configured in .env.local"
        exit 1
    fi
    
    if ! grep -q "NEXTAUTH_SECRET=" .env.local || grep -q "your_nextauth_secret_here" .env.local; then
        print_error "NEXTAUTH_SECRET is not properly configured in .env.local"
        exit 1
    fi
    
    print_success "Configuration is valid"
}

# Function to authenticate with GCP
authenticate_gcp() {
    print_status "Authenticating with Google Cloud Platform..."
    
    # Check if already authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        print_status "Not authenticated. Starting authentication flow..."
        gcloud auth login
    fi
    
    # Set the project
    gcloud config set project "$PROJECT_ID"
    
    # Enable required APIs
    print_status "Enabling required Google Cloud APIs..."
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable run.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    gcloud services enable secretmanager.googleapis.com
    
    print_success "GCP authentication and setup complete"
}

# Function to build the application
build_application() {
    print_status "Building the application..."
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm ci
    
    # Run type checking
    print_status "Running type checking..."
    npm run type-check
    
    # Build the application
    print_status "Building Next.js application..."
    npm run build
    
    print_success "Application build complete"
}

# Function to create Dockerfile if it doesn't exist
create_dockerfile() {
    if [ ! -f "Dockerfile" ]; then
        print_status "Creating Dockerfile for Cloud Run deployment..."
        
        cat > Dockerfile << 'EOF'
# Use the official Node.js runtime as the base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
EOF
        
        print_success "Dockerfile created"
    fi
}

# Function to build and push Docker image
build_and_push_image() {
    print_status "Building and pushing Docker image..."
    
    # Configure Docker to use gcloud as a credential helper
    gcloud auth configure-docker
    
    # Build the Docker image
    print_status "Building Docker image: $IMAGE_NAME"
    docker build -t "$IMAGE_NAME" .
    
    # Push the image to Google Container Registry
    print_status "Pushing image to Google Container Registry..."
    docker push "$IMAGE_NAME"
    
    print_success "Docker image built and pushed successfully"
}

# Function to deploy to Cloud Run
deploy_to_cloud_run() {
    print_status "Deploying to Cloud Run..."
    
    # Create deployment command
    DEPLOY_CMD="gcloud run deploy $SERVICE_NAME \
        --image=$IMAGE_NAME \
        --platform=managed \
        --region=$REGION \
        --allow-unauthenticated \
        --memory=$MEMORY \
        --cpu=$CPU \
        --timeout=$TIMEOUT \
        --min-instances=$MIN_INSTANCES \
        --max-instances=$MAX_INSTANCES \
        --port=3000"
    
    # Add environment variables from .env.local (excluding sensitive ones)
    while IFS= read -r line; do
        if [[ $line =~ ^NEXT_PUBLIC_ ]] && [[ ! $line =~ ^# ]] && [[ $line =~ = ]]; then
            key=$(echo "$line" | cut -d'=' -f1)
            value=$(echo "$line" | cut -d'=' -f2-)
            DEPLOY_CMD="$DEPLOY_CMD --set-env-vars=$key=$value"
        fi
    done < .env.local
    
    # Add production environment variables
    DEPLOY_CMD="$DEPLOY_CMD --set-env-vars=NODE_ENV=production"
    DEPLOY_CMD="$DEPLOY_CMD --set-env-vars=NEXT_TELEMETRY_DISABLED=1"
    
    # Execute deployment
    eval "$DEPLOY_CMD"
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")
    
    print_success "Deployment complete!"
    print_success "Service URL: $SERVICE_URL"
    print_status "Health check: $SERVICE_URL/api/health"
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")
    
    # Wait for service to be ready
    print_status "Waiting for service to be ready..."
    sleep 30
    
    # Check health endpoint
    if curl -f -s "$SERVICE_URL/api/health" > /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        print_status "Check the logs with: gcloud run logs read $SERVICE_NAME --region=$REGION"
        exit 1
    fi
    
    # Check OAuth configuration
    if curl -f -s "$SERVICE_URL/auth/signin" > /dev/null; then
        print_success "OAuth configuration check passed"
    else
        print_warning "OAuth configuration check failed - please verify YNAB OAuth settings"
    fi
}

# Function to display deployment information
display_deployment_info() {
    print_success "Deployment Summary"
    echo "===================="
    echo "Project ID: $PROJECT_ID"
    echo "Service Name: $SERVICE_NAME"
    echo "Region: $REGION"
    echo "Image: $IMAGE_NAME"
    echo "Service URL: $(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")"
    echo ""
    print_status "Useful commands:"
    echo "View logs: gcloud run logs read $SERVICE_NAME --region=$REGION"
    echo "Update service: gcloud run services update $SERVICE_NAME --region=$REGION"
    echo "Delete service: gcloud run services delete $SERVICE_NAME --region=$REGION"
}

# Main deployment function
main() {
    print_status "Starting Google Cloud Platform deployment..."
    print_status "Project: $PROJECT_ID"
    print_status "Region: $REGION"
    print_status "Service: $SERVICE_NAME"
    echo ""
    
    check_prerequisites
    validate_config
    authenticate_gcp
    build_application
    create_dockerfile
    build_and_push_image
    deploy_to_cloud_run
    run_health_checks
    display_deployment_info
    
    print_success "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  help    Show this help message"
        echo "  check   Check prerequisites and configuration"
        echo "  build   Build the application only"
        echo "  deploy  Full deployment (default)"
        echo ""
        echo "Environment variables:"
        echo "  GCP_PROJECT_ID     Google Cloud Project ID (required)"
        echo "  GCP_REGION         Deployment region (default: us-central1)"
        echo "  GCP_SERVICE_NAME   Cloud Run service name (default: on-target-analysis-for-ynab)"
        echo "  GCP_MIN_INSTANCES  Minimum instances (default: 0)"
        echo "  GCP_MAX_INSTANCES  Maximum instances (default: 10)"
        echo "  GCP_MEMORY         Memory allocation (default: 1Gi)"
        echo "  GCP_CPU            CPU allocation (default: 1)"
        echo "  GCP_TIMEOUT        Request timeout (default: 300)"
        ;;
    "check")
        check_prerequisites
        validate_config
        ;;
    "build")
        check_prerequisites
        validate_config
        build_application
        ;;
    "deploy"|"")
        main
        ;;
    *)
        print_error "Unknown command: $1"
        print_status "Use '$0 help' for usage information"
        exit 1
        ;;
esac

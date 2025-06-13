#!/bin/bash

# Integration Test Script for YNAB Off-Target Analysis
# Tests OAuth flow, API endpoints, and analytics integration

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
TIMEOUT=30

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

# Function to test HTTP endpoint
test_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local description="$3"
    
    print_status "Testing $description..."
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT "$BASE_URL$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        print_success "$description - Status: $response"
        return 0
    else
        print_error "$description - Expected: $expected_status, Got: $response"
        return 1
    fi
}

# Function to test endpoint with content check
test_endpoint_content() {
    local endpoint="$1"
    local expected_content="$2"
    local description="$3"
    
    print_status "Testing $description..."
    
    local response=$(curl -s --max-time $TIMEOUT "$BASE_URL$endpoint")
    
    if echo "$response" | grep -q "$expected_content"; then
        print_success "$description - Content check passed"
        return 0
    else
        print_error "$description - Expected content not found"
        echo "Response: $response" | head -5
        return 1
    fi
}

# Function to check if server is running
check_server() {
    print_status "Checking if server is running at $BASE_URL..."
    
    if curl -s --max-time 5 "$BASE_URL" > /dev/null; then
        print_success "Server is running"
        return 0
    else
        print_error "Server is not running at $BASE_URL"
        print_status "Please start the server with: npm run dev"
        return 1
    fi
}

# Function to test health endpoint
test_health() {
    print_status "Testing health endpoint..."
    
    local response=$(curl -s --max-time $TIMEOUT "$BASE_URL/api/health")
    
    if echo "$response" | grep -q '"status":"healthy"'; then
        print_success "Health check passed"
        return 0
    elif echo "$response" | grep -q '"status":"degraded"'; then
        print_warning "Health check shows degraded status"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 0
    else
        print_error "Health check failed"
        echo "$response"
        return 1
    fi
}

# Function to test OAuth configuration
test_oauth_config() {
    print_status "Testing OAuth configuration..."
    
    # Test sign-in page
    if test_endpoint_content "/auth/signin" "Connect with YNAB" "OAuth sign-in page"; then
        print_success "OAuth sign-in page is accessible"
    else
        return 1
    fi
    
    # Test callback page (should redirect or show error without params)
    if test_endpoint "/auth/callback" "200" "OAuth callback endpoint"; then
        print_success "OAuth callback endpoint is accessible"
    else
        return 1
    fi
    
    # Test error page
    if test_endpoint "/auth/error" "200" "OAuth error page"; then
        print_success "OAuth error page is accessible"
    else
        return 1
    fi
}

# Function to test API endpoints (without authentication)
test_api_endpoints() {
    print_status "Testing API endpoints..."
    
    # Test budgets endpoint (should return 401 without auth)
    if test_endpoint "/api/budgets" "401" "Budgets API (unauthenticated)"; then
        print_success "Budgets API correctly requires authentication"
    else
        return 1
    fi
    
    # Test monthly analysis endpoint (should return 401 without auth)
    if test_endpoint "/api/analysis/monthly" "401" "Monthly analysis API (unauthenticated)"; then
        print_success "Monthly analysis API correctly requires authentication"
    else
        return 1
    fi
}

# Function to test static pages
test_static_pages() {
    print_status "Testing static pages..."
    
    # Test home page
    if test_endpoint "/" "200" "Home page"; then
        print_success "Home page is accessible"
    else
        return 1
    fi
    
    # Test dashboard (should redirect to auth)
    local dashboard_response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT "$BASE_URL/dashboard")
    if [ "$dashboard_response" = "200" ] || [ "$dashboard_response" = "302" ] || [ "$dashboard_response" = "307" ]; then
        print_success "Dashboard page handling is correct"
    else
        print_warning "Dashboard page returned unexpected status: $dashboard_response"
    fi
}

# Function to test security headers
test_security_headers() {
    print_status "Testing security headers..."
    
    local headers=$(curl -s -I --max-time $TIMEOUT "$BASE_URL/")
    
    # Check for Content Security Policy
    if echo "$headers" | grep -qi "content-security-policy"; then
        print_success "Content Security Policy header is present"
    else
        print_warning "Content Security Policy header is missing"
    fi
    
    # Check for X-Frame-Options
    if echo "$headers" | grep -qi "x-frame-options"; then
        print_success "X-Frame-Options header is present"
    else
        print_warning "X-Frame-Options header is missing"
    fi
    
    # Check for X-Content-Type-Options
    if echo "$headers" | grep -qi "x-content-type-options"; then
        print_success "X-Content-Type-Options header is present"
    else
        print_warning "X-Content-Type-Options header is missing"
    fi
}

# Function to test analytics integration
test_analytics() {
    print_status "Testing analytics integration..."
    
    # Check if PostHog script is loaded (in a real page)
    local page_content=$(curl -s --max-time $TIMEOUT "$BASE_URL/auth/signin")
    
    # This is a basic check - in a real test you'd check for PostHog initialization
    if echo "$page_content" | grep -q "analytics\|posthog"; then
        print_success "Analytics integration appears to be present"
    else
        print_warning "Analytics integration not detected (may be normal if not configured)"
    fi
}

# Function to run performance tests
test_performance() {
    print_status "Testing performance..."
    
    # Test page load time
    local start_time=$(date +%s%N)
    curl -s --max-time $TIMEOUT "$BASE_URL/" > /dev/null
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
    
    if [ $duration -lt 2000 ]; then
        print_success "Page load time: ${duration}ms (Good)"
    elif [ $duration -lt 5000 ]; then
        print_warning "Page load time: ${duration}ms (Acceptable)"
    else
        print_warning "Page load time: ${duration}ms (Slow)"
    fi
}

# Function to run all tests
run_all_tests() {
    local failed_tests=0
    
    print_status "Starting integration tests for YNAB Off-Target Analysis"
    print_status "Base URL: $BASE_URL"
    echo ""
    
    # Check if server is running
    if ! check_server; then
        print_error "Cannot proceed with tests - server is not running"
        exit 1
    fi
    
    # Run tests
    test_health || ((failed_tests++))
    test_oauth_config || ((failed_tests++))
    test_api_endpoints || ((failed_tests++))
    test_static_pages || ((failed_tests++))
    test_security_headers || ((failed_tests++))
    test_analytics || ((failed_tests++))
    test_performance || ((failed_tests++))
    
    echo ""
    if [ $failed_tests -eq 0 ]; then
        print_success "All integration tests passed! ✅"
        return 0
    else
        print_error "$failed_tests test(s) failed ❌"
        return 1
    fi
}

# Function to display help
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  help        Show this help message"
    echo "  health      Test health endpoint only"
    echo "  oauth       Test OAuth configuration only"
    echo "  api         Test API endpoints only"
    echo "  security    Test security headers only"
    echo "  performance Test performance only"
    echo "  all         Run all tests (default)"
    echo ""
    echo "Environment variables:"
    echo "  TEST_BASE_URL   Base URL to test (default: http://localhost:3000)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests on localhost"
    echo "  TEST_BASE_URL=https://example.com $0 # Run all tests on production"
    echo "  $0 health                            # Test health endpoint only"
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        show_help
        ;;
    "health")
        check_server && test_health
        ;;
    "oauth")
        check_server && test_oauth_config
        ;;
    "api")
        check_server && test_api_endpoints
        ;;
    "security")
        check_server && test_security_headers
        ;;
    "performance")
        check_server && test_performance
        ;;
    "all"|"")
        run_all_tests
        ;;
    *)
        print_error "Unknown command: $1"
        print_status "Use '$0 help' for usage information"
        exit 1
        ;;
esac

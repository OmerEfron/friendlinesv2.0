#!/bin/bash

# Friendlines Backend Deployment Script
# This script automates the deployment process for different platforms

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="friendlines-backend"
NODE_VERSION="20"
PLATFORMS=("railway" "vercel" "render" "aws")

# Functions
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

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt "18" ]; then
        log_error "Node.js version 18 or higher is required"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

run_tests() {
    log_info "Running tests..."
    
    if ! npm test; then
        log_error "Tests failed"
        exit 1
    fi
    
    log_success "All tests passed"
}

setup_environment() {
    local platform=$1
    log_info "Setting up environment for $platform..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating .env file..."
        cat > .env << EOF
NODE_ENV=production
PORT=3000
# Add other environment variables here
EOF
        log_warning "Please update .env file with your configuration"
    fi
    
    log_success "Environment setup complete"
}

deploy_railway() {
    log_info "Deploying to Railway..."
    
    if ! command -v railway &> /dev/null; then
        log_info "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Login check
    if ! railway whoami &> /dev/null; then
        log_error "Please login to Railway first: railway login"
        exit 1
    fi
    
    # Deploy
    railway up
    
    log_success "Deployed to Railway successfully"
}

deploy_vercel() {
    log_info "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        log_info "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy
    vercel --prod
    
    log_success "Deployed to Vercel successfully"
}

deploy_render() {
    log_info "Deploying to Render..."
    
    if [ ! -f render.yaml ]; then
        log_error "render.yaml not found. Please create it first."
        exit 1
    fi
    
    log_info "Please push your changes to trigger Render deployment"
    log_info "Or use Render CLI if available"
    
    log_success "Render deployment initiated"
}

deploy_aws() {
    log_info "Deploying to AWS using Terraform..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    cd terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan
    
    # Ask for confirmation
    read -p "Do you want to apply the Terraform plan? (y/N): " confirm
    if [[ $confirm == [yY] ]]; then
        terraform apply
        log_success "AWS deployment completed"
    else
        log_info "AWS deployment cancelled"
    fi
    
    cd ..
}

build_docker() {
    log_info "Building Docker image..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    docker build -t $PROJECT_NAME:latest .
    
    log_success "Docker image built successfully"
}

health_check() {
    local url=$1
    log_info "Performing health check on $url..."
    
    for i in {1..10}; do
        if curl -f -s "$url/health" > /dev/null; then
            log_success "Health check passed!"
            return 0
        else
            log_warning "Health check failed, retrying in 10s... ($i/10)"
            sleep 10
        fi
    done
    
    log_error "Health check failed after 10 attempts"
    return 1
}

show_help() {
    echo "Friendlines Backend Deployment Script"
    echo ""
    echo "Usage: $0 [PLATFORM] [OPTIONS]"
    echo ""
    echo "Platforms:"
    echo "  railway    Deploy to Railway (recommended)"
    echo "  vercel     Deploy to Vercel"
    echo "  render     Deploy to Render"
    echo "  aws        Deploy to AWS using Terraform"
    echo "  docker     Build Docker image only"
    echo ""
    echo "Options:"
    echo "  --skip-tests    Skip running tests"
    echo "  --skip-deps     Skip dependency check"
    echo "  --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 railway"
    echo "  $0 vercel --skip-tests"
    echo "  $0 aws"
}

# Main execution
main() {
    local platform=""
    local skip_tests=false
    local skip_deps=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-deps)
                skip_deps=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            railway|vercel|render|aws|docker)
                platform=$1
                shift
                ;;
            *)
                log_error "Unknown argument: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Check if platform is specified
    if [ -z "$platform" ]; then
        log_error "Please specify a deployment platform"
        show_help
        exit 1
    fi
    
    log_info "Starting deployment to $platform..."
    
    # Run checks
    if [ "$skip_deps" = false ]; then
        check_dependencies
    fi
    
    if [ "$skip_tests" = false ]; then
        run_tests
    fi
    
    setup_environment "$platform"
    
    # Deploy based on platform
    case $platform in
        railway)
            deploy_railway
            ;;
        vercel)
            deploy_vercel
            ;;
        render)
            deploy_render
            ;;
        aws)
            deploy_aws
            ;;
        docker)
            build_docker
            ;;
        *)
            log_error "Invalid platform: $platform"
            exit 1
            ;;
    esac
    
    log_success "Deployment completed successfully! 🎉"
}

# Run main function with all arguments
main "$@" 
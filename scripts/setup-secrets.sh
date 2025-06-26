#!/bin/bash

# Friendlines Backend - Setup deployment secrets script
# This script helps you configure secrets for CI/CD deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

show_help() {
    echo "Friendlines Backend - Setup Deployment Secrets"
    echo ""
    echo "This script helps you set up the required secrets for CI/CD deployment."
    echo "Please configure these secrets in your GitHub repository settings:"
    echo ""
    echo "Go to: GitHub Repository > Settings > Secrets and variables > Actions"
    echo ""
}

setup_railway_secrets() {
    log_info "Setting up Railway deployment secrets..."
    echo ""
    echo "Required secrets for Railway deployment:"
    echo ""
    echo "1. RAILWAY_TOKEN:"
    echo "   - Go to Railway dashboard: https://railway.app/"
    echo "   - Click on your profile > Account Settings"
    echo "   - Generate a new token"
    echo "   - Copy the token"
    echo ""
    echo "2. RAILWAY_SERVICE:"
    echo "   - This is your Railway service name (usually: friendlines-backend)"
    echo ""
    echo "3. RAILWAY_URL:"
    echo "   - This will be provided after first deployment"
    echo "   - Format: https://your-app.railway.app"
    echo ""
}

setup_vercel_secrets() {
    log_info "Setting up Vercel deployment secrets..."
    echo ""
    echo "Required secrets for Vercel deployment:"
    echo ""
    echo "1. VERCEL_TOKEN:"
    echo "   - Go to Vercel dashboard: https://vercel.com/"
    echo "   - Go to Settings > Tokens"
    echo "   - Create a new token"
    echo ""
    echo "2. VERCEL_PROJECT_ID:"
    echo "   - Found in your project settings"
    echo ""
    echo "3. VERCEL_ORG_ID:"
    echo "   - Found in your team/account settings"
    echo ""
}

setup_aws_secrets() {
    log_info "Setting up AWS deployment secrets..."
    echo ""
    echo "Required secrets for AWS deployment:"
    echo ""
    echo "1. AWS_ACCESS_KEY_ID:"
    echo "   - From AWS IAM user with ECS/ECR permissions"
    echo ""
    echo "2. AWS_SECRET_ACCESS_KEY:"
    echo "   - Corresponding secret key"
    echo ""
    echo "3. AWS_REGION:"
    echo "   - Example: us-east-1"
    echo ""
    echo "4. ECR_REPOSITORY_URI:"
    echo "   - Will be created by Terraform"
    echo ""
}

main() {
    show_help
    
    echo "Choose your deployment platform:"
    echo "1) Railway (Recommended - Free tier)"
    echo "2) Vercel (Good for serverless)"
    echo "3) AWS (Advanced - with Terraform)"
    echo "4) Show all"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            setup_railway_secrets
            ;;
        2)
            setup_vercel_secrets
            ;;
        3)
            setup_aws_secrets
            ;;
        4)
            setup_railway_secrets
            setup_vercel_secrets
            setup_aws_secrets
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    log_warning "After setting up secrets, commit your code and push to 'main' branch to trigger deployment!"
    log_success "Setup complete!"
}

main "$@" 
#!/bin/bash

# Quick deployment script for ShipIts Forum
# This script automates the entire deployment process

set -e  # Exit on any error

echo "🚀 ShipIts Forum - Quick Deployment Script"
echo "=========================================="
echo ""

# Configuration
APP_DIR="/var/www/shipits"
REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"  # REPLACE WITH YOUR REPO
BRANCH="thomas-dev-server"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Don't run this script as root!"
    exit 1
fi

# Step 1: System Setup
echo "Step 1: Setting up system requirements..."
if [ ! -f "./ec2-setup.sh" ]; then
    print_error "ec2-setup.sh not found in current directory"
    exit 1
fi

sudo ./ec2-setup.sh
print_status "System setup completed"

# Step 2: Deploy Application
echo ""
echo "Step 2: Deploying application..."
if [ ! -f "./deploy.sh" ]; then
    print_error "deploy.sh not found in current directory"
    exit 1
fi

# Update deploy.sh with the correct repo URL if provided
if [ "$1" != "" ]; then
    REPO_URL="$1"
    print_info "Using repository: $REPO_URL"
    sed -i "s|REPO_URL=\".*\"|REPO_URL=\"$REPO_URL\"|" ./deploy.sh
fi

./deploy.sh
print_status "Application deployment completed"

# Step 3: Configure Nginx
echo ""
echo "Step 3: Configuring Nginx reverse proxy..."
if [ ! -f "./nginx-config.sh" ]; then
    print_error "nginx-config.sh not found in current directory"
    exit 1
fi

sudo ./nginx-config.sh
print_status "Nginx configuration completed"

# Step 4: Environment Setup
echo ""
echo "Step 4: Setting up environment variables..."
if [ ! -f "./setup-env.sh" ]; then
    print_error "setup-env.sh not found in current directory"
    exit 1
fi

sudo ./setup-env.sh
print_status "Environment setup completed"

# Step 5: Final checks
echo ""
echo "Step 5: Running final checks..."

# Check if PM2 is running the app
if pm2 list | grep -q "shipits-forum"; then
    print_status "Application is running in PM2"
else
    print_warning "Application not found in PM2, checking..."
    pm2 status
fi

# Check if Nginx is running
if sudo systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running"
    sudo systemctl status nginx
fi

# Get server info
PUBLIC_IP=$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "N/A")

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
print_info "Your ShipIts Forum is now deployed!"
echo ""
echo "📍 Access your application:"
if [ "$PUBLIC_IP" != "N/A" ]; then
    echo "   🌐 Web:    http://$PUBLIC_IP"
    echo "   🔧 Direct: http://$PUBLIC_IP:3555"
else
    echo "   🌐 Web:    http://YOUR-EC2-PUBLIC-IP"
    echo "   🔧 Direct: http://YOUR-EC2-PUBLIC-IP:3555"
fi
echo ""
echo "📋 Next steps:"
echo "   1. 🔐 Update MongoDB URI in /var/www/shipits/shipits/.env"
echo "   2. 🌐 Configure your domain (optional)"
echo "   3. 🔒 Set up SSL with Let's Encrypt (recommended)"
echo "   4. 📊 Monitor with: pm2 monit"
echo ""
echo "🔍 Useful commands:"
echo "   pm2 logs shipits-forum    # View application logs"
echo "   pm2 restart shipits-forum # Restart application"
echo "   sudo systemctl status nginx  # Check Nginx status"
echo "   ./deploy.sh               # Update deployment"
echo ""
print_warning "IMPORTANT: Edit /var/www/shipits/shipits/.env with your actual MongoDB credentials!"
echo ""
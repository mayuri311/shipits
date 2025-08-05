#!/bin/bash

# Deployment script for ShipIts Forum
set -e  # Exit on any error

APP_DIR="/var/www/shipits"
REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"  # REPLACE WITH YOUR REPO
BRANCH="thomas-dev-server"

echo "🚀 Starting ShipIts Forum deployment..."
echo "📅 $(date)"
echo "👤 Running as: $(whoami)"
echo "📍 Working directory: $(pwd)"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
for cmd in git node npm pm2; do
    if ! command_exists $cmd; then
        echo "❌ Error: $cmd is not installed"
        exit 1
    fi
done
echo "✅ All prerequisites found"

# Create app directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Creating app directory..."
    sudo mkdir -p $APP_DIR
    sudo chown -R ubuntu:ubuntu $APP_DIR
fi

# Navigate to app directory
cd $APP_DIR

# Check if this is first deployment
if [ ! -d ".git" ]; then
    echo "📥 First deployment - cloning repository..."
    git clone -b $BRANCH $REPO_URL .
    if [ $? -ne 0 ]; then
        echo "❌ Failed to clone repository. Please check:"
        echo "   1. Repository URL is correct"
        echo "   2. Branch '$BRANCH' exists"
        echo "   3. You have access to the repository"
        exit 1
    fi
else
    echo "🔄 Updating existing deployment..."
    git fetch origin
    git reset --hard origin/$BRANCH
    if [ $? -ne 0 ]; then
        echo "❌ Failed to update from repository"
        exit 1
    fi
fi

echo "✅ Source code updated"

# Navigate to shipits directory
cd shipits

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in shipits directory"
    exit 1
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
npm ci --production=false
if [ $? -ne 0 ]; then
    echo "❌ Failed to install server dependencies"
    exit 1
fi

# Build client
echo "🏗️  Building client..."
cd client
if [ ! -f "package.json" ]; then
    echo "❌ Error: client/package.json not found"
    exit 1
fi

npm ci
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build client"
    exit 1
fi

cd ..

# Build server
echo "🔧 Building server..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build server"
    exit 1
fi

# Check if dist directory was created
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: Server build failed - dist/index.js not found"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Creating basic .env file..."
    ./setup-env.sh
    echo "   Please edit /var/www/shipits/shipits/.env with your settings"
fi

# Test MongoDB connection (optional)
echo "🧪 Testing MongoDB connection..."
timeout 10 node -e "
import('./dist/db.js').then(({db}) => 
  db.connect()
    .then(() => { console.log('✅ MongoDB connection successful'); process.exit(0); })
    .catch(err => { console.error('❌ MongoDB connection failed:', err.message); process.exit(1); })
).catch(err => { console.error('❌ Import error:', err.message); process.exit(1); })
" || echo "⚠️  MongoDB connection test failed or timed out"

# Stop existing PM2 process
echo "⏹️  Stopping existing application..."
pm2 stop shipits-forum 2>/dev/null || true
pm2 delete shipits-forum 2>/dev/null || true

# Start application with PM2
echo "▶️  Starting application..."
pm2 start dist/index.js --name "shipits-forum" --env production --time
if [ $? -ne 0 ]; then
    echo "❌ Failed to start application with PM2"
    echo "📋 Checking logs..."
    pm2 logs shipits-forum --lines 10
    exit 1
fi

# Save PM2 configuration
pm2 save

# Set up PM2 startup (only run if not already configured)
if ! pm2 startup | grep -q "already"; then
    echo "🔧 Setting up PM2 startup..."
    pm2 startup
fi

echo "✅ Deployment complete!"
echo ""
echo "📊 Application Status:"
pm2 status

echo ""
echo "🌐 Application Access:"
PUBLIC_IP=$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "N/A")
if [ "$PUBLIC_IP" != "N/A" ]; then
    echo "   Direct: http://$PUBLIC_IP:3555"
    echo "   Nginx:  http://$PUBLIC_IP"
else
    echo "   Check your EC2 public IP"
fi

echo ""
echo "📋 Useful commands:"
echo "   View logs:    pm2 logs shipits-forum"
echo "   Restart app:  pm2 restart shipits-forum"
echo "   Stop app:     pm2 stop shipits-forum"
echo "   App status:   pm2 status"
echo "   System info:  pm2 monit"

echo ""
echo "🔍 Current application logs (last 5 lines):"
pm2 logs shipits-forum --lines 5 --nostream
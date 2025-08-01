#!/bin/bash

# Deployment script for ShipIts Forum
APP_DIR="/var/www/shipits"
REPO_URL="https://github.com/mayuri311/shipits.git"
BRANCH="thomas-dev-server"

echo "🚀 Starting deployment..."

# Navigate to app directory
cd $APP_DIR

# Check if this is first deployment
if [ ! -d ".git" ]; then
    echo "📥 First deployment - cloning repository..."
    git clone -b $BRANCH $REPO_URL .
else
    echo "🔄 Updating existing deployment..."
    git fetch origin
    git reset --hard origin/$BRANCH
fi

# Navigate to shipits directory
cd shipits

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build client
echo "🏗️  Building client..."
cd client
npm install
npm run build
cd ..

# Build server
echo "🔧 Building server..."
npm run build

# Stop existing PM2 process
echo "⏹️  Stopping existing application..."
pm2 stop shipits-forum 2>/dev/null || true
pm2 delete shipits-forum 2>/dev/null || true

# Start application with PM2
echo "▶️  Starting application..."
pm2 start dist/index.js --name "shipits-forum" --env production

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "🌐 Application running on http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3555"

# Show status
pm2 status
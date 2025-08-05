#!/bin/bash

echo "🚀 Setting up ShipIts Forum server on Ubuntu..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# Install Node.js 18 (LTS)
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install PM2 (Process Manager)
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2

# Install Nginx (Reverse Proxy)
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install Git
echo "📦 Installing Git..."
sudo apt install -y git

# Install build essentials (needed for some npm packages)
echo "📦 Installing build essentials..."
sudo apt install -y build-essential

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/shipits
sudo chown -R ubuntu:ubuntu /var/www/shipits

# Configure firewall
echo "🔒 Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Create swap space (recommended for small instances)
echo "💾 Creating swap space..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Install htop for monitoring
sudo apt install -y htop

echo "✅ Server setup complete!"
echo "📊 System Information:"
echo "   Node.js version: $(node --version)"
echo "   NPM version: $(npm --version)"
echo "   PM2 version: $(pm2 --version)"
echo "   Available memory: $(free -h | grep Mem | awk '{print $2}')"
echo "   Available disk: $(df -h / | tail -1 | awk '{print $4}')"
echo ""
echo "🎯 Next steps:"
echo "   1. Clone your repository to /var/www/shipits"
echo "   2. Set up environment variables"
echo "   3. Run the deployment script"
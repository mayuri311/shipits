#!/bin/bash

# Quick update script - run this for fast updates
cd /var/www/shipits/shipits

echo "🔄 Quick update starting..."

# Pull latest changes
git pull origin thomas-dev-server

# Install any new dependencies
npm install

# Rebuild client if needed
cd client && npm run build && cd ..

# Restart app
pm2 restart shipits-forum

echo "✅ Quick update complete!"
pm2 status
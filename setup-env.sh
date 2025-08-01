#!/bin/bash

# Create environment file
cat > /var/www/shipits/shipits/.env << EOF
# Production Environment Variables
NODE_ENV=production
PORT=3555

# Database - Use MongoDB Atlas or local MongoDB
MONGODB_URI=mongodb://localhost:27017/shipits_forum

# Session Secret - Generate a secure random string
SESSION_SECRET=72Eq9ohtW9/IpY9F4Zip4/ORnwcMfFKqGsKeLN/kgaw=
EOF

echo "✅ Environment variables configured!"
echo "📝 Edit /var/www/shipits/shipits/.env to update settings"
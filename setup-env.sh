#!/bin/bash

echo "🔧 Setting up environment variables..."

# Check if .env already exists
if [ -f "/var/www/shipits/shipits/.env" ]; then
    echo "⚠️  .env file already exists. Creating backup..."
    cp /var/www/shipits/shipits/.env /var/www/shipits/shipits/.env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create environment file with MongoDB Atlas configuration
cat > /var/www/shipits/shipits/.env << EOF
# Production Environment Variables
NODE_ENV=production
PORT=3555

# Database - MongoDB Atlas connection (REPLACE WITH YOUR ACTUAL URI)
# Get this from MongoDB Atlas -> Connect -> Connect your application
MONGODB_URI=mongodb+srv://shipits_user:gappir-vabzo3-cawBof@shipitsv0.qwh6arp.mongodb.net/shipits-forum?retryWrites=true&w=majority&appName=ShipItsV0

# Session Secret - Generate a secure random string (CHANGE THIS IN PRODUCTION)
SESSION_SECRET=$(openssl rand -base64 32)

# Azure OpenAI Configuration (Optional - for AI features)
# Uncomment and configure if you want AI-powered features
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_API_KEY=your-api-key-here
# AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Additional Configuration
# CORS_ORIGIN=https://your-domain.com
# MAX_FILE_SIZE=10485760
EOF

# Set proper permissions
chmod 600 /var/www/shipits/shipits/.env
chown ubuntu:ubuntu /var/www/shipits/shipits/.env

echo "✅ Environment variables configured!"
echo ""
echo "🔒 Security Note: .env file permissions set to 600 (owner read/write only)"
echo ""
echo "⚠️  IMPORTANT: You MUST update the following in /var/www/shipits/shipits/.env:"
echo "   1. MONGODB_URI - Replace with your actual MongoDB Atlas connection string"
echo "   2. SESSION_SECRET - Already generated a secure random string"
echo "   3. Configure Azure OpenAI if you want AI features (optional)"
echo ""
echo "📝 To edit: sudo nano /var/www/shipits/shipits/.env"
echo ""
echo "🧪 To test MongoDB connection:"
echo "   cd /var/www/shipits/shipits && node -e \"import('./dist/db.js').then(({db}) => db.connect().then(() => console.log('✅ Connected')).catch(err => console.error('❌ Error:', err)))\""
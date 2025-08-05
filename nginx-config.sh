#!/bin/bash

echo "🔧 Configuring Nginx reverse proxy for ShipIts Forum..."

# Get public IP for configuration
PUBLIC_IP=$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")

# Create Nginx configuration
echo "📝 Creating Nginx site configuration..."
sudo tee /etc/nginx/sites-available/shipits-forum << EOF
# ShipIts Forum Nginx Configuration
server {
    listen 80;
    server_name ${PUBLIC_IP} your-domain.com _;  # Replace your-domain.com with your actual domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;

    # Main proxy configuration
    location / {
        proxy_pass http://localhost:3555;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Static file serving with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        proxy_pass http://localhost:3555;
        proxy_cache_valid 200 1d;
        expires 1d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3555/health;
        access_log off;
    }

    # File upload size limit
    client_max_body_size 10M;
    
    # Logging
    access_log /var/log/nginx/shipits-forum.access.log;
    error_log /var/log/nginx/shipits-forum.error.log;
}

# Redirect www to non-www (if using domain)
server {
    listen 80;
    server_name www.your-domain.com;  # Replace with your actual domain
    return 301 \$scheme://your-domain.com\$request_uri;
}
EOF

# Backup default nginx config if it exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "📦 Backing up default Nginx configuration..."
    sudo mv /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup
fi

# Enable the site
echo "🔗 Enabling ShipIts Forum site..."
sudo ln -sf /etc/nginx/sites-available/shipits-forum /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Restart and enable Nginx
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Check if Nginx is running
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed to start"
    echo "📋 Checking Nginx status..."
    sudo systemctl status nginx
    exit 1
fi

echo ""
echo "✅ Nginx configured successfully!"
echo ""
echo "🌐 Your application will be available at:"
if [ -n "$PUBLIC_IP" ]; then
    echo "   http://$PUBLIC_IP"
else
    echo "   http://YOUR-EC2-PUBLIC-IP"
fi
echo ""
echo "📋 Nginx management commands:"
echo "   Test config:    sudo nginx -t"
echo "   Reload config:  sudo systemctl reload nginx"
echo "   Restart:        sudo systemctl restart nginx"
echo "   Status:         sudo systemctl status nginx"
echo "   View logs:      sudo tail -f /var/log/nginx/shipits-forum.access.log"
echo "   Error logs:     sudo tail -f /var/log/nginx/shipits-forum.error.log"
echo ""
echo "🔒 For SSL/HTTPS setup:"
echo "   1. Get a domain name and point it to this server"
echo "   2. Update server_name in /etc/nginx/sites-available/shipits-forum"
echo "   3. Run: sudo certbot --nginx -d your-domain.com"
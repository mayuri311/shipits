#!/bin/bash

echo "🔧 Configuring Nginx reverse proxy for ShipIts Forum..."

# 1) Define your domain and fetch EC2 public IP
SERVER_NAME=shipits.velroi.com
PUBLIC_IP=$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 || echo "")

# 2) Create Nginx configuration
echo "📝 Creating Nginx site configuration..."
sudo tee /etc/nginx/sites-available/shipits-forum > /dev/null <<EOF
# ShipIts Forum Nginx Configuration

# Optional upstream definition for future scaling
upstream shipits_app {
    server 127.0.0.1:3555;
}

server {
    listen 80;
    listen [::]:80;
    server_name \$SERVER_NAME \$PUBLIC_IP;

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
    gzip_proxied expired no-cache no-store private auth;
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
        proxy_pass http://shipits_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Static assets with long cache
    location ~* \.(js|css|png|jpe?g|gif|ico|svg|woff2?|ttf|eot)\$ {
        proxy_pass http://shipits_app;
        expires 1d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Health check
    location /health {
        proxy_pass http://shipits_app/health;
        access_log off;
    }

    # File upload limit
    client_max_body_size 10M;

    # Logs
    access_log /var/log/nginx/shipits-forum.access.log;
    error_log  /var/log/nginx/shipits-forum.error.log;
}

# Redirect www → non-www
server {
    listen 80;
    listen [::]:80;
    server_name www.\$SERVER_NAME;
    return 301 \$scheme://\$SERVER_NAME\$request_uri;
}
EOF

# 3) Backup default site if present
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "📦 Backing up default site..."
    sudo mv /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup
fi

# 4) Enable new site
echo "🔗 Enabling ShipIts Forum site..."
sudo ln -sf /etc/nginx/sites-available/shipits-forum /etc/nginx/sites-enabled/

# 5) Test configuration
echo "🧪 Testing Nginx config..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# 6) Restart & enable Nginx service
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed to start"
    sudo systemctl status nginx
    exit 1
fi

# 7) Final output
echo ""
echo "✅ Setup complete! Access your app at:"
if [ -n "\$PUBLIC_IP" ]; then
    echo "   http://\$PUBLIC_IP"
else
    echo "   http://\$SERVER_NAME"
fi

echo ""
echo "📋 Manage Nginx:"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo "   sudo systemctl restart nginx"
echo "   sudo systemctl status nginx"
echo "   sudo tail -f /var/log/nginx/shipits-forum.*.log"

echo ""
echo "🔒 To add HTTPS later:"
echo "   # 1) Point your DNS at this server"
echo "   # 2) Run:"
echo "   sudo certbot --nginx -d \$SERVER_NAME -d www.\$SERVER_NAME"

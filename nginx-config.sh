#!/bin/bash

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/shipits-forum << EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or EC2 IP

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
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/shipits-forum /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ Nginx configured!"
echo "🌐 Your app will be available at http://your-ec2-ip"
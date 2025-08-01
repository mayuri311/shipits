#!/bin/bash

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
# sudo certbot --nginx -d your-domain.com

echo "🔒 To enable SSL:"
echo "1. Point your domain to this EC2 IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "2. Run: sudo certbot --nginx -d your-domain.com"
echo "3. Certbot will automatically configure HTTPS"
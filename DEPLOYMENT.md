# ShipIts Forum - AWS EC2 Deployment Guide

This guide will help you deploy the ShipIts Forum application to an AWS EC2 instance.

## Prerequisites

- AWS account with EC2 access
- GitHub repository with your code
- MongoDB Atlas cluster (already configured)
- Domain name (optional, but recommended)

## Step 1: Launch EC2 Instance

1. **Launch an EC2 instance:**
   - **AMI:** Ubuntu Server 22.04 LTS
   - **Instance Type:** t3.small or larger (minimum t2.micro for testing)
   - **Security Group:** Allow ports 22 (SSH), 80 (HTTP), and 443 (HTTPS)
   - **Key Pair:** Create or use existing key pair for SSH access

2. **Configure Security Group:**
   ```
   Type            Protocol    Port Range    Source
   SSH             TCP         22           Your IP / 0.0.0.0/0
   HTTP            TCP         80           0.0.0.0/0
   HTTPS           TCP         443          0.0.0.0/0
   Custom TCP      TCP         3555         Your IP (for direct access during setup)
   ```

## Step 2: Connect to EC2 Instance

```bash
# Replace with your key file and EC2 public IP
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## Step 3: Initial Server Setup

Run the server setup script:

```bash
# Download and run the setup script
curl -o setup.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/ec2-setup-updated.sh
chmod +x setup.sh
sudo ./setup.sh
```

## Step 4: Clone and Configure Application

```bash
# Navigate to app directory
cd /var/www/shipits

# Clone your repository (replace with your GitHub repo)
sudo git clone -b thomas-dev-server https://github.com/YOUR_USERNAME/YOUR_REPO.git .
sudo chown -R ubuntu:ubuntu .

# Navigate to shipits directory
cd shipits

# Install server dependencies
npm install

# Install client dependencies and build
cd client
npm install
npm run build
cd ..

# Build server
npm run build
```

## Step 5: Environment Configuration

Create the production environment file:

```bash
# Create .env file with your MongoDB Atlas credentials
sudo nano /var/www/shipits/shipits/.env
```

Add the following content (replace with your actual values):

```env
# Production Environment Variables
NODE_ENV=production
PORT=3555

# MongoDB Atlas connection (replace with your actual URI)
MONGODB_URI=mongodb+srv://shipits_user:gappir-vabzo3-cawBof@shipitsv0.qwh6arp.mongodb.net/shipits-forum?retryWrites=true&w=majority&appName=ShipItsV0

# Session Secret (generate a secure random string)
SESSION_SECRET=your-super-secure-session-secret-for-production

# Azure OpenAI (optional - for AI features)
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_API_KEY=your-api-key
# AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```

## Step 6: Start Application with PM2

```bash
# Start the application
pm2 start dist/index.js --name "shipits-forum" --env production

# Save PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup
# Follow the instructions from the command output

# Check status
pm2 status
pm2 logs shipits-forum
```

## Step 7: Configure Nginx Reverse Proxy

```bash
# Run nginx configuration script
sudo /var/www/shipits/nginx-config-updated.sh
```

## Step 8: SSL Certificate (Recommended)

If you have a domain name, set up SSL with Let's Encrypt:

```bash
# Install Certbot
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# Create symbolic link
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate (replace your-domain.com with your actual domain)
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 9: Database Setup (Optional)

If you need to seed the database with initial data:

```bash
cd /var/www/shipits/shipits
npm run db:seed
```

## Step 10: Firewall Configuration

```bash
# Enable UFW firewall
sudo ufw enable

# Allow necessary ports
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

## Deployment Automation

For easy updates, use the deployment script:

```bash
# Make deployment script executable
chmod +x /var/www/shipits/deploy-updated.sh

# Run deployment (pulls latest code and restarts app)
./deploy-updated.sh
```

## Monitoring and Maintenance

### Check Application Status
```bash
pm2 status
pm2 logs shipits-forum
pm2 monit
```

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t  # Test configuration
```

### Check MongoDB Connection
```bash
cd /var/www/shipits/shipits
node -e "
const { db } = require('./dist/db.js');
db.connect().then(() => console.log('✅ MongoDB connected')).catch(err => console.error('❌ MongoDB error:', err));
"
```

### System Resources
```bash
htop  # Install with: sudo apt install htop
df -h  # Disk usage
free -h  # Memory usage
```

## Troubleshooting

### Common Issues

1. **Port 3555 already in use:**
   ```bash
   pm2 stop all
   pm2 delete all
   sudo lsof -ti:3555 | xargs sudo kill -9
   ```

2. **Permission denied errors:**
   ```bash
   sudo chown -R ubuntu:ubuntu /var/www/shipits
   ```

3. **MongoDB connection issues:**
   - Check your MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)
   - Verify connection string in .env file
   - Check network connectivity: `curl -I https://www.mongodb.com`

4. **Nginx configuration errors:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Application not starting:**
   ```bash
   cd /var/www/shipits/shipits
   npm run start  # Test direct start
   pm2 logs shipits-forum  # Check PM2 logs
   ```

## Security Considerations

1. **Update packages regularly:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Limit SSH access:**
   - Change default SSH port
   - Use key-based authentication only
   - Configure fail2ban

3. **Environment variables:**
   - Never commit .env files to version control
   - Use strong session secrets
   - Rotate credentials periodically

4. **Database security:**
   - Use MongoDB Atlas network access controls
   - Enable database authentication
   - Regular backups

## Backup Strategy

1. **Code backup:** Stored in GitHub repository
2. **Database backup:** MongoDB Atlas automatic backups
3. **Server configuration:** Document all manual changes
4. **SSL certificates:** Auto-renewal with Certbot

## Performance Optimization

1. **Enable gzip compression in Nginx**
2. **Set up CDN for static assets**
3. **Configure caching headers**
4. **Monitor with PM2 monitoring tools**
5. **Set up log rotation**

---

## Quick Commands Reference

```bash
# Restart application
pm2 restart shipits-forum

# View logs
pm2 logs shipits-forum

# Update and redeploy
cd /var/www/shipits && ./deploy-updated.sh

# Check all services
sudo systemctl status nginx
pm2 status

# Emergency stop
pm2 stop all
sudo systemctl stop nginx
```
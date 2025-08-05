# ShipIts Forum - Dependencies & Requirements

This document lists all system and application dependencies required for deploying the ShipIts Forum.

## System Requirements

### Operating System
- **Ubuntu Server 22.04 LTS** (recommended)
- **Minimum Instance**: t2.micro (1 vCPU, 1 GB RAM) - for testing only
- **Recommended**: t3.small (2 vCPU, 2 GB RAM) or higher for production

### System Packages
```bash
# Core packages installed by ec2-setup.sh
curl
wget
gnupg2
software-properties-common
apt-transport-https
ca-certificates
build-essential
git
htop
```

### Runtime Dependencies
- **Node.js**: 18.x LTS
- **NPM**: Latest (comes with Node.js)
- **PM2**: Latest (process manager)
- **Nginx**: Latest (reverse proxy)

## Application Dependencies

### Server Dependencies (package.json)
The server dependencies are automatically installed via `npm install`. Key dependencies include:

#### Core Framework & Server
```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.3",
  "bcryptjs": "^2.4.3",
  "express-session": "^1.17.3",
  "multer": "^1.4.5-lts.1"
}
```

#### Authentication & Security
```json
{
  "bcryptjs": "^2.4.3",
  "express-session": "^1.17.3",
  "zod": "^3.22.4"
}
```

#### Database & Storage
```json
{
  "mongoose": "^8.0.3",
  "@types/mongoose": "^5.11.97"
}
```

#### Development & Build Tools
```json
{
  "tsx": "^4.7.0",
  "esbuild": "^0.19.11",
  "vite": "^5.0.10",
  "typescript": "^5.3.3"
}
```

#### UI Components (Radix UI)
```json
{
  "@radix-ui/react-accordion": "^1.2.4",
  "@radix-ui/react-alert-dialog": "^1.1.7",
  "@radix-ui/react-avatar": "^1.1.4",
  "@radix-ui/react-dialog": "^1.1.7",
  "@radix-ui/react-dropdown-menu": "^2.1.7"
}
```

### Client Dependencies (client/package.json)
The client dependencies are automatically installed during build process:

#### React & Core Libraries
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.1",
  "@tanstack/react-query": "^5.60.5"
}
```

#### Styling & UI
```json
{
  "tailwindcss": "^3.4.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^0.303.0"
}
```

#### Form Handling
```json
{
  "react-hook-form": "^7.48.2",
  "@hookform/resolvers": "^3.10.0"
}
```

## External Services

### Database
- **MongoDB Atlas** (recommended)
  - Free tier available (M0 cluster)
  - Automatic scaling and backups
  - Global availability
  - Connection string format: `mongodb+srv://username:password@cluster.mongodb.net/database`

### Optional Services
- **Azure OpenAI** (for AI features)
  - GPT-4 deployment
  - API key required
  - Endpoint configuration needed

## Network Requirements

### Ports
- **22**: SSH access
- **80**: HTTP traffic (Nginx)
- **443**: HTTPS traffic (SSL)
- **3555**: Application port (internal)

### Security Groups (AWS)
```
Type            Protocol    Port Range    Source          Description
SSH             TCP         22           Your IP         SSH access
HTTP            TCP         80           0.0.0.0/0       Web traffic
HTTPS           TCP         443          0.0.0.0/0       Secure web traffic
Custom TCP      TCP         3555         Your IP         Direct app access (optional)
```

### Firewall (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Installation Commands

### Automatic Installation
```bash
# Download and run quick deployment
curl -o quick-deploy.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/quick-deploy.sh
chmod +x quick-deploy.sh
./quick-deploy.sh "https://github.com/YOUR_USERNAME/YOUR_REPO.git"
```

### Manual Installation Steps
```bash
# 1. System setup
sudo ./ec2-setup.sh

# 2. Deploy application
./deploy.sh

# 3. Configure Nginx
sudo ./nginx-config.sh

# 4. Set up environment
sudo ./setup-env.sh
```

## Environment Variables

Required environment variables in `/var/www/shipits/shipits/.env`:

```env
# Production Environment
NODE_ENV=production
PORT=3555

# Database (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Security (REQUIRED)
SESSION_SECRET=your-super-secure-random-string-here

# Azure OpenAI (Optional)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```

## Build Dependencies

### Development Dependencies
Only needed during build process (automatically installed):
```json
{
  "@types/node": "^20.10.6",
  "@types/express": "^4.17.21",
  "@types/bcryptjs": "^2.4.6",
  "@types/multer": "^1.4.11",
  "typescript": "^5.3.3",
  "tsx": "^4.7.0"
}
```

### Build Tools
```json
{
  "vite": "^5.0.10",
  "esbuild": "^0.19.11",
  "tailwindcss": "^3.4.0",
  "postcss": "^8.4.32",
  "autoprefixer": "^10.4.16"
}
```

## Verification Commands

After deployment, verify all dependencies are working:

### System Dependencies
```bash
node --version          # Should show v18.x.x
npm --version           # Should show 9.x.x or higher
pm2 --version           # Should show 5.x.x
nginx -v                # Should show nginx version
git --version           # Should show git version
```

### Application Dependencies
```bash
cd /var/www/shipits/shipits
npm list --depth=0      # Show installed packages
pm2 status              # Show PM2 processes
sudo systemctl status nginx  # Show Nginx status
```

### Database Connection
```bash
cd /var/www/shipits/shipits
node -e "import('./dist/db.js').then(({db}) => db.connect().then(() => console.log('✅ Connected')).catch(err => console.error('❌ Error:', err)))"
```

## Troubleshooting Dependencies

### Common Issues

1. **Node.js Version Mismatch**
   ```bash
   # Remove old Node.js and reinstall
   sudo apt remove nodejs npm
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Build Dependencies Missing**
   ```bash
   sudo apt install build-essential
   npm rebuild
   ```

3. **Permission Issues**
   ```bash
   sudo chown -R ubuntu:ubuntu /var/www/shipits
   ```

4. **MongoDB Connection Issues**
   - Check MongoDB Atlas IP whitelist
   - Verify connection string format
   - Test network connectivity: `curl -I https://www.mongodb.com`

### Dependency Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /var/www/shipits/shipits
npm update

# Rebuild client
cd client && npm run build

# Restart application
pm2 restart shipits-forum
```

## Resource Requirements

### Minimum System Requirements
- **CPU**: 1 vCPU
- **RAM**: 1 GB (with swap)
- **Storage**: 8 GB
- **Network**: Basic internet connectivity

### Recommended Production Requirements
- **CPU**: 2+ vCPUs
- **RAM**: 2+ GB
- **Storage**: 20+ GB SSD
- **Network**: High bandwidth for better performance

### MongoDB Atlas Requirements
- **Network**: Outbound HTTPS (443) access
- **IP Whitelist**: Add your server IP or 0.0.0.0/0 for testing
- **Connection Limit**: Free tier supports 100 connections

## License Requirements

All dependencies are using permissive licenses (MIT, Apache 2.0, etc.). No additional licensing fees required for the core dependencies.

---

**Note**: This is a Node.js project, so dependencies are managed through `package.json` files rather than Python's `requirements.txt`. The deployment scripts handle all dependency installation automatically.
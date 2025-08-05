# 🚀 ShipIts Forum - AWS EC2 Deployment

A complete production deployment guide for the ShipIts Forum application on AWS EC2.

## 📋 Quick Start

### Prerequisites
- AWS EC2 instance (Ubuntu 22.04 LTS)
- GitHub repository with your code
- MongoDB Atlas cluster
- SSH access to your server

### One-Command Deployment
```bash
# On your EC2 instance
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/quick-deploy.sh | bash -s "https://github.com/YOUR_USERNAME/YOUR_REPO.git"
```

### Manual Step-by-Step
```bash
# 1. Clone this repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. Run setup scripts
sudo ./ec2-setup.sh        # Install system dependencies
./deploy.sh               # Deploy application
sudo ./nginx-config.sh    # Configure reverse proxy
sudo ./setup-env.sh       # Set up environment variables
```

## 📁 Deployment Files

| File | Purpose | Usage |
|------|---------|-------|
| `DEPLOYMENT.md` | Complete deployment guide | Read first for detailed instructions |
| `DEPENDENCIES.md` | All system and app dependencies | Reference for troubleshooting |
| `quick-deploy.sh` | One-command automated deployment | `./quick-deploy.sh "repo-url"` |
| `ec2-setup.sh` | System setup and dependencies | `sudo ./ec2-setup.sh` |
| `deploy.sh` | Application deployment | `./deploy.sh` |
| `nginx-config.sh` | Web server configuration | `sudo ./nginx-config.sh` |
| `setup-env.sh` | Environment variables setup | `sudo ./setup-env.sh` |
| `troubleshoot.sh` | Diagnose deployment issues | `./troubleshoot.sh` |
| `health-check.sh` | Monitor application health | `./health-check.sh` |

## 🔧 Configuration Required

### 1. Update Repository URL
Edit these files with your actual GitHub repository:
- `deploy.sh` (line 7): `REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"`
- `quick-deploy.sh` (line 13): Same URL

### 2. MongoDB Atlas Setup
After deployment, edit `/var/www/shipits/shipits/.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### 3. Security Configuration
- Generate strong session secret
- Configure MongoDB Atlas IP whitelist
- Set up SSL certificate (optional but recommended)

## 🌐 Access Your Application

After successful deployment:
- **Web Interface**: `http://YOUR-EC2-IP`
- **Direct Access**: `http://YOUR-EC2-IP:3555`
- **HTTPS** (after SSL setup): `https://your-domain.com`

## 📊 Monitoring & Management

### Check Status
```bash
pm2 status                    # Application status
sudo systemctl status nginx  # Web server status
./health-check.sh            # Complete health check
```

### View Logs
```bash
pm2 logs shipits-forum       # Application logs
sudo tail -f /var/log/nginx/access.log  # Web server logs
```

### Update Deployment
```bash
./deploy.sh                   # Pull latest code and restart
```

### Troubleshooting
```bash
./troubleshoot.sh            # Comprehensive diagnostics
```

## 🔒 Security Best Practices

1. **Firewall**: Only open necessary ports (22, 80, 443)
2. **SSL/TLS**: Use Let's Encrypt for HTTPS
3. **Environment**: Keep `.env` file secure (600 permissions)
4. **Updates**: Regular system and dependency updates
5. **Monitoring**: Set up automated health checks

## 📈 Performance Optimization

1. **Instance Size**: Use t3.small or larger for production
2. **Database**: MongoDB Atlas with appropriate tier
3. **CDN**: Consider CloudFront for static assets
4. **Monitoring**: Set up CloudWatch or similar
5. **Backups**: Regular database and code backups

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Port 3555 in use | `pm2 stop all && pm2 delete all` |
| MongoDB connection failed | Check Atlas IP whitelist and credentials |
| Nginx not starting | `sudo nginx -t` to check configuration |
| Build failures | Check Node.js version and dependencies |
| Permission errors | `sudo chown -R ubuntu:ubuntu /var/www/shipits` |

## 📞 Support

- **Troubleshooting**: Run `./troubleshoot.sh`
- **Health Check**: Run `./health-check.sh`
- **Logs**: `pm2 logs shipits-forum`
- **Documentation**: See `DEPLOYMENT.md` for detailed guide

## 📝 Notes

- This is a Node.js project (dependencies in `package.json`, not `requirements.txt`)
- All scripts are designed for Ubuntu 22.04 LTS
- MongoDB Atlas is recommended over local MongoDB
- PM2 handles process management and auto-restart
- Nginx provides reverse proxy and static file serving

---

**⚠️ Important**: Update the GitHub repository URLs in the deployment scripts before using!
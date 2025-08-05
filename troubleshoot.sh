#!/bin/bash

# Troubleshooting script for ShipIts Forum deployment
# Run this script to diagnose common issues

echo "🔍 ShipIts Forum - Troubleshooting Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# System Information
echo "📊 System Information"
echo "===================="
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "Uptime: $(uptime -p)"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2 " (" $4 " free)"}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $4 " free)"}')"
echo ""

# Check System Dependencies
echo "🔧 System Dependencies"
echo "====================="

deps=("node" "npm" "pm2" "nginx" "git" "curl")
for dep in "${deps[@]}"; do
    if command -v $dep >/dev/null 2>&1; then
        version=$(eval "$dep --version 2>/dev/null | head -1" || echo "unknown")
        print_status "$dep: $version"
    else
        print_error "$dep: Not installed"
    fi
done
echo ""

# Check Node.js Version
echo "📦 Node.js Environment"
echo "====================="
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    if [[ $NODE_VERSION == v18* ]]; then
        print_status "Node.js version is correct: $NODE_VERSION"
    else
        print_warning "Node.js version may be outdated: $NODE_VERSION (recommended: v18.x)"
    fi
    
    echo "NPM version: $(npm --version)"
    echo "NPM global packages:"
    npm list -g --depth=0 2>/dev/null | grep -E "(pm2|typescript|tsx)" || echo "  No relevant global packages found"
else
    print_error "Node.js is not installed"
fi
echo ""

# Check Application Directory
echo "📁 Application Directory"
echo "======================="
APP_DIR="/var/www/shipits"
if [ -d "$APP_DIR" ]; then
    print_status "Application directory exists: $APP_DIR"
    
    if [ -d "$APP_DIR/.git" ]; then
        print_status "Git repository found"
        cd $APP_DIR
        echo "Current branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
        echo "Last commit: $(git log -1 --oneline 2>/dev/null || echo 'unknown')"
    else
        print_warning "No Git repository found in $APP_DIR"
    fi
    
    if [ -d "$APP_DIR/shipits" ]; then
        print_status "ShipIts subdirectory found"
        
        # Check package.json
        if [ -f "$APP_DIR/shipits/package.json" ]; then
            print_status "Server package.json found"
        else
            print_error "Server package.json missing"
        fi
        
        # Check client directory
        if [ -d "$APP_DIR/shipits/client" ]; then
            print_status "Client directory found"
            if [ -f "$APP_DIR/shipits/client/package.json" ]; then
                print_status "Client package.json found"
            else
                print_error "Client package.json missing"
            fi
        else
            print_error "Client directory missing"
        fi
        
        # Check build directory
        if [ -d "$APP_DIR/shipits/dist" ]; then
            print_status "Server build directory found"
            if [ -f "$APP_DIR/shipits/dist/index.js" ]; then
                print_status "Server build file found"
            else
                print_error "Server build file missing"
            fi
        else
            print_error "Server build directory missing"
        fi
        
        # Check client build
        if [ -d "$APP_DIR/shipits/client/dist" ]; then
            print_status "Client build directory found"
        else
            print_warning "Client build directory missing"
        fi
        
    else
        print_error "ShipIts subdirectory missing"
    fi
else
    print_error "Application directory does not exist: $APP_DIR"
fi
echo ""

# Check Environment Variables
echo "🔐 Environment Configuration"
echo "==========================="
ENV_FILE="/var/www/shipits/shipits/.env"
if [ -f "$ENV_FILE" ]; then
    print_status ".env file exists"
    
    # Check required variables (without revealing values)
    required_vars=("NODE_ENV" "PORT" "MONGODB_URI" "SESSION_SECRET")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" "$ENV_FILE" 2>/dev/null; then
            print_status "$var is set"
        else
            print_error "$var is missing"
        fi
    done
    
    # Check file permissions
    PERMS=$(stat -c "%a" "$ENV_FILE" 2>/dev/null)
    if [ "$PERMS" = "600" ]; then
        print_status ".env file has correct permissions (600)"
    else
        print_warning ".env file permissions: $PERMS (recommended: 600)"
    fi
else
    print_error ".env file does not exist"
fi
echo ""

# Check PM2 Status
echo "🔄 PM2 Process Manager"
echo "====================="
if command -v pm2 >/dev/null 2>&1; then
    print_status "PM2 is installed"
    
    if pm2 list | grep -q "shipits-forum"; then
        print_status "ShipIts Forum process found in PM2"
        echo ""
        pm2 status
        echo ""
        print_info "Recent logs:"
        pm2 logs shipits-forum --lines 5 --nostream 2>/dev/null || echo "No logs available"
    else
        print_error "ShipIts Forum process not found in PM2"
        echo "Current PM2 processes:"
        pm2 list
    fi
else
    print_error "PM2 is not installed"
fi
echo ""

# Check Nginx Status
echo "🌐 Nginx Web Server"
echo "=================="
if command -v nginx >/dev/null 2>&1; then
    print_status "Nginx is installed: $(nginx -v 2>&1)"
    
    if sudo systemctl is-active --quiet nginx; then
        print_status "Nginx is running"
        
        # Check configuration
        if sudo nginx -t >/dev/null 2>&1; then
            print_status "Nginx configuration is valid"
        else
            print_error "Nginx configuration has errors"
            echo "Configuration test output:"
            sudo nginx -t
        fi
        
        # Check if our site is enabled
        if [ -f "/etc/nginx/sites-enabled/shipits-forum" ]; then
            print_status "ShipIts Forum site is enabled"
        else
            print_warning "ShipIts Forum site is not enabled"
        fi
        
    else
        print_error "Nginx is not running"
        echo "Nginx status:"
        sudo systemctl status nginx --no-pager -l
    fi
else
    print_error "Nginx is not installed"
fi
echo ""

# Check Network Connectivity
echo "🌍 Network Connectivity"
echo "======================"

# Check internet connectivity
if curl -s --max-time 5 http://www.google.com >/dev/null; then
    print_status "Internet connectivity: OK"
else
    print_error "Internet connectivity: Failed"
fi

# Check MongoDB connectivity
print_info "Testing MongoDB connectivity..."
if [ -f "/var/www/shipits/shipits/.env" ]; then
    cd /var/www/shipits/shipits 2>/dev/null
    if [ -f "dist/db.js" ]; then
        timeout 10 node -e "
        import('./dist/db.js').then(({ db }) => 
          db.connect()
            .then(() => { console.log('✅ MongoDB connection: OK'); process.exit(0); })
            .catch(err => { console.error('❌ MongoDB connection: Failed -', err.message); process.exit(1); })
        ).catch(err => { console.error('❌ Import error:', err.message); process.exit(1); })
        " && print_status "MongoDB connection test passed" || print_error "MongoDB connection test failed"
    else
        print_warning "Cannot test MongoDB - server build missing"
    fi
else
    print_warning "Cannot test MongoDB - .env file missing"
fi

# Check local application port
if netstat -tlnp 2>/dev/null | grep -q ":3555"; then
    print_status "Application port 3555 is listening"
else
    print_error "Application port 3555 is not listening"
fi

# Check HTTP access
print_info "Testing HTTP access..."
if curl -s --max-time 5 http://localhost >/dev/null; then
    print_status "HTTP access (port 80): OK"
else
    print_error "HTTP access (port 80): Failed"
fi

if curl -s --max-time 5 http://localhost:3555 >/dev/null; then
    print_status "Direct app access (port 3555): OK"
else
    print_error "Direct app access (port 3555): Failed"
fi
echo ""

# Disk Space Check
echo "💾 Disk Space"
echo "============"
df -h | grep -E "(Filesystem|/dev/)" | head -2
echo ""

DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    print_error "Disk usage is high: ${DISK_USAGE}%"
elif [ "$DISK_USAGE" -gt 80 ]; then
    print_warning "Disk usage is moderate: ${DISK_USAGE}%"
else
    print_status "Disk usage is normal: ${DISK_USAGE}%"
fi
echo ""

# Memory Check
echo "🧠 Memory Usage"
echo "=============="
free -h
echo ""

MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", ($3/$2)*100}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    print_error "Memory usage is high: ${MEMORY_USAGE}%"
elif [ "$MEMORY_USAGE" -gt 80 ]; then
    print_warning "Memory usage is moderate: ${MEMORY_USAGE}%"
else
    print_status "Memory usage is normal: ${MEMORY_USAGE}%"
fi
echo ""

# Firewall Status
echo "🔒 Firewall Status"
echo "================="
if command -v ufw >/dev/null 2>&1; then
    UFW_STATUS=$(sudo ufw status | head -1)
    echo "$UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        print_status "UFW firewall is active"
        echo "Open ports:"
        sudo ufw status | grep ALLOW || echo "No explicit allow rules found"
    else
        print_warning "UFW firewall is inactive"
    fi
else
    print_warning "UFW firewall not installed"
fi
echo ""

# Quick Fix Suggestions
echo "🔧 Quick Fix Suggestions"
echo "======================="

if ! command -v node >/dev/null 2>&1; then
    echo "• Install Node.js: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
fi

if ! pm2 list | grep -q "shipits-forum"; then
    echo "• Start application: cd /var/www/shipits/shipits && pm2 start dist/index.js --name shipits-forum"
fi

if ! sudo systemctl is-active --quiet nginx; then
    echo "• Start Nginx: sudo systemctl start nginx"
fi

if [ ! -f "/var/www/shipits/shipits/.env" ]; then
    echo "• Create .env file: sudo /var/www/shipits/setup-env.sh"
fi

if [ ! -f "/var/www/shipits/shipits/dist/index.js" ]; then
    echo "• Build application: cd /var/www/shipits/shipits && npm run build"
fi

echo ""
echo "📋 For more help, check:"
echo "• Application logs: pm2 logs shipits-forum"
echo "• Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "• System logs: sudo journalctl -f"
echo "• Restart everything: ./deploy.sh"
echo ""
print_info "Troubleshooting complete!"
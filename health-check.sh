#!/bin/bash

# Health check script for ShipIts Forum
# Use this for monitoring and automated health checks

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Exit codes
EXIT_OK=0
EXIT_WARNING=1
EXIT_CRITICAL=2

# Configuration
APP_NAME="shipits-forum"
APP_PORT=3555
TIMEOUT=10

# Health check results
HEALTH_STATUS="OK"
WARNINGS=()
ERRORS=()

print_status() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; WARNINGS+=("$1"); }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; ERRORS+=("$1"); HEALTH_STATUS="CRITICAL"; }

echo "🏥 ShipIts Forum Health Check"
echo "=============================="
echo "$(date)"
echo ""

# Check 1: PM2 Process
echo "Checking PM2 process..."
if pm2 list | grep -q "$APP_NAME.*online"; then
    print_status "PM2 process is running"
    
    # Get process details
    PM2_INFO=$(pm2 show $APP_NAME 2>/dev/null)
    if echo "$PM2_INFO" | grep -q "status.*online"; then
        CPU_USAGE=$(echo "$PM2_INFO" | grep "cpu:" | awk '{print $2}' | sed 's/%//')
        MEMORY_USAGE=$(echo "$PM2_INFO" | grep "memory:" | awk '{print $2}')
        UPTIME=$(echo "$PM2_INFO" | grep "uptime:" | awk '{print $2}')
        RESTARTS=$(echo "$PM2_INFO" | grep "restarts:" | awk '{print $2}')
        
        echo "  CPU: ${CPU_USAGE}%"
        echo "  Memory: ${MEMORY_USAGE}"
        echo "  Uptime: ${UPTIME}"
        echo "  Restarts: ${RESTARTS}"
        
        # Check for excessive restarts
        if [ "$RESTARTS" -gt 5 ]; then
            print_warning "High restart count: $RESTARTS"
        fi
    fi
else
    print_error "PM2 process is not running or not found"
fi
echo ""

# Check 2: Application Port
echo "Checking application port..."
if netstat -tlnp 2>/dev/null | grep -q ":$APP_PORT.*LISTEN"; then
    print_status "Application is listening on port $APP_PORT"
else
    print_error "Application is not listening on port $APP_PORT"
fi
echo ""

# Check 3: HTTP Response
echo "Checking HTTP response..."
HTTP_STATUS=$(timeout $TIMEOUT curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT 2>/dev/null)
if [ "$HTTP_STATUS" = "200" ]; then
    print_status "HTTP response: $HTTP_STATUS (OK)"
elif [ "$HTTP_STATUS" = "000" ]; then
    print_error "HTTP request failed (connection refused or timeout)"
else
    print_warning "HTTP response: $HTTP_STATUS (unexpected)"
fi

# Check response time
RESPONSE_TIME=$(timeout $TIMEOUT curl -s -o /dev/null -w "%{time_total}" http://localhost:$APP_PORT 2>/dev/null)
if [ "$RESPONSE_TIME" != "" ]; then
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "unknown")
    if [ "$RESPONSE_MS" != "unknown" ]; then
        if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
            print_warning "Slow response time: ${RESPONSE_MS}ms"
        else
            print_status "Response time: ${RESPONSE_MS}ms"
        fi
    fi
fi
echo ""

# Check 4: Nginx Status
echo "Checking Nginx..."
if sudo systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
    
    # Check Nginx HTTP response
    NGINX_STATUS=$(timeout $TIMEOUT curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null)
    if [ "$NGINX_STATUS" = "200" ]; then
        print_status "Nginx HTTP response: $NGINX_STATUS (OK)"
    else
        print_warning "Nginx HTTP response: $NGINX_STATUS"
    fi
else
    print_error "Nginx is not running"
fi
echo ""

# Check 5: Database Connection
echo "Checking database connection..."
if [ -f "/var/www/shipits/shipits/.env" ] && [ -f "/var/www/shipits/shipits/dist/db.js" ]; then
    cd /var/www/shipits/shipits 2>/dev/null
    DB_CHECK=$(timeout $TIMEOUT node -e "
    import('./dist/db.js').then(({ db }) => 
      db.connect()
        .then(() => { console.log('connected'); process.exit(0); })
        .catch(err => { console.log('failed'); process.exit(1); })
    ).catch(err => { console.log('error'); process.exit(1); })
    " 2>/dev/null)
    
    if [ "$DB_CHECK" = "connected" ]; then
        print_status "Database connection successful"
    else
        print_error "Database connection failed"
    fi
else
    print_warning "Cannot test database connection (missing files)"
fi
echo ""

# Check 6: System Resources
echo "Checking system resources..."

# Memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", ($3/$2)*100}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    print_error "High memory usage: ${MEMORY_USAGE}%"
elif [ "$MEMORY_USAGE" -gt 80 ]; then
    print_warning "Moderate memory usage: ${MEMORY_USAGE}%"
else
    print_status "Memory usage: ${MEMORY_USAGE}%"
fi

# Disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    print_error "High disk usage: ${DISK_USAGE}%"
elif [ "$DISK_USAGE" -gt 80 ]; then
    print_warning "Moderate disk usage: ${DISK_USAGE}%"
else
    print_status "Disk usage: ${DISK_USAGE}%"
fi

# Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
LOAD_THRESHOLD="2.0"
if (( $(echo "$LOAD_AVG > $LOAD_THRESHOLD" | bc -l 2>/dev/null || echo 0) )); then
    print_warning "High load average: $LOAD_AVG"
else
    print_status "Load average: $LOAD_AVG"
fi
echo ""

# Check 7: Log Errors
echo "Checking recent errors..."
if pm2 list | grep -q "$APP_NAME"; then
    ERROR_COUNT=$(pm2 logs $APP_NAME --lines 50 --nostream 2>/dev/null | grep -i error | wc -l)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        print_warning "Found $ERROR_COUNT error(s) in recent logs"
        echo "Recent errors:"
        pm2 logs $APP_NAME --lines 50 --nostream 2>/dev/null | grep -i error | tail -3
    else
        print_status "No recent errors in application logs"
    fi
else
    print_warning "Cannot check application logs (PM2 process not found)"
fi
echo ""

# Summary
echo "================="
echo "HEALTH SUMMARY"
echo "================="

if [ "$HEALTH_STATUS" = "CRITICAL" ]; then
    echo -e "${RED}CRITICAL${NC} - Service has critical issues"
    EXIT_CODE=$EXIT_CRITICAL
elif [ ${#WARNINGS[@]} -gt 0 ]; then
    echo -e "${YELLOW}WARNING${NC} - Service has warnings"
    HEALTH_STATUS="WARNING"
    EXIT_CODE=$EXIT_WARNING
else
    echo -e "${GREEN}OK${NC} - Service is healthy"
    EXIT_CODE=$EXIT_OK
fi

echo ""
echo "Status: $HEALTH_STATUS"
echo "Timestamp: $(date)"

if [ ${#ERRORS[@]} -gt 0 ]; then
    echo ""
    echo "Errors:"
    for error in "${ERRORS[@]}"; do
        echo "  • $error"
    done
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "Warnings:"
    for warning in "${WARNINGS[@]}"; do
        echo "  • $warning"
    done
fi

echo ""
echo "Quick actions:"
echo "• View logs: pm2 logs $APP_NAME"
echo "• Restart app: pm2 restart $APP_NAME"
echo "• Full troubleshoot: ./troubleshoot.sh"
echo "• Redeploy: ./deploy.sh"

# For monitoring integration
if [ "$1" = "--json" ]; then
    echo ""
    echo '{'
    echo "  \"status\": \"$HEALTH_STATUS\","
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"errors\": ${#ERRORS[@]},"
    echo "  \"warnings\": ${#WARNINGS[@]},"
    echo "  \"http_status\": \"$HTTP_STATUS\","
    echo "  \"memory_usage\": $MEMORY_USAGE,"
    echo "  \"disk_usage\": $DISK_USAGE,"
    echo "  \"load_average\": \"$LOAD_AVG\""
    echo '}'
fi

exit $EXIT_CODE
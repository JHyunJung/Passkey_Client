#!/bin/sh
# ============================================================================
# Health Check Script for Passkey Client Container
# ============================================================================

# Check if nginx is running
if ! pgrep nginx > /dev/null 2>&1; then
    echo "nginx is not running"
    exit 1
fi

# Check if the application responds
if ! wget --quiet --tries=1 --spider http://localhost/health 2>&1; then
    echo "Application health check failed"
    exit 1
fi

echo "Health check passed"
exit 0

#!/bin/bash

################################################################################
# FIDO2 Passkey Client - RHEL 8.1 Deployment Script
#
# This script automates the deployment of the Passkey Client on RHEL 8.1
# with nginx reverse proxy configuration.
#
# Requirements:
#   - RHEL 8.1
#   - Node.js 18+ installed
#   - nginx installed
#   - sudo privileges
#
# Usage:
#   sudo ./deploy-rhel.sh
#
# Author: CROSSCERT
# Date: 2026-01-30
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="passkey-client"
APP_USER="passkey"
APP_GROUP="passkey"
APP_DIR="/opt/passkey-client"
REPO_URL="https://github.com/JHyunJung/Passkey_Client.git"
NGINX_CONF="/etc/nginx/conf.d/passkey-client.conf"
SYSTEMD_SERVICE="/etc/systemd/system/passkey-client.service"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  🔐 FIDO2 Passkey Client - RHEL 8.1 Deployment       ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_step() {
    echo ""
    echo -e "${BLUE}═══${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
    print_success "Running as root"
}

# Check RHEL version
check_rhel_version() {
    if [[ ! -f /etc/redhat-release ]]; then
        print_error "This script is designed for RHEL 8.1"
        exit 1
    fi

    RHEL_VERSION=$(cat /etc/redhat-release)
    print_info "Detected: $RHEL_VERSION"

    if [[ ! "$RHEL_VERSION" =~ "Red Hat Enterprise Linux" ]]; then
        print_warning "This script is optimized for RHEL 8.1, but will attempt to continue"
    fi
}

# Install required packages
install_dependencies() {
    print_step "Installing system dependencies"

    # Update package manager
    print_info "Updating package manager..."
    yum update -y >/dev/null 2>&1 || print_warning "Failed to update packages"

    # Install nginx if not installed
    if ! command -v nginx &> /dev/null; then
        print_info "Installing nginx..."
        yum install -y nginx
        print_success "nginx installed"
    else
        print_success "nginx already installed"
    fi

    # Install git if not installed
    if ! command -v git &> /dev/null; then
        print_info "Installing git..."
        yum install -y git
        print_success "git installed"
    else
        print_success "git already installed"
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        print_info "You can install it using: curl -fsSL https://rpm.nodesource.com/setup_18.x | bash - && yum install -y nodejs"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    print_success "Node.js version: $(node -v)"
}

# Create application user
create_app_user() {
    print_step "Creating application user"

    if id "$APP_USER" &>/dev/null; then
        print_success "User '$APP_USER' already exists"
    else
        useradd -r -s /bin/bash -d "$APP_DIR" -m "$APP_USER"
        print_success "User '$APP_USER' created"
    fi
}

# Deploy application
deploy_application() {
    print_step "Deploying application"

    # Create application directory
    mkdir -p "$APP_DIR"

    # Clone or update repository
    if [ -d "$APP_DIR/.git" ]; then
        print_info "Updating existing repository..."
        cd "$APP_DIR"
        sudo -u "$APP_USER" git pull
    else
        print_info "Cloning repository..."
        rm -rf "$APP_DIR"
        sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi

    print_success "Repository deployed"

    # Install dependencies
    print_info "Installing npm dependencies..."
    sudo -u "$APP_USER" npm install
    print_success "Dependencies installed"

    # Build application (optional for QA mode)
    # print_info "Building application..."
    # sudo -u "$APP_USER" npm run build:qa
    # print_success "Build completed"

    # Set proper permissions
    chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
    print_success "Permissions set"
}

# Configure nginx
configure_nginx() {
    print_step "Configuring nginx"

    # Copy nginx configuration
    cp "$APP_DIR/deploy/nginx/passkey-client.conf" "$NGINX_CONF"
    print_success "nginx configuration copied"

    # Test nginx configuration
    print_info "Testing nginx configuration..."
    if nginx -t >/dev/null 2>&1; then
        print_success "nginx configuration is valid"
    else
        print_error "nginx configuration test failed"
        nginx -t
        exit 1
    fi

    # Enable and start nginx
    systemctl enable nginx
    systemctl restart nginx
    print_success "nginx restarted"
}

# Configure systemd service
configure_systemd() {
    print_step "Configuring systemd service"

    # Copy systemd service file
    cp "$APP_DIR/deploy/systemd/passkey-client.service" "$SYSTEMD_SERVICE"
    print_success "systemd service file copied"

    # Reload systemd
    systemctl daemon-reload
    print_success "systemd reloaded"

    # Enable and start service
    systemctl enable passkey-client
    systemctl restart passkey-client
    print_success "Service enabled and started"

    # Wait for service to start
    sleep 5

    # Check service status
    if systemctl is-active --quiet passkey-client; then
        print_success "Service is running"
    else
        print_error "Service failed to start"
        systemctl status passkey-client
        exit 1
    fi
}

# Configure firewall
configure_firewall() {
    print_step "Configuring firewall"

    if command -v firewall-cmd &> /dev/null; then
        print_info "Opening ports in firewall..."
        firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true
        firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
        firewall-cmd --reload >/dev/null 2>&1 || true
        print_success "Firewall configured"
    else
        print_warning "firewalld not found, skipping firewall configuration"
    fi
}

# Configure SELinux
configure_selinux() {
    print_step "Configuring SELinux"

    if command -v getenforce &> /dev/null; then
        SELINUX_STATUS=$(getenforce)
        print_info "SELinux status: $SELINUX_STATUS"

        if [ "$SELINUX_STATUS" != "Disabled" ]; then
            print_info "Setting SELinux contexts..."
            semanage fcontext -a -t httpd_sys_content_t "$APP_DIR(/.*)?" >/dev/null 2>&1 || true
            restorecon -R "$APP_DIR" >/dev/null 2>&1 || true
            setsebool -P httpd_can_network_connect 1 >/dev/null 2>&1 || true
            print_success "SELinux configured"
        fi
    else
        print_warning "SELinux not found, skipping SELinux configuration"
    fi
}

# Display deployment summary
deployment_summary() {
    print_step "Deployment Summary"

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}              Deployment Completed Successfully!         ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Application Details:${NC}"
    echo -e "  URL:        ${GREEN}https://passkey.crosscert.com/client${NC}"
    echo -e "  Local Port: ${GREEN}8003${NC}"
    echo -e "  API Server: ${GREEN}https://localhost:8005${NC}"
    echo ""
    echo -e "${BLUE}Service Management:${NC}"
    echo -e "  Status:  ${GREEN}sudo systemctl status passkey-client${NC}"
    echo -e "  Logs:    ${GREEN}sudo journalctl -u passkey-client -f${NC}"
    echo -e "  Restart: ${GREEN}sudo systemctl restart passkey-client${NC}"
    echo ""
    echo -e "${BLUE}nginx Management:${NC}"
    echo -e "  Status:  ${GREEN}sudo systemctl status nginx${NC}"
    echo -e "  Reload:  ${GREEN}sudo systemctl reload nginx${NC}"
    echo -e "  Logs:    ${GREEN}sudo tail -f /var/log/nginx/passkey-client-*.log${NC}"
    echo ""
    echo -e "${YELLOW}⚠ Important:${NC}"
    echo -e "  1. Update SSL certificate paths in: ${BLUE}$NGINX_CONF${NC}"
    echo -e "  2. Ensure port 8005 has the FIDO2 server running"
    echo -e "  3. Verify DNS points to this server for passkey.crosscert.com"
    echo ""
}

################################################################################
# Main Execution
################################################################################

print_header

# Pre-flight checks
print_step "Pre-flight checks"
check_root
check_rhel_version

# Installation steps
install_dependencies
create_app_user
deploy_application
configure_nginx
configure_systemd
configure_firewall
configure_selinux

# Summary
deployment_summary

exit 0

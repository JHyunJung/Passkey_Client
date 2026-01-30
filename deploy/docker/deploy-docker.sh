#!/bin/bash

################################################################################
# FIDO2 Passkey Client - Docker Deployment Script
#
# This script automates Docker deployment of the Passkey Client
#
# Requirements:
#   - Docker installed
#   - docker-compose installed
#   - SSL certificates in deploy/docker/ssl/
#
# Usage:
#   ./deploy-docker.sh [start|stop|restart|logs|build|status]
#
# Author: CROSSCERT
# Date: 2026-01-30
################################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="passkey-client"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  🐳 FIDO2 Passkey Client - Docker Deployment         ${BLUE}║${NC}"
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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        echo "Install from: https://docs.docker.com/engine/install/"
        exit 1
    fi
    print_success "Docker installed: $(docker --version)"
}

# Check if docker-compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed"
        echo "Install from: https://docs.docker.com/compose/install/"
        exit 1
    fi
    print_success "docker-compose installed: $(docker-compose --version)"
}

# Check SSL certificates
check_ssl_certificates() {
    SSL_DIR="deploy/docker/ssl"

    if [ ! -d "$SSL_DIR" ]; then
        print_warning "SSL directory not found: $SSL_DIR"
        print_info "Creating SSL directory..."
        mkdir -p "$SSL_DIR"
    fi

    if [ ! -f "$SSL_DIR/passkey.crosscert.com.crt" ] || [ ! -f "$SSL_DIR/passkey.crosscert.com.key" ]; then
        print_warning "SSL certificates not found in $SSL_DIR"
        print_info "Please add your SSL certificates:"
        echo "  - $SSL_DIR/passkey.crosscert.com.crt"
        echo "  - $SSL_DIR/passkey.crosscert.com.key"
        echo ""
        print_info "For testing, you can generate self-signed certificates:"
        echo "  cd $SSL_DIR"
        echo "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
        echo "    -keyout passkey.crosscert.com.key \\"
        echo "    -out passkey.crosscert.com.crt \\"
        echo "    -subj '/CN=passkey.crosscert.com'"
        echo ""
    else
        print_success "SSL certificates found"
    fi
}

# Build Docker images
build_images() {
    print_info "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build
    print_success "Images built successfully"
}

# Start containers
start_containers() {
    print_info "Starting containers..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d
    print_success "Containers started"

    # Wait for health checks
    print_info "Waiting for containers to be healthy..."
    sleep 5

    # Show status
    show_status
}

# Stop containers
stop_containers() {
    print_info "Stopping containers..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    print_success "Containers stopped"
}

# Restart containers
restart_containers() {
    print_info "Restarting containers..."
    stop_containers
    start_containers
}

# Show logs
show_logs() {
    print_info "Showing logs (Ctrl+C to exit)..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f
}

# Show status
show_status() {
    print_info "Container status:"
    echo ""
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    echo ""

    # Check if containers are healthy
    if docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps | grep -q "Up (healthy)"; then
        print_success "All containers are healthy"
    else
        print_warning "Some containers may not be healthy yet"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start       Build and start containers"
    echo "  stop        Stop and remove containers"
    echo "  restart     Restart containers"
    echo "  build       Build Docker images"
    echo "  logs        Show container logs"
    echo "  status      Show container status"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start     # Start the application"
    echo "  $0 logs      # View logs"
    echo "  $0 restart   # Restart services"
}

################################################################################
# Main
################################################################################

print_header

# Parse command
COMMAND="${1:-help}"

case "$COMMAND" in
    start)
        check_docker
        check_docker_compose
        check_ssl_certificates
        build_images
        start_containers

        echo ""
        print_success "Deployment completed!"
        echo ""
        echo -e "${BLUE}Access the application:${NC}"
        echo -e "  HTTP:  ${GREEN}http://passkey.crosscert.com/client${NC}"
        echo -e "  HTTPS: ${GREEN}https://passkey.crosscert.com/client${NC}"
        echo ""
        echo -e "${BLUE}Management commands:${NC}"
        echo -e "  Status: ${GREEN}$0 status${NC}"
        echo -e "  Logs:   ${GREEN}$0 logs${NC}"
        echo -e "  Stop:   ${GREEN}$0 stop${NC}"
        echo ""
        ;;

    stop)
        check_docker
        check_docker_compose
        stop_containers
        ;;

    restart)
        check_docker
        check_docker_compose
        restart_containers
        ;;

    build)
        check_docker
        check_docker_compose
        build_images
        ;;

    logs)
        check_docker
        check_docker_compose
        show_logs
        ;;

    status)
        check_docker
        check_docker_compose
        show_status
        ;;

    help|--help|-h)
        usage
        ;;

    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        usage
        exit 1
        ;;
esac

exit 0

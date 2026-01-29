#!/bin/bash

###############################################################################
# FIDO2/Passkey Client - Development Server Startup Script
#
# This script starts the development server with proper environment setup
# and health checks.
#
# Usage:
#   ./start.sh           # Start development server (default)
#   ./start.sh qa        # Start QA environment
#   ./start.sh prod      # Build and preview production
#
# Author: CROSSCERT
# Date: 2026-01-30
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

###############################################################################
# Functions
###############################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  🔐 FIDO2/Passkey Client - Startup Script            ${BLUE}║${NC}"
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

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi

    print_success "Node.js version: $(node -v)"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    print_success "npm version: $(npm -v)"
}

# Check if node_modules exists
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found. Installing dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_success "Dependencies found"
    fi
}

# Run linting
run_lint() {
    print_info "Running ESLint..."
    if npm run lint; then
        print_success "Code quality check passed"
    else
        print_error "ESLint found issues. Run 'npm run lint:fix' to auto-fix."
        exit 1
    fi
}

# Run type checking
run_type_check() {
    print_info "Running TypeScript type check..."
    if npm run type-check; then
        print_success "Type check passed"
    else
        print_error "TypeScript type check failed"
        exit 1
    fi
}

# Start development server
start_dev() {
    print_info "Starting development server..."
    echo ""
    print_success "Server will be available at: ${GREEN}http://localhost:5173${NC}"
    print_info "Press Ctrl+C to stop the server"
    echo ""
    npm run dev
}

# Start QA server
start_qa() {
    print_info "Starting QA environment..."
    echo ""
    print_success "Server will be available at: ${GREEN}http://localhost:8003${NC}"
    print_info "Press Ctrl+C to stop the server"
    echo ""
    npm run dev:qa
}

# Build and preview production
start_prod() {
    print_info "Building production version..."
    npm run build
    print_success "Build completed"
    echo ""
    print_info "Starting preview server..."
    print_success "Server will be available at: ${GREEN}http://localhost:4173${NC}"
    print_info "Press Ctrl+C to stop the server"
    echo ""
    npm run preview
}

# Display usage
usage() {
    echo "Usage: $0 [mode] [options]"
    echo ""
    echo "Modes:"
    echo "  (none)      Start development server (default)"
    echo "  qa          Start QA environment"
    echo "  prod        Build and preview production version"
    echo ""
    echo "Options:"
    echo "  --skip-checks    Skip lint and type checking"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Start dev server"
    echo "  $0 qa                 # Start QA server"
    echo "  $0 prod               # Build and preview prod"
    echo "  $0 --skip-checks      # Start without checks"
}

###############################################################################
# Main
###############################################################################

print_header

# Parse arguments
MODE="dev"
SKIP_CHECKS=false

for arg in "$@"; do
    case $arg in
        qa)
            MODE="qa"
            ;;
        prod)
            MODE="prod"
            ;;
        --skip-checks)
            SKIP_CHECKS=true
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown argument: $arg"
            usage
            exit 1
            ;;
    esac
done

# Pre-flight checks
print_info "Running pre-flight checks..."
echo ""

check_node
check_npm
check_dependencies

echo ""

# Run quality checks unless skipped
if [ "$SKIP_CHECKS" = false ]; then
    run_lint
    run_type_check
    echo ""
else
    print_warning "Skipping code quality checks"
    echo ""
fi

# Start server based on mode
case $MODE in
    dev)
        start_dev
        ;;
    qa)
        start_qa
        ;;
    prod)
        start_prod
        ;;
esac

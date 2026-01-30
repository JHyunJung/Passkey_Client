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
#   ./stop.sh            # Stop running server
#
# Author: CROSSCERT
# Date: 2026-01-30
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# PID file and log file
PID_FILE="$SCRIPT_DIR/.vite.pid"
LOG_FILE="$SCRIPT_DIR/vite.log"

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
    if npm run lint 2>&1; then
        print_success "Code quality check passed"
    else
        print_error "ESLint found issues. Run 'npm run lint:fix' to auto-fix."
        exit 1
    fi
}

# Run type checking
run_type_check() {
    print_info "Running TypeScript type check..."
    if npm run type-check 2>&1; then
        print_success "Type check passed"
    else
        print_error "TypeScript type check failed"
        exit 1
    fi
}

# Check if server is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            print_warning "Server is already running (PID: $PID)"
            print_info "Stop it first with: kill $PID"
            exit 1
        else
            rm -f "$PID_FILE"
        fi
    fi
}

# Kill process on port
kill_port() {
    local PORT=$1
    print_info "Checking port $PORT..."
    
    # Find PID using the port
    local PID=$(lsof -ti:$PORT 2>/dev/null)
    
    if [ ! -z "$PID" ]; then
        print_warning "Port $PORT is in use by PID: $PID"
        print_info "Killing process on port $PORT..."
        kill -9 $PID 2>/dev/null
        sleep 1
        print_success "Process killed"
    else
        print_success "Port $PORT is available"
    fi
}

# Extract server URL from log
get_server_url() {
    local LOG_FILE=$1
    local TIMEOUT=10
    local COUNT=0
    
    while [ $COUNT -lt $TIMEOUT ]; do
        if [ -f "$LOG_FILE" ]; then
            # Extract Local URL from log
            local URL=$(grep -oP '➜\s+Local:\s+\K(https?://[^\s]+)' "$LOG_FILE" | tail -1)
            if [ ! -z "$URL" ]; then
                echo "$URL"
                return 0
            fi
        fi
        sleep 1
        COUNT=$((COUNT + 1))
    done
    
    echo ""
    return 1
}

# Start development server
start_dev() {
    local PORT=5173
    local MODE="Development"
    
    print_info "Starting ${BLUE}${MODE}${NC} server on port ${GREEN}${PORT}${NC}..."
    echo ""
    
    kill_port $PORT
    echo ""
    
    print_info "Launching server..."
    
    # Clear old log
    > "$LOG_FILE"
    
    # Start in background and redirect output
    npm run dev >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"
    
    # Wait and get actual URL from log
    print_info "Waiting for server to start..."
    SERVER_URL=$(get_server_url "$LOG_FILE")
    
    # Verify it's running
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        echo ""
        print_success "Server started in background (PID: $SERVER_PID)"
        if [ ! -z "$SERVER_URL" ]; then
            print_success "Server is available at: ${GREEN}${SERVER_URL}${NC}"
        else
            print_success "Server is available at: ${GREEN}http://localhost:${PORT}${NC}"
        fi
        print_info "View logs: tail -f $LOG_FILE"
        print_info "Stop server: kill $SERVER_PID"
        echo ""
    else
        print_error "Failed to start server. Check logs: cat $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# Start QA server
start_qa() {
    local PORT=8003
    local MODE="QA"
    
    print_info "Starting ${BLUE}${MODE}${NC} server on port ${GREEN}${PORT}${NC}..."
    echo ""
    
    kill_port $PORT
    echo ""
    
    print_info "Launching server..."
    
    # Clear old log
    > "$LOG_FILE"
    
    # Start in background and redirect output
    npm run dev:qa >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"
    
    # Wait and get actual URL from log
    print_info "Waiting for server to start..."
    SERVER_URL=$(get_server_url "$LOG_FILE")
    
    # Verify it's running
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        echo ""
        print_success "Server started in background (PID: $SERVER_PID)"
        if [ ! -z "$SERVER_URL" ]; then
            print_success "Server is available at: ${GREEN}${SERVER_URL}${NC}"
        else
            print_success "Server is available at: ${GREEN}http://localhost:${PORT}${NC}"
        fi
        print_info "View logs: tail -f $LOG_FILE"
        print_info "Stop server: kill $SERVER_PID"
        echo ""
    else
        print_error "Failed to start server. Check logs: cat $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# Build and preview production
start_prod() {
    local PORT=4173
    local MODE="Production"
    
    print_info "Building production version..."
    npm run build
    print_success "Build completed"
    echo ""
    
    print_info "Starting ${BLUE}${MODE}${NC} preview server on port ${GREEN}${PORT}${NC}..."
    echo ""
    
    kill_port $PORT
    echo ""
    
    print_info "Launching server..."
    
    # Clear old log
    > "$LOG_FILE"
    
    # Start in background and redirect output
    npm run preview >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"
    
    # Wait and get actual URL from log
    print_info "Waiting for server to start..."
    SERVER_URL=$(get_server_url "$LOG_FILE")
    
    # Verify it's running
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        echo ""
        print_success "Server started in background (PID: $SERVER_PID)"
        if [ ! -z "$SERVER_URL" ]; then
            print_success "Server is available at: ${GREEN}${SERVER_URL}${NC}"
        else
            print_success "Server is available at: ${GREEN}http://localhost:${PORT}${NC}"
        fi
        print_info "View logs: tail -f $LOG_FILE"
        print_info "Stop server: kill $SERVER_PID"
        echo ""
    else
        print_error "Failed to start server. Check logs: cat $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
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

# Check if already running
check_running

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
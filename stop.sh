#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.vite.pid"

if [ ! -f "$PID_FILE" ]; then
    echo -e "${RED}✗${NC} No server running"
    exit 1
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    rm -f "$PID_FILE"
    echo -e "${GREEN}✓${NC} Server stopped (PID: $PID)"
else
    echo -e "${RED}✗${NC} Server not running (PID: $PID)"
    rm -f "$PID_FILE"
fi
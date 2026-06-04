#!/bin/bash

# OhMyAgent Operations Script
# Manages development servers for agent-server and web-ui

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# PID files
AGENT_PID_FILE="$PROJECT_ROOT/.pids/agent-server.pid"
WEB_PID_FILE="$PROJECT_ROOT/.pids/web-ui.pid"
LOG_DIR="$PROJECT_ROOT/.logs"
PORT_FILE="$PROJECT_ROOT/.pids/ports.conf"

# Default ports (agent-server and web-ui need different ports)
DEFAULT_AGENT_PORT=4000
DEFAULT_WEB_PORT=3002

# Ports (can be overridden by --port flag, applies to both with +1 offset for web)
AGENT_PORT="${DEFAULT_AGENT_PORT}"
WEB_PORT="${DEFAULT_WEB_PORT}"

# Create necessary directories
mkdir -p "$(dirname "$AGENT_PID_FILE")"
mkdir -p "$LOG_DIR"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Save ports to file for status check
save_ports() {
    cat > "$PORT_FILE" <<EOF
AGENT_PORT=$AGENT_PORT
WEB_PORT=$WEB_PORT
EOF
}

# Load ports from file if exists
load_ports() {
    if [ -f "$PORT_FILE" ]; then
        source "$PORT_FILE"
    fi
}

# Check if a service is running by PID
is_running() {
    local pid_file="$1"
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$pid_file"
            return 1
        fi
    fi
    return 1
}

# Get PID using port
get_pid_on_port() {
    local port="$1"
    lsof -ti :"$port" 2>/dev/null | head -1
}

# Kill process on port
kill_port() {
    local port="$1"
    local pid=$(get_pid_on_port "$port")
    if [ -n "$pid" ]; then
        log_warn "Killing process $pid on port $port..."
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
}

# Check if port is in use
port_in_use() {
    local port="$1"
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Start agent server
start_agent() {
    if is_running "$AGENT_PID_FILE"; then
        log_warn "Agent server already running (PID: $(cat "$AGENT_PID_FILE"))"
        return 0
    fi

    if port_in_use "$AGENT_PORT"; then
        log_warn "Port $AGENT_PORT in use, killing existing process..."
        kill_port "$AGENT_PORT"
    fi

    log_info "Starting agent server on port $AGENT_PORT..."
    cd "$PROJECT_ROOT/apps/agent-server"
    PORT="$AGENT_PORT" nohup pnpm dev > "$LOG_DIR/agent-server.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$AGENT_PID_FILE"

    # Wait for server to start
    sleep 3
    if is_running "$AGENT_PID_FILE"; then
        log_success "Agent server started (PID: $pid, Port: $AGENT_PORT)"
        log_info "Logs: $LOG_DIR/agent-server.log"
        return 0
    else
        log_error "Failed to start agent server. Check logs: $LOG_DIR/agent-server.log"
        return 1
    fi
}

# Start web UI
start_web() {
    if is_running "$WEB_PID_FILE"; then
        log_warn "Web UI already running (PID: $(cat "$WEB_PID_FILE"))"
        return 0
    fi

    if port_in_use "$WEB_PORT"; then
        log_warn "Port $WEB_PORT in use, killing existing process..."
        kill_port "$WEB_PORT"
    fi

    log_info "Starting web UI on port $WEB_PORT..."
    cd "$PROJECT_ROOT/apps/web-ui"
    # Clear Next.js cache to avoid 404 issues
    rm -rf .next
    PORT="$WEB_PORT" nohup pnpm dev > "$LOG_DIR/web-ui.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$WEB_PID_FILE"

    # Wait for server to start
    sleep 3
    if is_running "$WEB_PID_FILE"; then
        log_success "Web UI started (PID: $pid, Port: $WEB_PORT)"
        log_info "Logs: $LOG_DIR/web-ui.log"
        log_info "Access at: http://localhost:$WEB_PORT"
        return 0
    else
        log_error "Failed to start web UI. Check logs: $LOG_DIR/web-ui.log"
        return 1
    fi
}

# Stop agent server
stop_agent() {
    if is_running "$AGENT_PID_FILE"; then
        local pid=$(cat "$AGENT_PID_FILE")
        log_info "Stopping agent server (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        sleep 1
        if is_running "$AGENT_PID_FILE"; then
            log_warn "Agent server did not stop gracefully, forcing..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$AGENT_PID_FILE"
        log_success "Agent server stopped"
    else
        # Also try to kill any process on the port
        if port_in_use "$AGENT_PORT"; then
            log_warn "Agent server not managed by script, killing process on port $AGENT_PORT..."
            kill_port "$AGENT_PORT"
            log_success "Agent server stopped"
        else
            log_warn "Agent server not running"
        fi
    fi
}

# Stop web UI
stop_web() {
    if is_running "$WEB_PID_FILE"; then
        local pid=$(cat "$WEB_PID_FILE")
        log_info "Stopping web UI (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        sleep 1
        if is_running "$WEB_PID_FILE"; then
            log_warn "Web UI did not stop gracefully, forcing..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$WEB_PID_FILE"
        log_success "Web UI stopped"
    else
        # Also try to kill any process on the port
        if port_in_use "$WEB_PORT"; then
            log_warn "Web UI not managed by script, killing process on port $WEB_PORT..."
            kill_port "$WEB_PORT"
            log_success "Web UI stopped"
        else
            log_warn "Web UI not running"
        fi
    fi
}

# Show status
show_status() {
    load_ports
    echo ""
    echo "=== OhMyAgent Services Status ==="
    echo ""

    # Agent server status
    echo -n "Agent Server (:$AGENT_PORT): "
    if is_running "$AGENT_PID_FILE"; then
        local pid=$(cat "$AGENT_PID_FILE")
        echo -e "${GREEN}RUNNING${NC} (PID: $pid)"
    elif port_in_use "$AGENT_PORT"; then
        local pid=$(get_pid_on_port "$AGENT_PORT")
        echo -e "${YELLOW}EXTERNAL${NC} (PID: $pid)"
    else
        echo -e "${RED}STOPPED${NC}"
    fi

    # Web UI status
    echo -n "Web UI (:$WEB_PORT): "
    if is_running "$WEB_PID_FILE"; then
        local pid=$(cat "$WEB_PID_FILE")
        echo -e "${GREEN}RUNNING${NC} (PID: $pid)"
        echo -e "  Access: ${BLUE}http://localhost:$WEB_PORT${NC}"
    elif port_in_use "$WEB_PORT"; then
        local pid=$(get_pid_on_port "$WEB_PORT")
        echo -e "${YELLOW}EXTERNAL${NC} (PID: $pid)"
    else
        echo -e "${RED}STOPPED${NC}"
    fi

    echo ""
}

# Show logs
show_logs() {
    local service="${1:-all}"
    local lines="${2:-50}"

    case "$service" in
        agent)
            if [ -f "$LOG_DIR/agent-server.log" ]; then
                tail -n "$lines" "$LOG_DIR/agent-server.log"
            else
                log_warn "No agent server logs found"
            fi
            ;;
        web)
            if [ -f "$LOG_DIR/web-ui.log" ]; then
                tail -n "$lines" "$LOG_DIR/web-ui.log"
            else
                log_warn "No web UI logs found"
            fi
            ;;
        all)
            echo "=== Agent Server Logs ==="
            if [ -f "$LOG_DIR/agent-server.log" ]; then
                tail -n "$lines" "$LOG_DIR/agent-server.log"
            else
                log_warn "No agent server logs found"
            fi
            echo ""
            echo "=== Web UI Logs ==="
            if [ -f "$LOG_DIR/web-ui.log" ]; then
                tail -n "$lines" "$LOG_DIR/web-ui.log"
            else
                log_warn "No web UI logs found"
            fi
            ;;
        *)
            log_error "Unknown service: $service"
            echo "Usage: $0 logs [agent|web|all] [lines]"
            exit 1
            ;;
    esac
}

# Follow logs
follow_logs() {
    local service="${1:-all}"

    case "$service" in
        agent)
            if [ -f "$LOG_DIR/agent-server.log" ]; then
                tail -f "$LOG_DIR/agent-server.log"
            else
                log_warn "No agent server logs found"
            fi
            ;;
        web)
            if [ -f "$LOG_DIR/web-ui.log" ]; then
                tail -f "$LOG_DIR/web-ui.log"
            else
                log_warn "No web UI logs found"
            fi
            ;;
        all)
            if [ -f "$LOG_DIR/agent-server.log" ] && [ -f "$LOG_DIR/web-ui.log" ]; then
                tail -f "$LOG_DIR/agent-server.log" "$LOG_DIR/web-ui.log"
            else
                log_warn "Missing log files"
            fi
            ;;
        *)
            log_error "Unknown service: $service"
            echo "Usage: $0 logs -f [agent|web|all]"
            exit 1
            ;;
    esac
}

# Parse arguments
COMMAND=""
CUSTOM_PORT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            CUSTOM_PORT="$2"
            AGENT_PORT="$CUSTOM_PORT"
            WEB_PORT=$((CUSTOM_PORT + 1))
            shift 2
            ;;
        start|stop|restart|status|logs)
            COMMAND="$1"
            shift
            ;;
        *)
            if [ -z "$COMMAND" ]; then
                echo "Unknown option: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# If no command specified, show help
if [ -z "$COMMAND" ]; then
    echo "OhMyAgent Operations Script"
    echo ""
    echo "Usage: $0 [OPTIONS] {start|stop|restart|status|logs}"
    echo ""
    echo "Options:"
    echo "  --port PORT     Specify custom port (agent=PORT, web=PORT+1, default: $DEFAULT_AGENT_PORT)"
    echo ""
    echo "Commands:"
    echo "  start          Start all services (agent-server + web-ui)"
    echo "  stop           Stop all services"
    echo "  restart        Restart all services"
    echo "  status         Show service status"
    echo "  logs [service] [lines]    Show logs (agent, web, or all)"
    echo "  logs -f [service]         Follow logs (agent, web, or all)"
    echo ""
    echo "Examples:"
    echo "  $0 start                      # Start all services (agent:4000, web:3002)"
    echo "  $0 --port 8080 start          # Start on custom ports (agent:8080, web:8081)"
    echo "  $0 status                    # Check status"
    echo "  $0 logs agent 100            # Show last 100 lines of agent logs"
    echo "  $0 logs -f web               # Follow web UI logs"
    echo ""
    exit 1
fi

# Save ports for later status checks
save_ports

# Main command handler
case "$COMMAND" in
    start)
        log_info "Starting OhMyAgent services (Agent: $AGENT_PORT, Web: $WEB_PORT)..."
        start_agent
        start_web
        log_success "All services started"
        show_status
        ;;

    stop)
        log_info "Stopping OhMyAgent services..."
        stop_agent
        stop_web
        log_success "All services stopped"
        show_status
        ;;

    restart)
        log_info "Restarting OhMyAgent services (Agent: $AGENT_PORT, Web: $WEB_PORT)..."
        stop_agent
        stop_web
        sleep 1
        start_agent
        start_web
        log_success "All services restarted"
        show_status
        ;;

    status)
        show_status
        ;;

    logs)
        if [ "${1:-}" = "-f" ]; then
            follow_logs "${2:-all}"
        else
            show_logs "${1:-all}" "${2:-50}"
        fi
        ;;
esac

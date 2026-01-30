# ============================================================================
# Multi-stage Dockerfile for FIDO2 Passkey Client
# ============================================================================
# Stage 1: Development dependencies and build
# Stage 2: Production runtime with nginx
# ============================================================================

# ============================================================================
# Stage 1: Builder
# ============================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy application source
COPY . .

# Build application for QA environment
RUN npm run build:qa

# ============================================================================
# Stage 2: Production Runtime with nginx
# ============================================================================
FROM nginx:1.24-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata

# Set timezone to Asia/Seoul (adjust as needed)
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY deploy/docker/nginx.conf /etc/nginx/nginx.conf
COPY deploy/docker/default.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directories
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    /var/cache/nginx \
    /var/log/nginx \
    /etc/nginx/conf.d

# Add healthcheck script
COPY deploy/docker/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Expose port 80
EXPOSE 80

# Switch to non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ============================================================================
# Metadata
# ============================================================================
LABEL maintainer="CROSSCERT"
LABEL description="FIDO2 Passkey Client - QA Environment"
LABEL version="1.0.0"
